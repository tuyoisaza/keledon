import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { useSocket } from '../context/SocketContext';

interface VoiceAnalytics {
  totalConversations: number;
  avgDuration: number;
  successRate: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topKeywords: Array<{ word: string; count: number; trend: 'up' | 'down' | 'stable' }>;
  speakerStats: {
    customer: {
      totalSpeakTime: number;
      avgSpeakingRate: number;
      interruptions: number;
    };
    agent: {
      totalSpeakTime: number;
      avgSpeakingRate: number;
      interruptions: number;
    };
  };
  qualityMetrics: {
    clarity: number;
    completeness: number;
    relevance: number;
    satisfaction: number;
  };
  recentConversations: Array<{
    id: string;
    timestamp: Date;
    duration: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    summary: string;
    issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
  }>;
}

export function useVoiceAnalytics(socket?: Socket | null) {
  const { socket: contextSocket } = useSocket();
  const actualSocket = socket || contextSocket;
  
  const [analytics, setAnalytics] = useState<VoiceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [realtime, setRealtime] = useState(true);

  useEffect(() => {
    if (!actualSocket) {
      console.warn('useVoiceAnalytics: No socket connection available');
      setLoading(false);
      return;
    }

    setLoading(true);

    // Request initial data
    actualSocket.emit('dashboard:get-voice-analytics', { timeRange });

    // Listen for voice analytics updates
    const handleVoiceAnalyticsUpdate = (data: VoiceAnalytics) => {
      setAnalytics(data);
      setLoading(false);
    };

    const handleRealtimeUpdate = (data: Partial<VoiceAnalytics>) => {
      setAnalytics(prev => prev ? { ...prev, ...data } : null);
    };

    const handleNewConversation = (conversation: VoiceAnalytics['recentConversations'][0]) => {
      setAnalytics(prev => prev ? {
        ...prev,
        totalConversations: prev.totalConversations + 1,
        recentConversations: [conversation, ...prev.recentConversations.slice(0, 9)]
      } : null);
    };

    const handleSentimentUpdate = (data: { sentiment: VoiceAnalytics['sentimentDistribution']; timestamp: Date }) => {
      setAnalytics(prev => prev ? {
        ...prev,
        sentimentDistribution: data.sentiment
      } : null);
    };

    const handleKeywordUpdate = (data: { keywords: VoiceAnalytics['topKeywords']; timestamp: Date }) => {
      setAnalytics(prev => prev ? {
        ...prev,
        topKeywords: data.keywords
      } : null);
    };

    const handleQualityMetricsUpdate = (data: { metrics: VoiceAnalytics['qualityMetrics']; timestamp: Date }) => {
      setAnalytics(prev => prev ? {
        ...prev,
        qualityMetrics: data.metrics
      } : null);
    };

    // Register event listeners
    actualSocket.on('dashboard:voice-analytics-update', handleVoiceAnalyticsUpdate);
    actualSocket.on('dashboard:voice-analytics-realtime', handleRealtimeUpdate);
    actualSocket.on('dashboard:new-conversation', handleNewConversation);
    actualSocket.on('dashboard:sentiment-update', handleSentimentUpdate);
    actualSocket.on('dashboard:keyword-update', handleKeywordUpdate);
    actualSocket.on('dashboard:quality-metrics-update', handleQualityMetricsUpdate);

    // Cleanup on unmount
    return () => {
      actualSocket.off('dashboard:voice-analytics-update', handleVoiceAnalyticsUpdate);
      actualSocket.off('dashboard:voice-analytics-realtime', handleRealtimeUpdate);
      actualSocket.off('dashboard:new-conversation', handleNewConversation);
      actualSocket.off('dashboard:sentiment-update', handleSentimentUpdate);
      actualSocket.off('dashboard:keyword-update', handleKeywordUpdate);
      actualSocket.off('dashboard:quality-metrics-update', handleQualityMetricsUpdate);
    };
  }, [actualSocket, timeRange]);

  // Control functions
  const refreshAnalytics = () => {
    if (actualSocket) {
      actualSocket.emit('dashboard:get-voice-analytics', { timeRange });
    }
  };

  const selectConversation = (conversationId: string) => {
    setSelectedConversation(selectedConversation === conversationId ? null : conversationId);
  };

  const clearSelection = () => {
    setSelectedConversation(null);
  };

  const setTimeRangeValue = (newTimeRange: typeof timeRange) => {
    setTimeRange(newTimeRange);
  };

  const toggleRealtime = () => {
    setRealtime(!realtime);
  };

  // Computed values
  const totalSentiment = analytics 
    ? analytics.sentimentDistribution.positive + analytics.sentimentDistribution.neutral + analytics.sentimentDistribution.negative
    : 0;

  const sentimentPercentages = analytics 
    ? {
        positive: totalSentiment > 0 ? (analytics.sentimentDistribution.positive / totalSentiment) * 100 : 0,
        neutral: totalSentiment > 0 ? (analytics.sentimentDistribution.neutral / totalSentiment) * 100 : 0,
        negative: totalSentiment > 0 ? (analytics.sentimentDistribution.negative / totalSentiment) * 100 : 0
      }
    : { positive: 0, neutral: 0, negative: 0 };

  return {
    analytics,
    loading,
    timeRange,
    selectedConversation,
    realtime,
    sentimentPercentages,
    refreshAnalytics,
    selectConversation,
    clearSelection,
    setTimeRangeValue,
    toggleRealtime
  };
}