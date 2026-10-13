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
