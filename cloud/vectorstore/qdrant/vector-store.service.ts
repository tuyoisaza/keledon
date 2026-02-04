import { Injectable, OnModuleInit } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAI } from 'openai';

export interface PolicyDocument {
  id: string;
  title: string;
  content: string;
  category: 'safety' | 'procedure' | 'compliance' | 'knowledge';
  embedding?: number[];
  metadata?: Record<string, any>;
  // Organization context fields
  company_id: string;
  brand_id?: string;
  team_id?: string;
  // Audit trail
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RetrievalResult {
  document: PolicyDocument;
  score: number;
  relevance: 'high' | 'medium' | 'low';
}

export interface RetrievalOptions {
  limit?: number;
  scoreThreshold?: number;
  category?: string[];
  company_id?: string;
  brand_id?: string;
  team_id?: string;
}

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private client: QdrantClient;
  private collectionName = 'keledon-policies';
  private openai: OpenAI;

  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async onModuleInit() {
    await this.initialize();
  }

  private async initialize() {
    try {
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === this.collectionName);
      
      if (!exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 1536, // OpenAI embedding dimension
            distance: 'Cosine',
          },
        });
        console.log(`Created collection: ${this.collectionName}`);
      }

      const info = await this.client.getCollection(this.collectionName);
      console.log(`Vector store initialized: ${info.points_count} documents in collection`);
    } catch (error) {
      console.error('Failed to initialize vector store:', error);
      throw error;
    }
  }

  async addDocument(document: PolicyDocument): Promise<void> {
    if (!document.embedding) {
      document.embedding = await this.generateEmbedding(document.content);
    }

    await this.client.upsert(this.collectionName, {
      points: [{
        id: document.id,
        vector: document.embedding,
        payload: {
          title: document.title,
          content: document.content,
          category: document.category,
          metadata: document.metadata,
          company_id: document.company_id,
          brand_id: document.brand_id,
          team_id: document.team_id,
          created_by: document.created_by,
          created_at: document.created_at,
          updated_at: document.updated_at,
        },
      }],
    });
  }

  async search(query: string, options: RetrievalOptions = {}): Promise<RetrievalResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    
    const filterConditions = [];
    
    // Category filter
    if (options.category && options.category.length > 0) {
      filterConditions.push({ key: 'category', match: { any: options.category } });
    }
    
    // Organization filters
    if (options.company_id) {
      filterConditions.push({ key: 'company_id', match: { value: options.company_id } });
    }
    
    if (options.brand_id) {
      filterConditions.push({ key: 'brand_id', match: { value: options.brand_id } });
    }
    
    if (options.team_id) {
      filterConditions.push({ key: 'team_id', match: { value: options.team_id } });
    }
    
    const filter = filterConditions.length > 0 ? {
      must: filterConditions
    } : undefined;
    
    const searchResult = await this.client.search(this.collectionName, {
      vector: queryEmbedding,
      limit: options.limit || 5,
      score_threshold: options.scoreThreshold || 0.5,
      filter: filter,
    });

    return searchResult.map(result => ({
      document: {
        id: result.id as string,
        title: (result.payload?.title as string) || 'Untitled',
        content: (result.payload?.content as string) || '',
        category: (result.payload?.category as 'safety' | 'procedure' | 'compliance' | 'knowledge') || 'knowledge',
        metadata: result.payload?.metadata as Record<string, any> | undefined,
        company_id: (result.payload?.company_id as string) || '',
        brand_id: (result.payload?.brand_id as string) || undefined,
        team_id: (result.payload?.team_id as string) || undefined,
        created_by: (result.payload?.created_by as string) || 'unknown',
        created_at: (result.payload?.created_at as string) || new Date().toISOString(),
        updated_at: (result.payload?.updated_at as string) || new Date().toISOString(),
      },
      score: result.score,
      relevance: this.getRelevanceLevel(result.score),
    }));
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  private getRelevanceLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }
}