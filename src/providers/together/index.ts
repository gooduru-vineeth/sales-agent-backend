import { Together } from 'together-ai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AIProvider } from '../../types/ai-provider';
import { InputAnalysis } from '../../types/analysis';
import { logger } from '../../utils/logger';
import { NodeService } from '../../services/NodeService';
import * as EventRepository from '../../repositories/Event';
import * as CustomerRepository from '../../repositories/Customer';
import config from '../../config/index';
import { Session } from '../../types/customer';
import { EmbeddingService } from '../../services/EmbeddingService';
import { analysisSchema, demoToolSchema } from '../../schemas';
import { analysis, demo, productDetails } from '../../prompts';

let nodeService: NodeService;

interface ChatOptions {
  model?: string;
  temperature?: number;
  responseFormat?: {
    type: string;
    schema?: Record<string, any>;
  };
  maxTokens?: number;
  topP?: number;
  tools?: {
    type: string;
    function: Record<string, any>;
  }[];
}

export class TogetherAIProvider implements AIProvider {
  private together: Together;
  public model: string = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';
  private embeddingService: EmbeddingService;

  constructor(apiKey: string) {
    this.together = new Together({ apiKey });
    this.embeddingService = new EmbeddingService();
    this.embeddingService.initialize(config.pinecone.awsProductsIndexName);
    nodeService = new NodeService();
  }

  // Generic chat completion method
  private async chatCompletion(
    systemPrompt: string,
    userPrompt: string,
    options: ChatOptions = {}
  ) {
    const response = await this.together.chat.completions.create({
      model: options.model || this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options.temperature ?? 0.3,
      ...(options.responseFormat && {
        response_format: options.responseFormat,
      }),
      max_tokens: options.maxTokens ?? 5000,
      top_p: options.topP ?? 0.7,
    });

    if (!response?.choices?.[0]?.message?.content) {
      throw new Error('No response from Together AI service');
    }

    return response.choices[0].message.content;
  }

  // Generic function calling method
  private async functionCall(
    systemPrompt: string,
    userPrompt: string,
    options: ChatOptions = {},
    tools?: {
      type: string;
      function: Record<string, any>;
    }[]
  ) {
    const response = await this.together.chat.completions.create({
      model: options.model || this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options.temperature ?? 0,
      max_tokens: options.maxTokens ?? 5000,
      top_p: options.topP ?? 0.7,
      tools: tools,
    });

    return response?.choices?.[0]?.message?.tool_calls?.[0]?.function;
  }

  async analyzeInput(
    currentMessage: string,
    history: string[],
    context: Record<string, any>,
    nextPossibleNodes: string[]
  ): Promise<InputAnalysis> {
    try {
      const nodes = nextPossibleNodes.map((nodeId) =>
        nodeService.getNode(nodeId)
      );
      const jsonSchema = zodToJsonSchema(analysisSchema, 'analysisSchema');

      const content = await this.chatCompletion(
        analysis.getSystemPrompt(),
        analysis.getUserPrompt(currentMessage, history, context, nodes),
        {
          responseFormat: {
            type: 'json_object',
            schema: jsonSchema as Record<string, string>,
          },
        }
      );

      return JSON.parse(content);
    } catch (error) {
      logger.error('Error analyzing input', { error });
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
      const functionCall = await this.functionCall(
        demo.getSystemPrompt(demoToolSchema),
        demo.getUserPrompt(context, history, input),
        {},
        [
          {
            type: 'function',
            function: demoToolSchema,
          },
        ]
      );

      if (!functionCall) {
        throw new Error('No function call response from Together AI');
      }

      const { functionName, arguments: args } =
        this.parseToolResponse(functionCall);

      if (functionName === 'schedule_demo') {
        await this.handleDemoScheduling(args, session);
        return `Demo scheduled successfully for ${args.name} (${args.email}) on ${args.date}`;
      }

      throw new Error('Failed to schedule demo - invalid function call');
    } catch (error) {
      logger.error('Error scheduling demo', { error });
      throw error;
    }
  }

  async getProductDetails(
    question: string,
    history: string[],
    context: Record<string, any>
  ): Promise<string> {
    try {
      const relevantProductInfo = await this.getRelevantProductInfo(question);

      return (
        (await this.chatCompletion(
          productDetails.getSystemPrompt(),
          productDetails.getUserPrompt(relevantProductInfo, question)
        )) || 'I apologize, but I cannot provide product details at the moment.'
      );
    } catch (error) {
      logger.error('Error getting product details', { error });
      throw error;
    }
  }

  // Helper methods
  private async getRelevantProductInfo(question: string): Promise<string> {
    const embeddings = await this.embeddingService.searchByText(question);
    const processedEmbeddings = embeddings?.matches?.map(
      (embedding: any) => embedding?.metadata
    );

    return processedEmbeddings
      ?.map(
        (metadata: any) =>
          `Product: ${metadata?.productName}
          Category: ${metadata?.category}
          Section: ${metadata?.section}
          Details: ${metadata?.text}`
      )
      .join('\n\n');
  }

  private async handleDemoScheduling(
    args: any,
    session: Session
  ): Promise<void> {
    await Promise.all([
      EventRepository.createEvent({
        sessionId: session.sessionId,
        name: config.eventTypes.scheduleDemo,
        data: args,
        metadata: {
          history: session.conversationHistory,
          currentNodeId: session.currentNodeId,
        },
      }),
      CustomerRepository.updateCustomer(session.sessionId, args),
    ]);
  }

  private parseToolResponse(functionCall: { arguments: string; name: string }) {
    try {
      return {
        functionName: functionCall.name,
        arguments: JSON.parse(functionCall.arguments),
      };
    } catch (error) {
      logger.error('Error parsing function arguments', { error });
      throw error;
    }
  }
}
