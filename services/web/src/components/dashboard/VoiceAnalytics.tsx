import React from 'react';
import { 
  Mic, 
  TrendingUp, 
  TrendingDown, 
  MessageSquare, 
  Users, 
  Clock,
  BarChart3,
  Activity,
  Volume2,
  Brain,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Filter,
  Download,
  Eye,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Zap,
  Target,
  FileText
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useVoiceAnalytics } from '../../hooks/useVoiceAnalytics';

interface VoiceAnalyticsData {
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

interface VoiceAnalyticsProps {
  className?: string;
}

export default function VoiceAnalyticsDashboard({ className }: VoiceAnalyticsProps) {
  const { 
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
  } = useVoiceAnalytics();

  const timeRanges = [
    { value: '1h', label: '1 Hour' },
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' }
  ];

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-red-500" />;
      default: return <Activity className="w-3 h-3 text-gray-500" />;
    }
  };

  const getSentimentIcon = (sentiment: 'positive' | 'neutral' | 'negative') => {
    switch (sentiment) {
      case 'positive': return <ThumbsUp className="w-4 h-4 text-green-500" />;
      case 'negative': return <ThumbsDown className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return 'text-red-500 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-500 bg-yellow-100 border-yellow-200';
      default: return 'text-gray-500 bg-gray-100 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary animate-pulse" />
          <h2 className="text-xl font-semibold">Voice Analytics Dashboard</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Loading Voice Analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Voice Analytics Dashboard</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Analytics Data Available</h3>
            <p className="text-muted-foreground mb-4">
              Voice analytics data will appear once conversations are processed.
            </p>
            <button
              onClick={refreshAnalytics}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Voice Analytics Dashboard</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <Calendar className="w-4 h-4 text-muted-foreground ml-2" />
            {timeRanges.map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRangeValue(range.value as any)}
                className={cn(
                  "px-3 py-1 rounded-md text-sm font-medium transition-all",
                  timeRange === range.value 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {range.label}
              </button>
            ))}
          </div>
          
          {/* Real-time Toggle */}
          <button
            onClick={toggleRealtime}
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-medium border transition-all",
              realtime 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-muted text-muted-foreground border-border"
            )}
          >
            {realtime ? 'Live' : 'Paused'}
          </button>
          
          {/* Refresh */}
          <button
            onClick={refreshAnalytics}
            className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <MessageSquare className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Conversations</p>
              <p className="text-2xl font-bold">{analytics.totalConversations}</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Clock className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Duration</p>
              <p className="text-2xl font-bold">{Math.round(analytics.avgDuration)}s</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Target className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className="text-2xl font-bold">{Math.round(analytics.successRate)}%</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Brain className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Satisfaction</p>
              <p className="text-2xl font-bold">{Math.round(analytics.qualityMetrics.satisfaction)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Distribution */}
        <div className="p-4 rounded-lg border bg-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Sentiment Distribution
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Positive</span>
                <span>{Math.round(sentimentPercentages.positive)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${sentimentPercentages.positive}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Neutral</span>
                <span>{Math.round(sentimentPercentages.neutral)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${sentimentPercentages.neutral}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Negative</span>
                <span>{Math.round(sentimentPercentages.negative)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: `${sentimentPercentages.negative}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Top Keywords */}
        <div className="p-4 rounded-lg border bg-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Top Keywords
          </h3>
          <div className="space-y-2">
            {analytics.topKeywords.map((keyword, index) => (
              <div key={keyword.word} className="flex items-center justify-between p-2 bg-muted rounded">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{index + 1}. {keyword.word}</span>
                  {getTrendIcon(keyword.trend)}
                </div>
                <span className="text-sm text-muted-foreground">{keyword.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Speaker Stats */}
        <div className="p-4 rounded-lg border bg-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Speaker Analysis
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <Users className="w-4 h-4" />
                Customer
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Speak Time:</span>
                  <p>{Math.round(analytics.speakerStats.customer.totalSpeakTime)}s</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Interruptions:</span>
                  <p>{analytics.speakerStats.customer.interruptions}</p>
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <FileText className="w-4 h-4" />
                Agent
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Speak Time:</span>
                  <p>{Math.round(analytics.speakerStats.agent.totalSpeakTime)}s</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Interruptions:</span>
                  <p>{analytics.speakerStats.agent.interruptions}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="p-4 rounded-lg border bg-card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Quality Metrics
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Clarity</span>
                <span>{Math.round(analytics.qualityMetrics.clarity)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${analytics.qualityMetrics.clarity}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Completeness</span>
                <span>{Math.round(analytics.qualityMetrics.completeness)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${analytics.qualityMetrics.completeness}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Relevance</span>
                <span>{Math.round(analytics.qualityMetrics.relevance)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${analytics.qualityMetrics.relevance}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="p-4 rounded-lg border bg-card">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-500" />
          Recent Conversations
        </h3>
        <div className="space-y-3">
          {analytics.recentConversations.map((conversation) => (
            <div 
              key={conversation.id} 
              className="p-3 border rounded-lg hover:bg-muted transition-colors cursor-pointer"
              onClick={() => selectConversation(conversation.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getSentimentIcon(conversation.sentiment)}
                    <span className="text-sm font-medium">{conversation.summary}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{conversation.timestamp.toLocaleString()}</span>
                    <span>{Math.round(conversation.duration)}s</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {conversation.issues.length > 0 && (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs text-yellow-500">{conversation.issues.length}</span>
                    </div>
                  )}
                  {selectedConversation === conversation.id && (
                    <Eye className="w-4 h-4 text-blue-500" />
                  )}
                </div>
              </div>
              
              {/* Expand Details */}
              {selectedConversation === conversation.id && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  {conversation.issues.length > 0 && (
                    <div>
                      <span className="text-sm font-medium">Issues:</span>
                      <div className="mt-1 space-y-1">
                        {conversation.issues.map((issue, index) => (
                          <div key={index} className={cn(
                            "px-2 py-1 rounded text-xs border",
                            getSeverityColor(issue.severity)
                          )}>
                            <span className="font-medium">{issue.type}:</span> {issue.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}