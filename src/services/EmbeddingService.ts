import { logger } from '../utils/logger';
import { PineconeService, PineconeConfig } from '../providers/pinecone';

export class EmbeddingService {
  private pinecone: PineconeService;
  private model = 'multilingual-e5-large';

  constructor() {
    const config: PineconeConfig = {
      apiKey: process.env.PINECONE_API_KEY!,
      environment: process.env.PINECONE_ENVIRONMENT,
      namespace: 'ai-service',
    };

    this.pinecone = new PineconeService(config);
  }

  async initialize(indexName: string, dimension: number = 1024) {
    // Create index if it doesn't exist
    try {
      await this.pinecone.createIndex(indexName, dimension);
      logger.info('Index created successfully');
    } catch (error) {
      // Index might already exist, continue
      logger.info('Index already exists, continuing...');
    }

    await this.pinecone.initialize(indexName);
  }

  async storeEmbedding(
    id: string,
    embedding: number[],
    metadata?: Record<string, any>
  ) {
    await this.pinecone.upsert([
      {
        id,
        values: embedding,
        metadata,
      },
    ]);
  }

  async findSimilarEmbeddings(embedding: number[], limit: number = 3) {
    return await this.pinecone.query(embedding, limit);
  }

  async deleteEmbeddings(ids: string[]) {
    await this.pinecone.deleteVectors(ids);
    logger.info('Embeddings deleted successfully');
  }

  async getIndexStats() {
    const stats = await this.pinecone.describeIndexStats();
    logger.info('Index stats', { stats });
    return stats;
  }

  /**
   * Generate vector embeddings from text using Pinecone's inference API
   */
  async generateEmbeddings(
    texts: string[],
    model: string = this.model,
    type: 'query' | 'passage' = 'passage'
  ): Promise<number[][]> {
    return await this.pinecone.generateEmbeddings(texts, model, type);
  }

  /**
   * Store text by generating embeddings and upserting them in one call
   */
  async storeTexts(
    items: { id: string; text: string; metadata?: Record<string, any> }[],
    model: string = this.model
  ): Promise<void> {
    await this.pinecone.upsertTexts(items, model);
    logger.info(`Stored ${items.length} text embeddings successfully`);
  }

  /**
   * Search for similar content using a text query
   */
  async searchByText(
    query: string,
    limit: number = 3,
    model: string = this.model
  ) {
    // Convert the query text into an embedding using 'query' type
    const queryEmbedding = await this.generateEmbeddings(
      [query],
      model,
      'query'
    );

    // Search for similar vectors using the embedding
    const results = await this.findSimilarEmbeddings(queryEmbedding[0], limit);

    logger.info(`Found ${results.matches.length} matches for text query`);
    return results;
  }
}
