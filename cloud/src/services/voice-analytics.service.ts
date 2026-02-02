import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';

export interface ConversationMetrics {
  id: string;
  sessionId: string;
  timestamp: Date;
  duration: number; // seconds
  sentiment: 'positive' | 'neutral' | 'negative';
  sentimentScore: number; // -1 to 1
  transcript: TranscriptSegment[];
  speakerStats: SpeakerStats;
  qualityMetrics: QualityMetrics;
  keywords: KeywordAnalysis[];
}

export interface TranscriptSegment {
  id: string;
  speaker: 'agent' | 'customer';
  text: string;
  timestamp: Date;
  duration: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  confidence: number;
}

export interface SpeakerStats {
  totalSpeakTime: number; // percentage
  avgSpeakingRate: number; // words per minute
  interruptions: number;
  longestPause: number; // seconds
  fillerWords: number;
}

export interface QualityMetrics {
  clarity: number; // 0-100
  completeness: number; // 0-100
  relevance: number; // 0-100
  satisfaction: number; // 0-100
}

export interface KeywordAnalysis {
  word: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  sentiment: 'positive' | 'neutral' | 'negative';
  category: string;
}

export interface VoiceAnalyticsData {
  totalConversations: number;
  avgDuration: number;
  successRate: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topKeywords: KeywordAnalysis[];
  speakerStats: {
    customer: SpeakerStats;
    agent: SpeakerStats;
  };
  qualityMetrics: QualityMetrics;
  recentConversations: ConversationMetrics[];
}

@Injectable()
export class VoiceAnalyticsService {
  private conversations = new Map<string, ConversationMetrics>();
  private analyticsUpdate = new Subject<VoiceAnalyticsData>();
  public analytics$ = this.analyticsUpdate.asObservable();

  // Sentiment analysis keywords
  private positiveWords = new Set(['good', 'great', 'excellent', 'happy', 'satisfied', 'thank', 'perfect', 'helpful', 'resolved']);
  private negativeWords = new Set(['bad', 'terrible', 'angry', 'frustrated', 'unhappy', 'disappointed', 'wrong', 'failed', 'problem']);

  constructor() {
    console.log('VoiceAnalyticsService: Initialized');
  }

  // Process conversation transcript
  async processTranscript(
    sessionId: string,
    segments: TranscriptSegment[]
  ): Promise<ConversationMetrics> {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metrics: ConversationMetrics = {
      id: conversationId,
      sessionId,
      timestamp: new Date(),
      duration: this.calculateDuration(segments),
      sentiment: this.analyzeSentiment(segments),
      sentimentScore: this.calculateSentimentScore(segments),
      transcript: segments,
      speakerStats: this.analyzeSpeakerStats(segments),
      qualityMetrics: this.analyzeQuality(segments),
      keywords: this.extractKeywords(segments)
    };

    // Store conversation
    this.conversations.set(conversationId, metrics);
    
    // Broadcast update
    this.broadcastAnalytics();

    console.log(`VoiceAnalytics: Processed conversation ${conversationId}, sentiment: ${metrics.sentiment}`);
    return metrics;
  }

