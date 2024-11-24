import { zodToJsonSchema } from 'zod-to-json-schema';
import { AIProvider } from '../../types/ai-provider';
import { InputAnalysis } from '../../types/analysis';
import { logger } from '../../utils/logger';
import { NodeService } from '../../services/NodeService';
import { Session } from '../../types/customer';
import { analysisSchema } from '../../schemas';
import { analysis } from '../../prompts';
import { BaseTogetherProvider } from './base';
import { DemoService } from './demo-service';
import { ProductService } from './product-service';

let nodeService: NodeService;

export class TogetherAIProvider
  extends BaseTogetherProvider
  implements AIProvider
{
  private demoService: DemoService;
  private productService: ProductService;

  constructor(apiKey: string) {
    super(apiKey);
    this.demoService = new DemoService(apiKey);
    this.productService = new ProductService(apiKey);
    nodeService = new NodeService();
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
      logger.info('Analysis completed', { content });
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
    return this.demoService.scheduleDemo(input, history, context, session);
  }

  async getProductDetails(
    question: string,
    history: string[],
    context: Record<string, any>
  ): Promise<string> {
    return this.productService.getProductDetails(question, history, context);
  }
}
