import { Pinecone } from '@pinecone-database/pinecone';
import { logger } from '../../utils/logger';

export interface PineconeConfig {
  apiKey: string;
  environment?: string;
  namespace?: string;
}

export class PineconeService {
  private client: Pinecone;
  private index: any = null;
  private readonly namespace: string;

  constructor(private config: PineconeConfig) {
    this.client = new Pinecone({
      apiKey: config.apiKey,
    });
    this.namespace = config.namespace || 'default';
  }

  /**
   * Initialize the Pinecone client and connect to index
   */
  async initialize(indexName: string): Promise<void> {
    this.index = this.client.index(indexName);
    logger.info('Pinecone client initialized');
  }

  /**
   * Upsert vectors into the index
   */
  async upsert(
    vectors: {
      id: string;
      values: number[];
      metadata?: Record<string, any>;
    }[]
  ): Promise<void> {
    if (!this.index) throw new Error('Index not initialized');

    await this.index.namespace(this.namespace).upsert(vectors);
    logger.info('Vectors upserted successfully');
  }

  /**
   * Query the index for similar vectors
   */
  async query(
    vector: number[],
    topK: number = 3,
    includeMetadata: boolean = true
  ) {
    if (!this.index) throw new Error('Index not initialized');

    return await this.index.namespace(this.namespace).query({
      vector,
      topK,
      includeValues: false,
      includeMetadata,
    });
  }

  /**
   * Delete vectors by ID
   */
  async deleteVectors(ids: string[]): Promise<void> {
    if (!this.index) throw new Error('Index not initialized');

    await this.index.namespace(this.namespace).deleteMany(ids);
    logger.info('Vectors deleted successfully');
  }

  /**
   * Fetch vectors by ID
   */
  async fetch(ids: string[]) {
    if (!this.index) throw new Error('Index not initialized');

    return await this.index.namespace(this.namespace).fetch(ids);
  }

  /**
   * Get index statistics
   */
  async describeIndexStats() {
    if (!this.index) throw new Error('Index not initialized');

    return await this.index.describeIndexStats();
  }

  /**
   * Create a new index
   */
  async createIndex(
    indexName: string,
    dimension: number,
    metric: 'cosine' | 'euclidean' | 'dotproduct' = 'cosine'
  ) {
    await this.client.createIndex({
      name: indexName,
      dimension,
      metric,
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1',
        },
      },
    });
    logger.info('Index created successfully');
  }

  /**
   * Delete an index
   */
  async deleteIndex(indexName: string) {
    await this.client.deleteIndex(indexName);
    logger.info('Index deleted successfully');
  }

  /**
   * Generate vector embeddings from text using Pinecone's inference API
   */
  async generateEmbeddings(
    texts: string[],
    model: string = 'multilingual-e5-large',
    type: 'query' | 'passage' = 'passage'
  ): Promise<number[][]> {
    const embeddings = await this.client.inference.embed(model, texts, {
      inputType: type,
      truncate: 'END',
    });

    return embeddings.data.map((e) => e.values ?? []);
  }

  /**
   * Convenience method to generate embeddings and upsert them in one call
   */
  async upsertTexts(
    items: { id: string; text: string; metadata?: Record<string, any> }[],
    model: string = 'multilingual-e5-large'
  ): Promise<void> {
    const texts = items.map((item) => item.text);
    const embeddings = await this.generateEmbeddings(texts, model, 'passage');

    const vectors = items.map((item, index) => ({
      id: item.id,
      values: embeddings[index],
      metadata: {
        ...item.metadata,
        text: item.text,
      },
    }));

    await this.upsert(vectors);
  }
}
