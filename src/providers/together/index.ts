import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AIProvider } from '../../types/ai-provider';
import { InputAnalysis } from '../../types/analysis';
import { logger } from '../../utils/logger';
import { NodeService } from '../../services/NodeService';
import Together from 'together-ai';
import { CompletionCreateParamsNonStreaming } from 'together-ai/resources/chat/completions';
import * as EventRepository from '../../repositories/Event';
import config from '../../config/index';
import { Session } from '../../types/customer';
import { EmbeddingService } from '../../services/EmbeddingService';

// Change from instantiating immediately to lazy initialization
let nodeService: NodeService;

export class TogetherAIProvider implements AIProvider {
  private together: Together;
  public model: string = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';
  private embeddingService: EmbeddingService;
  private initialized = false;

  // Schema for input analysis
  private analysisSchema = z.object({
    nextNodeId: z
      .string()
      .describe('The next node id from the possible next nodes list'),
    userInputs: z
      .record(z.string())
      .describe('Any identified user inputs from the user input'),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .describe('Confidence score between 0 and 1'),
    suggestedResponse: z.string().describe('Suggested response to the user'),
  });

  // Schema for demo scheduling
  private demoToolSchema = {
    name: 'schedule_demo',
    description: 'Schedule a demo with the customer',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "Customer's name" },
        email: { type: 'string', description: "Customer's email" },
        productChoice: {
          type: 'string',
          description: 'Product selected by customer',
        },
        date: {
          type: 'string',
          description: 'Demo date (one day after today)',
        },
      },
      required: ['name', 'email'],
    },
  };

  constructor(apiKey: string) {
    this.together = new Together({ apiKey });
    this.embeddingService = new EmbeddingService();
    this.embeddingService.initialize(config.pinecone.awsProductsIndexName);
    this.initialized = true;
    nodeService = new NodeService();
  }

  private createDemoToolPrompt(): string {
    return `
      You have access to the following function:

      Use the function '${this.demoToolSchema.name}' to '${
        this.demoToolSchema.description
      }':
      ${JSON.stringify(this.demoToolSchema)}

      Schedule a demo for tomorrow using the context provided. Format the date as YYYY-MM-DDTHH:MM:SS.

      If you choose to call a function ONLY reply in the following format with no prefix or suffix:
      <function=example_function_name>{"example_name": "example_value"}</function>
    `;
  }

  private parseToolResponse(functionCall: {
    arguments: string;
    name: string;
  }): {
    functionName: string;
    arguments: any;
  } {
    const { name, arguments: argsString } = functionCall;
    try {
      return {
        functionName: name,
        arguments: JSON.parse(argsString),
      };
    } catch (error) {
      logger.error('Error parsing function arguments', { error });
      throw error;
    }
  }

  async analyzeInput(
    currentMessage: string,
    history: string[],
    context: Record<string, any>,
    nextPossibleNodes: string[]
  ): Promise<InputAnalysis> {
    logger.info('Analyzing input with Together AI', {
      currentMessage,
      history,
      context,
      nextPossibleNodes,
    });

    try {
      const jsonSchema = zodToJsonSchema(this.analysisSchema, 'analysisSchema');
      const data: CompletionCreateParamsNonStreaming = {
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a sales assistant. Analyze user input and determine next steps. Only respond in JSON format.',
          },
          {
            role: 'user',
            content: this.createAnalysisPrompt(
              currentMessage,
              history,
              context,
              nextPossibleNodes
            ),
          },
        ],
        response_format: {
          type: 'json_object',
          schema: jsonSchema as Record<string, string>,
        },
        temperature: 0.7,
      };
      logger.info('Sending data to Together AI', { data });
      const response = await this.together.chat.completions.create(data);
      logger.info('Received response from Together AI', { response });
      if (response?.choices?.[0]?.message?.content) {
        return JSON.parse(response.choices[0].message.content);
      }

      throw new Error('No response from Together AI service');
    } catch (error) {
      logger.error('Error analyzing input with Together AI', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async scheduleDemo(
    input: string,
    history: string[],
    context: Record<string, any>,
    session: Session
  ): Promise<string> {
    try {
      // First call to get function parameters
      const response = await this.together.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: this.createDemoToolPrompt(),
          },
          {
            role: 'user',
            content: `Schedule a demo for customer with context: ${JSON.stringify(
              context
            )}`,
          },
        ],
        temperature: 0,
      });

      const functionCall:
        | {
            arguments: string;
            name: string;
          }
        | undefined = response?.choices?.[0]?.message?.tool_calls?.[0].function;
      if (!functionCall) {
        throw new Error('No response from Together AI');
      }

      // Parse the function call
      const { functionName, arguments: args } =
        this.parseToolResponse(functionCall);

      if (functionName === 'schedule_demo') {
        // Here you would actually schedule the demo with the parsed arguments
        // For now, we'll just return a confirmation message
        logger.info('Demo scheduled successfully', { args, functionName });
        await EventRepository.createEvent({
          sessionId: session.sessionId,
          name: config.eventTypes.scheduleDemo,
          data: args,
          metadata: {
            history: session.conversationHistory,
            currentNodeId: session.currentNodeId,
          },
        });
        return `Demo scheduled successfully for ${args.name} (${args.email}) on ${args.date}`;
      }

      return 'Failed to schedule demo - invalid function call';
    } catch (error) {
      logger.error('Error scheduling demo with Together AI', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async getProductDetails(
    question: string,
    history: string[],
    context: Record<string, any>
  ): Promise<string> {
    try {
      const embeddings = await this.embeddingService.searchByText(question);
      const processedEmbeddings = embeddings?.matches?.map(
        (embedding: any) => embedding?.metadata
      );
      logger.info('Embeddings getProductDetails', { processedEmbeddings });

      // Format the retrieved information
      const relevantProductInfo = processedEmbeddings
        ?.map(
          (metadata: any) =>
            `Product: ${metadata?.productName}
            Category: ${metadata?.category}
            Section: ${metadata?.section}
            Details: ${metadata?.text}`
        )
        .join('\n\n');

      const response = await this.together.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              "You are an AWS product expert. Using ONLY the provided AWS product information, answer the customer's question. " +
              "If the information is not in the provided context, acknowledge that you don't have that specific information. " +
              'Keep responses focused and technical.',
          },
          {
            role: 'user',
            content: `
              Retrieved AWS Product Information:
              ${relevantProductInfo}

              Customer Question: ${question}

              Provide a clear and technical response based solely on the retrieved product information above.`,
          },
        ],
        temperature: 0.3,
      });

      return (
        response?.choices?.[0]?.message?.content ||
        'I apologize, but I cannot provide product details at the moment.'
      );
    } catch (error) {
      logger.error('Error getting product details from Together AI', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private createAnalysisPrompt(
    currentMessage: string,
    history: string[],
    context: Record<string, any>,
    nextPossibleNodes: string[]
  ): string {
    const nodes = nextPossibleNodes.map((nodeId) =>
      nodeService.getNode(nodeId)
    );

    return `
        Analyze the following user input and determine the next node. if the required fields are not met, add follow up questions to the user.
        user details: ${JSON.stringify(context)}
        
        User Input: ${currentMessage}

        History: ${history.join('\n')}
        
        Possible next nodes: ${JSON.stringify(nodes)}
    `;
  }
}
