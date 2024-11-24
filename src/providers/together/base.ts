import { Together } from 'together-ai';
import { logger } from '../../utils/logger';

export interface ChatOptions {
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

export class BaseTogetherProvider {
  protected together: Together;
  public model: string = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';

  constructor(apiKey: string) {
    this.together = new Together({ apiKey });
  }

  protected async chatCompletion(
    systemPrompt: string,
    userPrompt: string,
    options: ChatOptions = {}
  ) {
    logger.debug('Initiating chat completion', {
      model: options.model || this.model,
      systemPrompt,
      userPrompt,
      temperature: options.temperature ?? 0.3,
    });

    try {
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
        logger.error('Empty response from Together AI service');
        throw new Error('No response from Together AI service');
      }

      logger.debug('Chat completion successful', {
        response: response.choices[0].message.content,
        model: options.model || this.model,
      });

      return response.choices[0].message.content;
    } catch (error) {
      logger.error('Chat completion failed', {
        error,
        model: options.model || this.model,
        temperature: options.temperature ?? 0.3,
      });
      throw error;
    }
  }

  protected async functionCall(
    systemPrompt: string,
    userPrompt: string,
    options: ChatOptions = {},
    tools?: {
      type: string;
      function: Record<string, any>;
    }[]
  ) {
    logger.debug('Initiating function call', {
      model: options.model || this.model,
      systemPrompt,
      userPrompt,
      options,
      tools,
    });

    try {
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

      logger.debug('Function call completed', {
        hasToolCalls: !!response?.choices?.[0]?.message?.tool_calls,
        model: options.model || this.model,
        response,
      });

      return response?.choices?.[0]?.message?.tool_calls?.[0]?.function;
    } catch (error: any) {
      logger.error('Function call failed', {
        error,
        model: options.model || this.model,
        errorResponse: error?.message,
      });
      throw error;
    }
  }

  protected parseToolResponse(functionCall: {
    arguments: string;
    name: string;
  }) {
    logger.debug('Parsing tool response', {
      functionName: functionCall.name,
      arguments: functionCall.arguments,
    });

    try {
      const result = {
        functionName: functionCall.name,
        arguments: JSON.parse(functionCall.arguments),
      };

      logger.debug('Successfully parsed tool response', {
        functionName: result.functionName,
        arguments: result.arguments,
      });

      return result;
    } catch (error) {
      logger.error('Error parsing function arguments', {
        error,
        functionName: functionCall.name,
      });
      throw error;
    }
  }
}
