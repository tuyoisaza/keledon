import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

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
  accumulatedKnowledge: any[];
  userIntentions: string[];
  successfulPatterns: string[];
  lastUpdate: string;
  knowledgeScore: number;
}

@Injectable()
export class SessionMemoryService {
  private readonly logger = new Logger(SessionMemoryService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Record a successful knowledge pattern
   */
  async recordKnowledgePattern(
    sessionId: string,
    pattern: KnowledgePattern
  ): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('session_memory')
        .insert({
          id: pattern.id,
          session_id: sessionId,
          query: pattern.query,
          context: pattern.context,
          response: pattern.response,
          success: pattern.success,
          timestamp: pattern.timestamp,
          relevance_score: pattern.relevanceScore,
          feedback: pattern.feedback,
          usage_count: 1,
        })
        .select();

      if (error) {
        this.logger.error(`Failed to record knowledge pattern: ${error.message}`);
        throw error;
      }

      this.logger.log(`Recorded knowledge pattern for session ${sessionId}: ${pattern.query} -> ${pattern.response}`);
    } catch (error) {
      this.logger.error(`Error recording knowledge pattern: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get session context with accumulated knowledge
   */
  async getSessionContext(sessionId: string): Promise<SessionContext> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('session_memory')
        .select(`
          *,
          count(*) OVER (PARTITION BY session_id ORDER BY timestamp DESC)
        `)
        .eq('session_id', sessionId)
        .single();

      if (error) {
        this.logger.error(`Failed to get session context: ${error.message}`);
        throw error;
      }

      // If no data exists, return basic context
      if (!data || Array.isArray(data) === false || (data as any).error) {
        return {
          sessionId,
          accumulatedKnowledge: [],
          userIntentions: [],
          successfulPatterns: [],
          lastUpdate: new Date().toISOString(),
          knowledgeScore: 0
        };
      }

      const accumulatedKnowledge = (data as unknown as any[]).map(item => ({
        query: item.query,
        context: item.context,
        response: item.response,
        relevanceScore: item.relevance_score,
        timestamp: item.timestamp,
        success: item.success
      }));

      const recentQueries = accumulatedKnowledge.slice(0, 10).map(item => item.query);
      const successfulPatterns = accumulatedKnowledge
        .filter(item => item.success && item.relevanceScore && item.relevanceScore > 0.8)
        .map(item => item.context);

      const totalScore = accumulatedKnowledge.reduce((sum, item) => sum + (item.relevanceScore || 0), 0);

      this.logger.log(`Retrieved session context for ${sessionId}: ${accumulatedKnowledge.length} knowledge items`);

      return {
        sessionId,
        accumulatedKnowledge,
        userIntentions: recentQueries,
        successfulPatterns,
        lastUpdate: new Date().toISOString(),
        knowledgeScore: totalScore
      };

    } catch (error) {
      this.logger.error(`Error getting session context: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update session context with new knowledge
   */
  async updateSessionContext(
    sessionId: string,
    newKnowledge: any[]
  ): Promise<void> {
    try {
      // This would be implemented to merge or update existing context
      // For now, just log the update
      this.logger.log(`Updating session context for ${sessionId} with ${newKnowledge.length} new knowledge items`);

      // In a full implementation, this would intelligently merge new knowledge with existing context
      // and potentially update patterns or relevance scores

    } catch (error) {
      this.logger.error(`Error updating session context: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get successful knowledge patterns from session
   */
  async getSuccessfulPatterns(sessionId: string, limit: number = 10): Promise<string[]> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('session_memory')
        .select('context')
        .eq('session_id', sessionId)
        .eq('success', true)
        .order('relevance_score', { ascending: false })
        .limit(limit);

      if (error) {
        this.logger.error(`Failed to get successful patterns: ${error.message}`);
        throw error;
      }

      const patterns = data?.map(item => item.context) || [];
      return patterns;

    } catch (error) {
      this.logger.error(`Error getting successful patterns: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get knowledge gaps and recommendations
   */
  async analyzeKnowledgeGaps(sessionId: string): Promise<{
    gaps: string[];
    recommendations: string[];
    priority: 'high' | 'medium' | 'low';
  }> {
    try {
      const context = await this.getSessionContext(sessionId);
      const accumulatedKnowledge = context.accumulatedKnowledge;
      const recentQueries = context.userIntentions;

      const gaps: string[] = [];
      const recommendations: string[] = [];

      // Analyze knowledge coverage
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

      // Determine priority
      const priority = gaps.length > 2 ? 'high' : gaps.length > 0 ? 'medium' : 'low';

      this.logger.log(`Knowledge gap analysis for session ${sessionId}: ${gaps.length} gaps, ${recommendations.length} recommendations`);

      return { gaps, recommendations, priority };

    } catch (error) {
      this.logger.error(`Error analyzing knowledge gaps: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze common topics from recent queries
   */
  private analyzeCommonTopics(queries: string[]): string[] {
    const topicCounts = new Map<string, number>();

    // Simple keyword extraction
    queries.forEach(query => {
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