  // Get real-time analytics
  getAnalytics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): VoiceAnalyticsData {
    const cutoffTime = this.getCutoffTime(timeRange);
    const recentConversations = Array.from(this.conversations.values())
      .filter(conv => conv.timestamp >= cutoffTime)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50); // Last 50 conversations

    if (recentConversations.length === 0) {
      return this.getEmptyAnalytics();
    }

    return {
      totalConversations: recentConversations.length,
      avgDuration: this.calculateAverageDuration(recentConversations),
      successRate: this.calculateSuccessRate(recentConversations),
      sentimentDistribution: this.calculateSentimentDistribution(recentConversations),
      topKeywords: this.getTopKeywords(recentConversations),
      speakerStats: this.aggregateSpeakerStats(recentConversations),
      qualityMetrics: this.aggregateQualityMetrics(recentConversations),
      recentConversations: recentConversations.slice(0, 10) // Last 10 for display
    };
  }

  // Get conversation by ID
  getConversation(conversationId: string): ConversationMetrics | undefined {
    return this.conversations.get(conversationId);
  }

  // Get conversations by session
  getConversationsBySession(sessionId: string): ConversationMetrics[] {
    return Array.from(this.conversations.values())
      .filter(conv => conv.sessionId === sessionId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Private helper methods
  private calculateDuration(segments: TranscriptSegment[]): number {
    if (segments.length === 0) return 0;
    const start = segments[0].timestamp.getTime();
    const end = segments[segments.length - 1].timestamp.getTime();
    return Math.round((end - start) / 1000); // Convert to seconds
  }

  private analyzeSentiment(segments: TranscriptSegment[]): 'positive' | 'neutral' | 'negative' {
    const score = this.calculateSentimentScore(segments);
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    return 'neutral';
  }

  private calculateSentimentScore(segments: TranscriptSegment[]): number {
    let totalScore = 0;
    let wordCount = 0;

    segments.forEach(segment => {
      const words = segment.text.toLowerCase().split(/\s+/);
      words.forEach(word => {
        wordCount++;
        if (this.positiveWords.has(word)) totalScore += 1;
        if (this.negativeWords.has(word)) totalScore -= 1;
      });
    });

    return wordCount > 0 ? totalScore / wordCount : 0;
  }

  private analyzeSpeakerStats(segments: TranscriptSegment[]): SpeakerStats {
    const agentSegments = segments.filter(s => s.speaker === 'agent');
    const customerSegments = segments.filter(s => s.speaker === 'customer');

    const agentTime = agentSegments.reduce((sum, s) => sum + s.duration, 0);
    const customerTime = customerSegments.reduce((sum, s) => sum + s.duration, 0);
    const totalTime = agentTime + customerTime;

    return {
      totalSpeakTime: totalTime > 0 ? Math.round((customerTime / totalTime) * 100) : 50,
      avgSpeakingRate: this.calculateSpeakingRate(segments),
      interruptions: this.countInterruptions(segments),
      longestPause: this.findLongestPause(segments),
      fillerWords: this.countFillerWords(segments)
    };
  }

  private calculateSpeakingRate(segments: TranscriptSegment[]): number {
    const totalWords = segments.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0);
    const totalTime = segments.reduce((sum, s) => sum + s.duration, 0);
    const totalTimeMinutes = totalTime / 60;
    return totalTimeMinutes > 0 ? Math.round(totalWords / totalTimeMinutes) : 150;
  }

  private countInterruptions(segments: TranscriptSegment[]): number {
    let interruptions = 0;
    for (let i = 1; i < segments.length; i++) {
      const current = segments[i];
      const previous = segments[i - 1];
      if (current.speaker !== previous.speaker && 
          current.timestamp.getTime() - previous.timestamp.getTime() < 1000) {
        interruptions++;
      }
    }
    return interruptions;
  }

  private findLongestPause(segments: TranscriptSegment[]): number {
    let longestPause = 0;
    for (let i = 1; i < segments.length; i++) {
      const pause = (segments[i].timestamp.getTime() - segments[i - 1].timestamp.getTime()) / 1000;
      longestPause = Math.max(longestPause, pause);
    }
    return Math.round(longestPause);
  }

  private countFillerWords(segments: TranscriptSegment[]): number {
    const fillerWords = new Set(['um', 'uh', 'like', 'you know', 'actually', 'basically']);
    let count = 0;
    segments.forEach(segment => {
      const words = segment.text.toLowerCase().split(/\s+/);
      count += words.filter(word => fillerWords.has(word)).length;
    });
    return count;
  }

  private analyzeQuality(segments: TranscriptSegment[]): QualityMetrics {
    // Analyze based on completeness, clarity, and relevance indicators
    const avgConfidence = segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length;
    const clarity = Math.round(avgConfidence * 100);
    
    // Estimate completeness based on conversation flow
    const completeness = this.estimateCompleteness(segments);
    
    // Estimate relevance based on keyword consistency
    const relevance = this.estimateRelevance(segments);
    
    // Estimate satisfaction based on sentiment
    const sentiment = this.calculateSentimentScore(segments);
    const satisfaction = Math.round(Math.max(0, Math.min(100, (sentiment + 1) * 50)));

    return { clarity, completeness, relevance, satisfaction };
  }

  private estimateCompleteness(segments: TranscriptSegment[]): number {
    // Check for conversation resolution indicators
    const resolutionWords = ['resolved', 'completed', 'done', 'finished', 'thank you', 'goodbye'];
    const hasResolution = segments.some(s => 
      resolutionWords.some(word => s.text.toLowerCase().includes(word))
    );
    return hasResolution ? 90 : 70;
  }

  private estimateRelevance(segments: TranscriptSegment[]): number {
    // Estimate based on topic consistency
    const allText = segments.map(s => s.text.toLowerCase()).join(' ');
    const uniqueWords = new Set(allText.split(/\s+/)).size;
    const totalWords = allText.split(/\s+/).length;
    const repetitionRate = 1 - (uniqueWords / totalWords);
    
    // Moderate repetition indicates focused conversation
    return Math.round(85 + repetitionRate * 10);
  }

  private extractKeywords(segments: TranscriptSegment[]): KeywordAnalysis[] {
    const allText = segments.map(s => s.text.toLowerCase()).join(' ');
    const words = allText.split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'been'].includes(word));

    const wordCounts = new Map<string, number>();
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });

    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({
        word,
        count,
        trend: 'stable', // Would require historical data
        sentiment: this.positiveWords.has(word) ? 'positive' : 
                   this.negativeWords.has(word) ? 'negative' : 'neutral',
        category: this.categorizeKeyword(word)
      }));
  }

  private categorizeKeyword(word: string): string {
    const categories = {
      billing: ['bill', 'payment', 'charge', 'invoice', 'cost', 'price'],
      technical: ['password', 'login', 'account', 'server', 'error', 'issue'],
      service: ['delivery', 'shipping', 'order', 'product', 'return', 'refund'],
      support: ['help', 'support', 'assistance', 'ticket', 'case', 'contact']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => word.includes(keyword))) {
        return category;
      }
    }
    return 'general';
  }

  private getCutoffTime(timeRange: '1h' | '24h' | '7d' | '30d'): Date {
    const now = new Date();
    switch (timeRange) {
      case '1h': return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default: return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private getEmptyAnalytics(): VoiceAnalyticsData {
    return {
      totalConversations: 0,
      avgDuration: 0,
      successRate: 0,
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
      topKeywords: [],
      speakerStats: {
        customer: { totalSpeakTime: 0, avgSpeakingRate: 0, interruptions: 0, longestPause: 0, fillerWords: 0 },
        agent: { totalSpeakTime: 0, avgSpeakingRate: 0, interruptions: 0, longestPause: 0, fillerWords: 0 }
      },
      qualityMetrics: { clarity: 0, completeness: 0, relevance: 0, satisfaction: 0 },
      recentConversations: []
    };
  }

  private calculateAverageDuration(conversations: ConversationMetrics[]): number {
    const total = conversations.reduce((sum, conv) => sum + conv.duration, 0);
    return Math.round(total / conversations.length);
  }

  private calculateSuccessRate(conversations: ConversationMetrics[]): number {
    const successful = conversations.filter(conv => conv.qualityMetrics.satisfaction > 60).length;
    return Math.round((successful / conversations.length) * 100);
  }

  private calculateSentimentDistribution(conversations: ConversationMetrics[]): { positive: number; neutral: number; negative: number } {
    const sentiments = { positive: 0, neutral: 0, negative: 0 };
    conversations.forEach(conv => {
      sentiments[conv.sentiment]++;
    });
    
    const total = conversations.length;
    return {
      positive: Math.round((sentiments.positive / total) * 100),
      neutral: Math.round((sentiments.neutral / total) * 100),
      negative: Math.round((sentiments.negative / total) * 100)
    };
  }

  private getTopKeywords(conversations: ConversationMetrics[]): KeywordAnalysis[] {
    const allKeywords = conversations.flatMap(conv => conv.keywords);
    const keywordMap = new Map<string, { count: number; sentiment: string[] }>();

    allKeywords.forEach(keyword => {
      const existing = keywordMap.get(keyword.word);
      if (existing) {
        existing.count += keyword.count;
        existing.sentiment.push(keyword.sentiment);
      } else {
        keywordMap.set(keyword.word, { count: keyword.count, sentiment: [keyword.sentiment] });
      }
    });

    return Array.from(keywordMap.entries())
      .map(([word, data]) => ({
        word,
        count: data.count,
        trend: 'stable' as const, // Would require historical comparison
        sentiment: this.getMajoritySentiment(data.sentiment),
        category: this.categorizeKeyword(word)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getMajoritySentiment(sentiments: string[]): 'positive' | 'neutral' | 'negative' {
    const counts = { positive: 0, neutral: 0, negative: 0 };
    sentiments.forEach(s => counts[s as keyof typeof counts]++);
    const max = Math.max(counts.positive, counts.neutral, counts.negative);
    return Object.keys(counts).find(key => counts[key as keyof typeof counts] === max) as 'positive' | 'neutral' | 'negative';
  }

  private aggregateSpeakerStats(conversations: ConversationMetrics[]): { customer: SpeakerStats; agent: SpeakerStats } {
    const customerStats = {
      totalSpeakTime: Math.round(conversations.reduce((sum, conv) => sum + conv.speakerStats.totalSpeakTime, 0) / conversations.length),
      avgSpeakingRate: Math.round(conversations.reduce((sum, conv) => sum + conv.speakerStats.avgSpeakingRate, 0) / conversations.length),
      interruptions: Math.round(conversations.reduce((sum, conv) => sum + conv.speakerStats.interruptions, 0) / conversations.length),
      longestPause: Math.round(conversations.reduce((sum, conv) => sum + conv.speakerStats.longestPause, 0) / conversations.length),
      fillerWords: Math.round(conversations.reduce((sum, conv) => sum + conv.speakerStats.fillerWords, 0) / conversations.length)
    };

    // Agent stats are inverse of customer for total speak time
    const agentStats = {
      ...customerStats,
      totalSpeakTime: 100 - customerStats.totalSpeakTime
    };

    return { customer: customerStats, agent: agentStats };
  }

  private aggregateQualityMetrics(conversations: ConversationMetrics[]): QualityMetrics {
    return {
      clarity: Math.round(conversations.reduce((sum, conv) => sum + conv.qualityMetrics.clarity, 0) / conversations.length),
      completeness: Math.round(conversations.reduce((sum, conv) => sum + conv.qualityMetrics.completeness, 0) / conversations.length),
      relevance: Math.round(conversations.reduce((sum, conv) => sum + conv.qualityMetrics.relevance, 0) / conversations.length),
      satisfaction: Math.round(conversations.reduce((sum, conv) => sum + conv.qualityMetrics.satisfaction, 0) / conversations.length)
    };
  }

  private broadcastAnalytics(): void {
    const analytics = this.getAnalytics('24h');
    this.analyticsUpdate.next(analytics);
  }

  // Cleanup old conversations
  cleanup(): void {
    const cutoffTime = this.getCutoffTime('30d');
    let cleanedCount = 0;
    
    for (const [id, conversation] of this.conversations.entries()) {
      if (conversation.timestamp < cutoffTime) {
        this.conversations.delete(id);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`VoiceAnalytics: Cleaned up ${cleanedCount} old conversations`);
    }
  }
}