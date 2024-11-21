 import Together from 'together-ai';
import { InputAnalysis } from '../types/analysis';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

export class AIService {
  private together: Together;
  private model: string = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';

  constructor() {
    this.together = new Together(process.env.TOGETHER_API_KEY);
  }

  // Schema for input analysis
  private analysisSchema = z.object({
    nextNodeId: z.string().describe('The next node id from the possible next nodes list'),
    userInputs: z.record(z.any()).describe('Any identified user inputs from the user input'),
    confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
    suggestedResponse: z.string().describe('Suggested response to the user')
  });

  async analyzeInput(
    currentMessage: string,
    history: string[],
    context: Record<string, any>,
    nextPossibleNodes: string[]
  ): Promise<InputAnalysis> {
    try {
      const jsonSchema = zodToJsonSchema(this.analysisSchema, 'analysisSchema');
      
      const response = await this.together.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a sales assistant. Analyze user input and determine next steps. Only respond in JSON format.'
          },
          {
            role: 'user',
            content: this.createAnalysisPrompt(currentMessage, history, context, nextPossibleNodes)
          }
        ],
        response_format: { 
          type: 'json_object', 
          schema: jsonSchema 
        },
        temperature: 0.7
      });

      if (response?.choices?.[0]?.message?.content) {
        return JSON.parse(response.choices[0].message.content);
      }

      throw new Error('No response from AI service');

    } catch (error) {
      console.error('Error in AI service:', error);
      // Fallback response
      return {
        nextNodeId: nextPossibleNodes[0],
        userInputs: this.extractBasicUserInputs(currentMessage),
        confidence: 0.5,
        suggestedResponse: 'I apologize, but I encountered an issue. How can I help you?'
      };
    }
  }

  private createAnalysisPrompt(
    currentMessage: string,
    history: string[],
    context: Record<string, any>,
    nextPossibleNodes: string[]
  ): string {
    return `
      Analyze the following conversation:
      
      Context: ${JSON.stringify(context)}
      History: ${history.join('\n')}
      Current Message: ${currentMessage}
      
      Possible next nodes: ${nextPossibleNodes.join(', ')}
      
      Determine:
      1. Which node should come next
      2. Extract any user inputs (name, email, product choice)
      3. Generate an appropriate response
      
      Respond in JSON format with nextNodeId, userInputs, confidence, and suggestedResponse.
    `;
  }

  private extractBasicUserInputs(message: string): Record<string, any> {
    const inputs: Record<string, any> = {};
    
    // Basic email detection
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const emailMatch = message.match(emailRegex);
    if (emailMatch) {
      inputs.email = emailMatch[0];
    }
    
    // If not an email and not empty, treat as name
    else if (message.trim().length > 0 && !emailMatch) {
      inputs.name = message.trim();
    }

    return inputs;
  }

  // Function for product-related queries using RAG
  async getProductDetails(question: string, history: string[], context: Record<string, any>): Promise<string> {
    try {
      const response = await this.together.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a product expert. Provide detailed information about products based on the context.'
          },
          {
            role: 'user',
            content: `
              Context: ${JSON.stringify(context)}
              History: ${history.join('\n')}
              Question: ${question}
              
              Provide a detailed but concise response about the product.
            `
          }
        ],
        temperature: 0.7
      });

      return response?.choices?.[0]?.message?.content || 'I apologize, but I cannot provide product details at the moment.';

    } catch (error) {
      console.error('Error getting product details:', error);
      return 'I apologize, but I encountered an issue retrieving product details.';
    }
  }
} 