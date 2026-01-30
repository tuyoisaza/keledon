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

      // Seed with mock policies if empty
      const info = await this.client.getCollection(this.collectionName);
      if (info.points_count === 0) {
        await this.seedMockPolicies();
      }
    } catch (error) {
      console.error('Failed to initialize vector store:', error);
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
        },
      }],
    });
  }

  async search(query: string, options: RetrievalOptions = {}): Promise<RetrievalResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    
    const searchResult = await this.client.search(this.collectionName, {
      vector: queryEmbedding,
      limit: options.limit || 5,
      score_threshold: options.scoreThreshold || 0.5,
      filter: options.category ? {
        must: [
          { key: 'category', match: { any: options.category } }
        ]
      } : undefined,
    });

    return searchResult.map(result => ({
      document: {
        id: result.id as string,
        title: (result.payload?.title as string) || 'Untitled',
        content: (result.payload?.content as string) || '',
        category: (result.payload?.category as 'safety' | 'procedure' | 'compliance' | 'knowledge') || 'knowledge',
        metadata: result.payload?.metadata as Record<string, any> | undefined,
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

  private async seedMockPolicies(): Promise<void> {
    const mockPolicies: PolicyDocument[] = [
      {
        id: 'safety-001',
        title: 'User Safety First',
        content: 'Always prioritize user safety. If uncertain about an action, ask for clarification rather than making assumptions. Never execute actions that could harm user data or system integrity.',
        category: 'safety',
        metadata: { priority: 'high', version: '1.0' }
      },
      {
        id: 'procedure-001', 
        title: 'Confirmation Before Actions',
        content: 'Before executing any browser automation actions that modify data (form submissions, deletions, etc.), always confirm with the user by describing what will happen.',
        category: 'procedure',
        metadata: { priority: 'medium', version: '1.0' }
      },
      {
        id: 'compliance-001',
        title: 'Privacy Protection',
        content: 'Never store, transmit, or log sensitive user information such as passwords, credit card numbers, or personal identifiers. Always sanitize logs to remove private data.',
        category: 'compliance', 
        metadata: { priority: 'high', version: '1.0' }
      },
      {
        id: 'knowledge-001',
        title: 'CRM System Navigation',
        content: 'When users need to navigate CRM systems like Salesforce or Genesys, look for common navigation patterns: main menu items, search bars, and tab-based interfaces. Use stable selectors when possible.',
        category: 'knowledge',
        metadata: { domain: ['salesforce', 'genesys'], version: '1.0' }
      },
      {
        id: 'knowledge-002',
        title: 'Form Automation Best Practices',
        content: 'When automating form filling: 1) Wait for fields to be visible and enabled 2) Use clear selectors 3) Validate data before submission 4) Handle potential errors gracefully',
        category: 'knowledge',
        metadata: { domain: ['automation'], version: '1.0' }
      }
    ];

    console.log('Seeding mock policies...');
    for (const policy of mockPolicies) {
      await this.addDocument(policy);
    }
    console.log(`Seeded ${mockPolicies.length} mock policies`);
  }
}