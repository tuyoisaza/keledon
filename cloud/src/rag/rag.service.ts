import { Injectable } from '@nestjs/common';
import { VectorStoreService, RetrievalResult, PolicyDocument } from '../vectorstore/qdrant/vector-store.service';
import { OpenAIService } from '../openai/openai.service';

export interface RAGContextOptions {
  sessionId: string;
  companyId: string;
  brandId?: string;
  teamId?: string;
  categories?: string[];
  maxResults?: number;
  minScore?: number;
}

export interface KnowledgePattern {
  id: string;
  sessionId: string;
  query: string;
  context: string;
  response: string;
  success: boolean;
  timestamp: string;
  relevanceScore?: number;
  feedback?: 'helpful' | 'not_helpful';
  usageCount: number;
}

export interface SessionContext {
  sessionId: string;
  accumulatedKnowledge: RetrievalResult[];
  userIntentions: string[];
  successfulPatterns: string[];
  lastUpdate: string;
  knowledgeScore: number;
}

@Injectable()
export class RAGService {
  constructor(
    private vectorStoreService: VectorStoreService,
    private openAIService: OpenAIService,
  ) {}

  /**
   * Retrieve relevant knowledge based on query and context
   */
  async retrieveRelevantKnowledge(
    query: string,
    options: RAGContextOptions
  ): Promise<RetrievalResult[]> {
    try {
      // Build search filters from context
      const filters: any = {
        company_id: options.companyId,
      };

      if (options.brandId) {
        filters.brand_id = options.brandId;
      }

      if (options.teamId) {
        filters.team_id = options.teamId;
      }

      if (options.categories && options.categories.length > 0) {
        filters.category = { match: { any: options.categories } };
      }

      // Search across both policy documents and general knowledge
      const [policyResults, knowledgeResults] = await Promise.all([
        this.vectorStoreService.searchDocuments(query, {
          limit: options.maxResults || 5,
          scoreThreshold: options.minScore || 0.7,
          category: options.categories,
          company_id: options.companyId,
          brand_id: options.brandId,
          team_id: options.teamId,
        }),
        this.searchGeneralKnowledge(query, options)
      ]);

      // Combine and rank results
      const allResults = [...policyResults, ...knowledgeResults]
        .sort((a, b) => b.score - a.score)
        .slice(0, options.maxResults || 5);

      console.log(`[RAG] Retrieved ${allResults.length} results for query: "${query}"`);
      return allResults;

    } catch (error) {
      console.error(`[RAG] Error retrieving knowledge: ${error.message}`);
      throw error;
    }
  }

  /**
   * Augment system prompt with retrieved context
   */
  async augmentPrompt(
    basePrompt: string,
    retrievedContext: RetrievalResult[]
  ): Promise<string> {
    if (retrievedContext.length === 0) {
      return basePrompt;
    }

    // Format retrieved knowledge for prompt
    const contextText = retrievedContext
      .map((result, index) => {
        const doc = result.document;
        return `[Context ${index + 1}]\n` +
          `Document: ${doc.title}\n` +
          `Category: ${doc.category}\n` +
          `Company: ${doc.company_id}${doc.brand_id ? ` (Brand: ${doc.brand_id})` : ''}\n` +
          `Content: ${doc.content.substring(0, 500)}...\n` +
          `Relevance: ${result.relevance} (${Math.round(result.score * 100)}%)\n`;
      })
      .join('\n');

    const augmentedPrompt = `${basePrompt}

=== RELEVANT KNOWLEDGE ===
${contextText}

=== END KNOWLEDGE ===

Based on the provided knowledge above, please provide the most accurate and helpful response possible. If the knowledge is insufficient, acknowledge this and proceed with your general understanding.`;

    return augmentedPrompt;
  }

  /**
   * Evaluate RAG response quality
   */
  async evaluateRAGResponse(
    originalQuery: string,
    response: string,
    usedContext: RetrievalResult[]
  ): Promise<{
    relevanceScore: number;
    contextualAccuracy: number;
    completeness: number;
  }> {
    try {
      const evaluationPrompt = `
        Evaluate the following RAG (Retrieval-Augmented Generation) response:

        Original Query: "${originalQuery}"
        Response: "${response}"
        Used Context: ${usedContext.length} documents were provided

        Please rate the following on a scale of 1-10:
        1. Relevance: How well does the response address the original query?
        2. Contextual Accuracy: How accurately does it use the provided knowledge?
        3. Completeness: How thoroughly does it answer based on available context?

        Return your evaluation as JSON: {"relevance": X, "contextualAccuracy": Y, "completeness": Z}
      `;

      const evaluation = await this.openAIService.generateCompletion({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: evaluationPrompt }],
        maxTokens: 150,
        temperature: 0.1
      });

