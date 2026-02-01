import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { QdrantClient, QdrantClient as QdrantJSClient } from '@qdrant/qdrant-js';
import OpenAI from 'openai';
import { 
  VectorContext, 
  VectorMemory, 
  KnowledgeRetrieval, 
  EmbeddingResult,
  SearchHistoryEntry 
} from '../types/enhanced-orchestration.types';

/**
 * 🧠 RAG (Retrieval-Augmented Generation) Service
 * Integrates with vector database for intelligent knowledge retrieval
 */
@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);
  private qdrantClient: QdrantClient;
  private openai: OpenAI;
  private collectionName = 'knowledge_base';

  constructor(private readonly configService: ConfigService) {
    this.initializeRAG();
  }

  private async initializeRAG(): Promise<void> {
    try {
      this.logger.log('[RAG Service] Initializing RAG system...');
      
      // Initialize OpenAI for embeddings
      this.openai = new OpenAI({
        apiKey: this.configService.get('OPENAI_API_KEY'),
        organization: this.configService.get('OPENAI_ORGANIZATION')
      });

      // Initialize Qdrant client
      const qdrantUrl = this.configService.get('QDRANT_URL') || 'http://localhost:6333';
      const qdrantApiKey = this.configService.get('QDRANT_API_KEY');
      
      this.qdrantClient = new QdrantJSClient({
        url: qdrantUrl,
        apiKey: qdrantApiKey
      });

      // Connect and ensure collection exists
      await this.qdrantClient.api('collections').exists(this.collectionName);
      const exists = await this.qdrantClient.collectionExists(this.collectionName);
      
      if (!exists) {
        await this.qdrantClient.createCollection(this.collectionName, {
          vectors: {
            size: 1536, // OpenAI embedding dimension
            distance: 'Cosine'
          }
        });
        this.logger.log(`[RAG Service] Created collection: ${this.collectionName}`);
      }

      this.logger.log('[RAG Service] RAG system initialized successfully');
    } catch (error) {
      this.logger.error('[RAG Service] Failed to initialize RAG system:', error);
      throw error;
    }
  }

  /**
   * 🔍 Search for knowledge using semantic similarity
   */
  async searchKnowledge(query: string, options: {
    sessionId: string;
    maxResults?: number;
    minScore?: number;
    filters?: Record<string, any>;
  }): Promise<KnowledgeRetrieval[]> {
    try {
      this.logger.log(`[RAG Service] Searching knowledge for query: "${query}"`);
      
      // Generate embedding for query
      const embedding = await this.generateEmbedding(query);
      
      // Search in Qdrant
      const searchResult = await this.qdrantClient.search(this.collectionName, {
        vector: embedding.embedding,
        limit: options.maxResults || 5,
        score_threshold: options.minScore || 0.7,
        filter: this.buildQdrantFilter(options.filters),
        with_payload: true,
        with_vector: false
      });

      // Transform to KnowledgeRetrieval format
      const retrievals: KnowledgeRetrieval[] = searchResult.map((result, index) => ({
        id: result.id || `retrieval_${Date.now()}_${index}`,
        content: result.payload?.content || '',
        source: result.payload?.source || 'knowledge_base',
        score: result.score || 0,
        metadata: result.payload?.metadata || {},
        timestamp: new Date(result.payload?.timestamp || Date.now())
      }));

      // Store search history
      await this.storeSearchHistory(options.sessionId, query, retrievals);

      this.logger.log(`[RAG Service] Found ${retrievals.length} knowledge items`);
      return retrievals;
    } catch (error) {
      this.logger.error('[RAG Service] Knowledge search failed:', error);
      throw error;
    }
  }

  /**
   * 📚 Add new knowledge to vector database
   */
  async addKnowledge(content: string, metadata: {
    source: string;
    category?: string;
    tags?: string[];
    userId?: string;
    companyId?: string;
  }): Promise<string> {
    try {
      this.logger.log(`[RAG Service] Adding knowledge from source: ${metadata.source}`);
      
      // Generate embedding
      const embedding = await this.generateEmbedding(content);
      
      // Create vector memory object
      const vectorMemory: VectorMemory = {
        id: `kv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId: metadata.userId || 'system',
        content,
        embedding: embedding.embedding,
        metadata: {
          ...metadata,
          timestamp: new Date(),
          relevance: 1.0
        }
      };

      // Store in Qdrant
      await this.qdrantClient.upsert(this.collectionName, {
        wait: true,
        points: [{
          id: vectorMemory.id,
          vector: embedding.embedding,
          payload: vectorMemory
        }]
      });

      this.logger.log(`[RAG Service] Knowledge added with ID: ${vectorMemory.id}`);
      return vectorMemory.id;
    } catch (error) {
      this.logger.error('[RAG Service] Failed to add knowledge:', error);
      throw error;
    }
  }

  /**
   * 🗑️ Remove knowledge from vector database
   */
  async removeKnowledge(id: string): Promise<boolean> {
    try {
      await this.qdrantClient.delete(this.collectionName, {
        wait: true,
        points: [id]
      });
      
      this.logger.log(`[RAG Service] Knowledge removed: ${id}`);
      return true;
    } catch (error) {
      this.logger.error('[RAG Service] Failed to remove knowledge:', error);
      return false;
    }
  }

  /**
   * 📊 Update knowledge relevance and metadata
   */
  async updateKnowledge(id: string, updates: {
    content?: string;
    metadata?: Record<string, any>;
    relevance?: number;
  }): Promise<boolean> {
    try {
      let embedding = updates.content ? await this.generateEmbedding(updates.content) : null;
      
      await this.qdrantClient.upsert(this.collectionName, {
        wait: true,
        points: [{
          id,
          vector: embedding?.embedding,
          payload: updates
        }]
      });
      
      this.logger.log(`[RAG Service] Knowledge updated: ${id}`);
      return true;
    } catch (error) {
      this.logger.error('[RAG Service] Failed to update knowledge:', error);
      return false;
    }
  }

  /**
   * 🧠 Generate contextual response using retrieved knowledge
   */
  async generateResponse(query: string, context: {
    retrievals: KnowledgeRetrieval[];
    sessionId: string;
    conversationHistory?: any[];
    userPreferences?: any;
  }): Promise<{
    response: string;
    sources: string[];
    confidence: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`[RAG Service] Generating response with ${context.retrievals.length} context items`);
      
      // Build context from retrieved knowledge
      const knowledgeContext = context.retrievals
        .map(r => `Source: ${r.source}\n${r.content}`)
        .join('\n\n');

      // Create prompt with context
      const prompt = this.buildContextualPrompt(query, knowledgeContext, context);
      
      // Generate response using OpenAI
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an intelligent assistant with access to a knowledge base. Use the provided context to answer questions accurately and helpfully.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const response = completion.choices[0]?.message?.content || '';
      const sources = context.retrievals.map(r => r.source);
      const confidence = this.calculateResponseConfidence(response, context.retrievals);
      
      const processingTime = Date.now() - startTime;
      
      this.logger.log(`[RAG Service] Response generated in ${processingTime}ms`);
      
      return {
        response,
        sources: [...new Set(sources)], // Remove duplicates
        confidence,
        processingTime
      };
    } catch (error) {
      this.logger.error('[RAG Service] Response generation failed:', error);
      throw error;
    }
  }

  /**
   * 📈 Get contextual knowledge for conversation
   */
  async getContextualKnowledge(sessionId: string, options: {
    categories?: string[];
    timeRange?: { start: Date; end: Date };
    limit?: number;
  }): Promise<VectorContext> {
    try {
      this.logger.log(`[RAG Service] Getting contextual knowledge for session: ${sessionId}`);
      
      // Build filter for contextual search
      const filter: any = {};
      if (options.categories) {
        filter.category = { any: options.categories };
      }
      if (options.timeRange) {
        filter.timestamp = {
          gte: options.timeRange.start.getTime(),
          lte: options.timeRange.end.getTime()
        };
      }

      // Search with empty vector to get recent/contextual items
      const searchResult = await this.qdrantClient.scroll(this.collectionName, {
        limit: options.limit || 10,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        with_payload: true,
        with_vector: false
      });

      const vectors: VectorMemory[] = searchResult.points.map(point => point.payload as VectorMemory);
      
      return {
        vectors,
        searchResults: [],
        embeddings: [],
        searchHistory: await this.getSearchHistory(sessionId)
      };
    } catch (error) {
      this.logger.error('[RAG Service] Contextual knowledge retrieval failed:', error);
      throw error;
    }
  }

  /**
   * 🔍 Advanced semantic search with multiple strategies
   */
  async advancedSearch(query: string, options: {
    strategies: ('semantic' | 'keyword' | 'hybrid')[];
    weights?: { semantic: number; keyword: number };
    sessionId: string;
  }): Promise<KnowledgeRetrieval[]> {
    try {
      const results: KnowledgeRetrieval[] = [];
      
      for (const strategy of options.strategies) {
        let strategyResults: KnowledgeRetrieval[] = [];
        
        switch (strategy) {
          case 'semantic':
            strategyResults = await this.searchKnowledge(query, {
              sessionId: options.sessionId,
              maxResults: 10
            });
            break;
            
          case 'keyword':
            strategyResults = await this.keywordSearch(query, options.sessionId);
            break;
            
          case 'hybrid':
            const semanticResults = await this.searchKnowledge(query, {
              sessionId: options.sessionId,
              maxResults: 5
            });
            const keywordResults = await this.keywordSearch(query, options.sessionId);
            strategyResults = this.combineResults(semanticResults, keywordResults, options.weights);
            break;
        }
        
        results.push(...strategyResults);
      }
      
      // Remove duplicates and sort by score
      const uniqueResults = this.deduplicateResults(results);
      return uniqueResults.sort((a, b) => b.score - a.score).slice(0, 10);
    } catch (error) {
      this.logger.error('[RAG Service] Advanced search failed:', error);
      throw error;
    }
  }

  /**
   * 🔧 Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const startTime = Date.now();
    
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
      encoding_format: 'float'
    });

    const embedding = response.data[0].embedding;
    const processingTime = Date.now() - startTime;
    
    return {
      text,
      embedding,
      model: 'text-embedding-ada-002',
      dimensions: embedding.length,
      processingTime
    };
  }

  /**
   * 🔨 Build Qdrant filter from filter object
   */
  private buildQdrantFilter(filters?: Record<string, any>): any {
    if (!filters || Object.keys(filters).length === 0) {
      return undefined;
    }

    const qdrantFilter: any = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      if (typeof value === 'string') {
        qdrantFilter[key] = { match: value };
      } else if (Array.isArray(value)) {
        qdrantFilter[key] = { any: value };
      } else if (typeof value === 'object' && value !== null) {
        qdrantFilter[key] = value;
      }
    });

    return qdrantFilter;
  }

  /**
   * 📝 Build contextual prompt for response generation
   */
  private buildContextualPrompt(query: string, knowledgeContext: string, context: any): string {
    return `
Context Information:
${knowledgeContext}

Recent Conversation History:
${context.conversationHistory?.slice(-3).map((turn: any) => 
  `User: ${turn.userInput}\nAssistant: ${turn.systemResponse}`
).join('\n\n') || 'No recent conversation history'}

User Preferences:
${JSON.stringify(context.userPreferences || {}, null, 2)}

Current Question: ${query}

Please provide a helpful and accurate response based on the context above. 
If the context doesn't contain relevant information, say so clearly.
Cite your sources when using information from the context.
    `.trim();
  }

  /**
   * 📊 Calculate response confidence
   */
  private calculateResponseConfidence(response: string, retrievals: KnowledgeRetrieval[]): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on retrieval quality
    const avgRetrievalScore = retrievals.reduce((sum, r) => sum + r.score, 0) / retrievals.length;
    confidence += avgRetrievalScore * 0.3;
    
    // Increase confidence based on response length and structure
    if (response.length > 100) confidence += 0.1;
    if (response.includes('Source:') || response.includes('According to:')) confidence += 0.1;
    
    return Math.max(0.1, Math.min(0.99, confidence));
  }

  /**
   * 📚 Store search history
   */
  private async storeSearchHistory(sessionId: string, query: string, results: KnowledgeRetrieval[]): Promise<void> {
    // In a real implementation, this would be stored in Redis or database
    const historyEntry: SearchHistoryEntry = {
      query,
      timestamp: new Date(),
      resultCount: results.length,
      averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length
    };
    this.logger.debug(`[RAG Service] Storing search history for session ${sessionId}:`, historyEntry);
  }

  /**
   * 📚 Get search history
   */
  private async getSearchHistory(sessionId: string): Promise<SearchHistoryEntry[]> {
    // In a real implementation, this would retrieve from Redis or database
    return [];
  }

  /**
   * 🔍 Keyword-based search
   */
  private async keywordSearch(query: string, sessionId: string): Promise<KnowledgeRetrieval[]> {
    // Simplified keyword search - in production would use full-text search
    const keywords = query.toLowerCase().split(' ').filter(w => w.length > 2);
    
    // This would be implemented with proper full-text search
    return [];
  }

  /**
   * 🔀 Combine results from multiple search strategies
   */
  private combineResults(semanticResults: KnowledgeRetrieval[], keywordResults: KnowledgeRetrieval[], weights?: { semantic: number; keyword: number }): KnowledgeRetrieval[] {
    const semanticWeight = weights?.semantic || 0.7;
    const keywordWeight = weights?.keyword || 0.3;
    
    const combinedMap = new Map<string, KnowledgeRetrieval>();
    
    // Add semantic results
    semanticResults.forEach(result => {
      const existing = combinedMap.get(result.id);
      if (!existing) {
        combinedMap.set(result.id, { ...result, score: result.score * semanticWeight });
      }
    });
    
    // Add keyword results and combine scores
    keywordResults.forEach(result => {
      const existing = combinedMap.get(result.id);
      if (existing) {
        existing.score = Math.max(existing.score, result.score * keywordWeight);
      } else {
        combinedMap.set(result.id, { ...result, score: result.score * keywordWeight });
      }
    });
    
    return Array.from(combinedMap.values());
  }

  /**
   * 🔄 Remove duplicate results
   */
  private deduplicateResults(results: KnowledgeRetrieval[]): KnowledgeRetrieval[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.source}_${result.content.substring(0, 50)}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * 📊 Get RAG service statistics
   */
  async getStatistics(): Promise<{
    totalVectors: number;
    collectionInfo: any;
    searchCount: number;
    averageSearchTime: number;
  }> {
    try {
      const collectionInfo = await this.qdrantClient.getCollection(this.collectionName);
      
      return {
        totalVectors: collectionInfo.points_count || 0,
        collectionInfo,
        searchCount: 0, // Would be tracked in real implementation
        averageSearchTime: 0 // Would be tracked in real implementation
      };
    } catch (error) {
      this.logger.error('[RAG Service] Failed to get statistics:', error);
      throw error;
    }
  }

  /**
   * 🔧 Test RAG service connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.qdrantClient.api('collections').exists(this.collectionName);
      const embedding = await this.generateEmbedding('test query');
      return embedding.embedding.length > 0;
    } catch (error) {
      this.logger.error('[RAG Service] Connection test failed:', error);
      return false;
    }
  }
}