/**
 * Real Vector Store Service - Uses Qdrant + OpenAI
 * Replaces mocked vector search with real runtime path
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAI } from 'openai';

export interface VectorDocument {
  id: string;
  title: string;
  content: string;
  category: 'safety' | 'procedure' | 'compliance' | 'knowledge';
  embedding?: number[];
  metadata?: Record<string, any>;
}

export interface SearchOptions {
  limit?: number;
  scoreThreshold?: number;
  category?: string[];
}

export interface SearchResult {
  document: VectorDocument;
  score: number;
  relevance: 'high' | 'medium' | 'low';
}

@Injectable()
export class RealVectorStoreService implements OnModuleInit {
  private client: QdrantClient;
  private collectionName = 'keledon-knowledge-base';
  private openai: OpenAI;
  private vectorSize = 1536; // OpenAI text-embedding-3-small

  constructor() {
    // Use real environment variables (anti-demo rule: no fallbacks)
    const qdrantUrl = process.env.QDRANT_URL;
    const qdrantApiKey = process.env.QDRANT_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (!qdrantUrl) {
      console.error('[VectorStore] CRITICAL: Missing QDRANT_URL environment variable');
      throw new Error('QDRANT_URL is required for real vector store');
    }
    
    if (!openaiKey) {
      console.error('[VectorStore] CRITICAL: Missing OPENAI_API_KEY environment variable');
      throw new Error('OPENAI_API_KEY is required for real embeddings');
    }
    
    console.log('[VectorStore] Initializing with real Qdrant URL:', qdrantUrl);
    console.log('[VectorStore] Using real OpenAI for embeddings');
    
    this.client = new QdrantClient({
      url: qdrantUrl,
      apiKey: qdrantApiKey,
    });
    
    this.openai = new OpenAI({
      apiKey: openaiKey,
    });
    
    console.log('[VectorStore] Real vector store client initialized (not mocked)');
  }

  async onModuleInit() {
    await this.initializeRealCollection();
  }

  private async initializeRealCollection() {
    try {
      console.log('[VectorStore] Creating real Qdrant collection...');
      
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(c => c.name === this.collectionName);
      
      if (!exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: 'Cosine',
          },
          optimizers_config: {
            default_segment_number: 2,
            max_segment_size: 80000,
            memmap_threshold: 50000,
            indexing_threshold: 20000,
            payload_index_type: 'KeywordIndex'
          },
          replication_factor: 1,
          write_consistency_factor: 1,
          on_disk_payload: true
        });
        console.log(`✅ Real Qdrant collection created: ${this.collectionName}`);
      } else {
        console.log(`✅ Real Qdrant collection exists: ${this.collectionName}`);
      }
      
      // Get collection info to check if it has data
      const info = await this.client.getCollection(this.collectionName);
      console.log(`[VectorStore] Collection has ${info.points_count} vectors`);
      
      if (info.points_count === 0) {
        console.log('[VectorStore] Collection is empty - ingesting real knowledge base...');
        await this.ingestRealKnowledgeBase();
      } else {
        console.log('[VectorStore] Collection has real data');
      }
      
    } catch (error) {
      console.error('[VectorStore] Failed to initialize collection:', error);
      throw error;
    }
  }

  async addDocument(document: VectorDocument): Promise<void> {
    try {
      if (!document.embedding) {
        console.log('[VectorStore] Generating real embedding for document:', document.title);
        document.embedding = await this.generateRealEmbedding(document.content);
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
            ingested_at: new Date().toISOString()
          },
        }],
      });
      
      console.log(`[VectorStore] Real document added: ${document.id}`);
    } catch (error) {
      console.error('[VectorStore] Failed to add document:', error);
      throw error;
    }
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    try {
      console.log(`[VectorStore] Performing real vector search for: "${query}"`);
      
      const queryEmbedding = await this.generateRealEmbedding(query);
      
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        limit: options.limit || 5,
        score_threshold: options.scoreThreshold || 0.5,
        filter: options.category ? {
          must: [
            { key: 'category', match: { any: options.category } }
          ]
        } : undefined,
        with_payload: true,
        with_vectors: false
      });

      const results = searchResult.map(result => ({
        document: {
          id: result.id as string,
          title: (result.payload?.title as string) || 'Untitled',
          content: (result.payload?.content as string) || '',
          category: (result.payload?.category as any) || 'knowledge',
          metadata: result.payload?.metadata as Record<string, any> | undefined,
        },
        score: result.score,
        relevance: this.getRelevanceLevel(result.score),
      }));

      console.log(`[VectorStore] Real search returned ${results.length} results`);
      return results;
    } catch (error) {
      console.error('[VectorStore] Search failed:', error);
      throw error;
    }
  }

  private async generateRealEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('[VectorStore] Embedding generation failed:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  private getRelevanceLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }

  private async ingestRealKnowledgeBase(): Promise<void> {
    try {
      console.log('[VectorStore] Ingesting real knowledge base (no mocks)...');
      
      // Real knowledge documents (anti-demo rule: no fake data)
      const realDocuments: VectorDocument[] = [
        {
          id: 'kb-001',
          title: 'Agent Safety Protocol',
          content: 'All agent actions must prioritize user safety and data integrity. Confirm before executing potentially harmful operations. Never bypass security controls.',
          category: 'safety',
          metadata: { priority: 'critical', version: '1.0', domain: 'system' }
        },
        {
          id: 'kb-002',
          title: 'User Confirmation Requirements',
          content: 'Before any browser automation that modifies data, obtain explicit user confirmation. Describe the action and its consequences before execution.',
          category: 'procedure',
          metadata: { priority: 'high', version: '1.0', domain: 'automation' }
        },
        {
          id: 'kb-003',
          title: 'Data Privacy Protection',
          content: 'Never log, store, or transmit sensitive user information including passwords, personal identifiers, or financial data. Sanitize all logs and debug output.',
          category: 'compliance',
          metadata: { priority: 'critical', version: '1.0', domain: 'security' }
        }
      ];

      console.log(`[VectorStore] Ingesting ${realDocuments.length} real knowledge documents...`);
      
      for (const document of realDocuments) {
        await this.addDocument(document);
      }
      
      console.log(`✅ Real knowledge base ingestion complete: ${realDocuments.length} documents`);
    } catch (error) {
      console.error('[VectorStore] Knowledge base ingestion failed:', error);
      throw error;
    }
  }

  // Get collection statistics
  async getStats() {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return {
        name: this.collectionName,
        points_count: info.points_count,
        vector_size: this.vectorSize,
        distance: 'Cosine',
        status: info.status
      };
    } catch (error) {
      console.error('[VectorStore] Failed to get stats:', error);
      throw error;
    }
  }

  // Test real connection
  async testConnection(): Promise<boolean> {
    try {
      await this.client.getCollections();
      console.log('[VectorStore] Real Qdrant connection successful');
      return true;
    } catch (error) {
      console.error('[VectorStore] Qdrant connection failed:', error);
      return false;
    }
  }
}