      const evaluationResult = JSON.parse(evaluation.content);
      console.log(`[RAG] Evaluated response quality:`, evaluationResult);

      return evaluationResult;

    } catch (error) {
      console.error(`[RAG] Error evaluating response: ${error.message}`);
      // Return default scores
      return {
        relevanceScore: 5,
        contextualAccuracy: 5,
        completeness: 5
      };
    }
  }

  /**
   * Search general knowledge (fallback for policy documents)
   */
  private async searchGeneralKnowledge(
    query: string,
    options: RAGContextOptions
  ): Promise<RetrievalResult[]> {
    // This could search other knowledge bases, APIs, or cached results
    // For now, return empty array to focus on policy documents
    return [];
  }

  /**
   * Get session context for accumulated knowledge
   */
  async getSessionContext(sessionId: string): Promise<SessionContext> {
    // This would retrieve from a database or cache
    // For now, return basic context
    return {
      sessionId,
      accumulatedKnowledge: [],
      userIntentions: [],
      successfulPatterns: [],
      lastUpdate: new Date().toISOString(),
      knowledgeScore: 0
    };
  }

  /**
   * Update session context with new knowledge
   */
  async updateSessionContext(
    sessionId: string,
    newKnowledge: RetrievalResult[]
  ): Promise<void> {
    try {
      const currentContext = await this.getSessionContext(sessionId);
      currentContext.accumulatedKnowledge.push(...newKnowledge);
      currentContext.lastUpdate = new Date().toISOString();
      currentContext.knowledgeScore += newKnowledge.reduce((sum, result) => sum + result.score, 0);

      console.log(`[RAG] Updated session context for ${sessionId} with ${newKnowledge.length} new knowledge items`);
      
      // This would be saved to database/cache
      // await this.sessionContextService.updateContext(sessionId, currentContext);
      
    } catch (error) {
      console.error(`[RAG] Error updating session context: ${error.message}`);
    }
  }

  /**
   * Get intelligent query suggestions based on accumulated context
   */
  async getQuerySuggestions(sessionId: string, partialQuery: string): Promise<string[]> {
    const context = await this.getSessionContext(sessionId);
    
    // Generate suggestions based on successful patterns
    const suggestions = context.successfulPatterns
      .filter(pattern => pattern.toLowerCase().includes(partialQuery.toLowerCase()))
      .slice(0, 5);

    return suggestions;
  }

  /**
   * Generate knowledge gap analysis
   */
  async analyzeKnowledgeGaps(sessionId: string): Promise<{
    gaps: string[];
    recommendations: string[];
    priority: 'high' | 'medium' | 'low';
  }> {
    const context = await this.getSessionContext(sessionId);
    const recentQueries = context.userIntentions.slice(-10);
    const accumulatedKnowledge = context.accumulatedKnowledge;

    // Analyze what knowledge is missing
    const gaps: string[] = [];
    const recommendations: string[] = [];

    if (context.knowledgeScore < 3.0) {
      gaps.push('Low overall knowledge coverage');
      recommendations.push('Add more comprehensive policy documents');
    }

    if (accumulatedKnowledge.length < 10) {
      gaps.push('Limited knowledge base');
      recommendations.push('Expand policy documentation with real-world examples');
    }

    // Analyze recent query patterns
    const commonTopics = this.analyzeCommonTopics(recentQueries);
    if (commonTopics.length > 0) {
      gaps.push(`Missing documentation for: ${commonTopics.join(', ')}`);
      recommendations.push(`Create specific policies for: ${commonTopics.join(', ')}`);
    }

    const priority = gaps.length > 2 ? 'high' : gaps.length > 0 ? 'medium' : 'low';

    console.log(`[RAG] Knowledge gap analysis for session ${sessionId}:`, { gaps, recommendations, priority });

    return { gaps, recommendations, priority };
  }

  /**
   * Analyze common topics from recent queries
   */
  private analyzeCommonTopics(queries: string[]): string[] {
    const topicCounts = new Map<string, number>();
    
    queries.forEach(query => {
      // Simple keyword extraction
      const keywords = query.toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !['the', 'and', 'for', 'with', 'what', 'how'].includes(word));
      
      keywords.forEach(keyword => {
        topicCounts.set(keyword, (topicCounts.get(keyword) || 0) + 1);
      });
    });

    // Return topics that appear more than once
    return Array.from(topicCounts.entries())
      .filter(([_, count]) => count > 1)
      .map(([topic, _]) => topic);
  }
}