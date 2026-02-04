import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';

export interface VectorSearchOptions {
  vector: number[];
  limit?: number;
  threshold?: number;
  filter?: Record<string, any>;
}

export interface VectorStoreResult {
  id: string;
  score: number;
  payload?: Record<string, any>;
}

export interface VectorUpsertOptions {
  id: string;
  vector: number[];
  payload?: Record<string, any>;
}

@Injectable()
export class VectorService implements OnModuleInit {
  private readonly logger = new Logger(VectorService.name);
  private client: QdrantClient;
  private qdrantUrl: string;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.qdrantUrl = this.configService.get<string>('QDRANT_URL', 'http://localhost:6333');
    
    this.logger.log(`Initializing Qdrant client at: ${this.qdrantUrl}`);
    
    try {
      this.client = new QdrantClient({ url: this.qdrantUrl });
      
      // Test connectivity
      const collections = await this.client.getCollections();
      this.logger.log(`Qdrant connected successfully: found ${collections.collections.length} collections`);
      
      // Ensure collections exist
      await this.ensureCollections();
      
    } catch (error) {
      this.logger.error(`Failed to connect to Qdrant at ${this.qdrantUrl}: ${error.message}`);
      // In Phase 1, we must fail fast if Qdrant is unavailable
      throw new Error(`Qdrant connection failed: ${error.message}`);
    }
  }

  private async ensureCollections() {
    try {
      const collections = await this.client.getCollections();
      const existingCollectionNames = collections.collections.map(c => c.name);

      // Required collections for KELEDON
      const requiredCollections = [
        'sessions',
        'agents',
        'events',
        'knowledge'
      ];

      for (const collectionName of requiredCollections) {
        if (!existingCollectionNames.includes(collectionName)) {
          this.logger.log(`Creating collection: ${collectionName}`);
          await this.client.createCollection(collectionName, {
            vectors: {
              size: 1536, // Standard OpenAI embedding size
              distance: 'Cosine'
            }
          });
          this.logger.log(`Collection created: ${collectionName}`);
        } else {
          this.logger.log(`Collection already exists: ${collectionName}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to ensure collections: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search for similar vectors in a collection
   */
  async search(collectionName: string, options: VectorSearchOptions): Promise<VectorStoreResult[]> {
    try {
      const result = await this.client.search(collectionName, {
        vector: options.vector,
        limit: options.limit || 10,
        score_threshold: options.threshold,
        filter: options.filter
      });

      return result.map(point => ({
        id: point.id as string,
        score: point.score,
        payload: point.payload
      }));
    } catch (error) {
      this.logger.error(`Search failed in collection ${collectionName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store a vector in a collection
   */
  async upsert(collectionName: string, options: VectorUpsertOptions): Promise<void> {
    try {
      await this.client.upsert(collectionName, {
        points: [{
          id: options.id,
          vector: options.vector,
          payload: options.payload
        }]
      });
      
      this.logger.log(`Vector stored in ${collectionName}: ${options.id}`);
    } catch (error) {
      this.logger.error(`Upsert failed in collection ${collectionName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a vector from a collection
   */
  async delete(collectionName: string, id: string): Promise<void> {
    try {
      await this.client.delete(collectionName, {
        points: [id]
      });
      
      this.logger.log(`Vector deleted from ${collectionName}: ${id}`);
    } catch (error) {
      this.logger.error(`Delete failed in collection ${collectionName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(collectionName: string) {
    try {
      return await this.client.getCollection(collectionName);
    } catch (error) {
      this.logger.error(`Failed to get collection info for ${collectionName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if Qdrant is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get the Qdrant URL
   */
  getQdrantUrl(): string {
    return this.qdrantUrl;
  }
}