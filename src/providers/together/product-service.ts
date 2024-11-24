import { BaseTogetherProvider } from './base';
import { EmbeddingService } from '../../services/EmbeddingService';
import { productDetails } from '../../prompts';
import { logger } from '../../utils/logger';
import config from '../../config/index';

export class ProductService extends BaseTogetherProvider {
  private embeddingService: EmbeddingService;

  constructor(apiKey: string) {
    super(apiKey);
    logger.info('ProductService initialized');
    this.embeddingService = new EmbeddingService();
    this.embeddingService.initialize(config.pinecone.awsProductsIndexName);
  }

  async getProductDetails(
    question: string,
    history: string[],
    context: Record<string, any>
  ): Promise<string> {
    logger.info('Getting product details', {
      question,
      contextKeys: Object.keys(context),
    });
    try {
      const relevantProductInfo = await this.getRelevantProductInfo(question);
      logger.debug('Retrieved relevant product info', {
        question,
        productInfo: relevantProductInfo,
      });

      const response = await this.chatCompletion(
        productDetails.getSystemPrompt(),
        productDetails.getUserPrompt(relevantProductInfo, question)
      );

      if (!response) {
        logger.warn('No response received from chat completion');
        throw new Error('No response received from chat completion');
      }

      logger.info('Successfully generated product details response', {
        response,
      });
      return response;
    } catch (error) {
      logger.error('Error getting product details', {
        error,
        question,
        history,
      });
      throw error;
    }
  }

  private async getRelevantProductInfo(question: string): Promise<string> {
    logger.debug('Searching for relevant product info', { question });
    const embeddings = await this.embeddingService.searchByText(question);

    if (!embeddings?.matches?.length) {
      logger.warn('No matching embeddings found', { question });
      throw new Error('No matching embeddings found');
    }

    logger.debug('Found matching embeddings', {
      matchCount: embeddings.matches.length,
    });

    const processedEmbeddings = embeddings.matches.map(
      (embedding: any) => embedding?.metadata
    );

    const result = processedEmbeddings
      ?.map(
        (metadata: any) =>
          `Product: ${metadata?.productName}
          Category: ${metadata?.category}
          Section: ${metadata?.section}
          Details: ${metadata?.text}`
      )
      .join('\n\n');

    logger.debug('Processed embeddings into product info', {
      resultLength: result.length,
      productCount: processedEmbeddings.length,
    });

    return result;
  }
}
