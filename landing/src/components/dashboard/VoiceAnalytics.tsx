import React, { useState, useEffect } from 'react';
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
}

interface Conversation {
  id: string;
  timestamp: Date;
  duration: number;
  participants: {
    customer: string;
    agent: string;
  };
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  keywords: string[];
  transcript: string;
  issues: Array<{
    type: 'sentiment' | 'compliance' | 'quality' | 'technical';
    severity: 'low' | 'medium' | 'high';
    description: string;
    timestamp: number;
  }>;
  outcomes: {
    resolved: boolean;
    escalation: boolean;
    satisfaction: number;
  };
}

interface VoiceAnalyticsDashboardProps {
  className?: string;
}

export default function VoiceAnalyticsDashboard({ className }: VoiceAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<VoiceAnalytics | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  const generateMockAnalytics = (): VoiceAnalytics => ({
    totalConversations: 1247,
    avgDuration: 245, // seconds
    successRate: 87.3,
    sentimentDistribution: {
      positive: 68.5,
      neutral: 24.2,
      negative: 7.3
    },
    topKeywords: [
      { word: 'billing', count: 234, trend: 'up' },
      { word: 'password', count: 189, trend: 'stable' },
      { word: 'delivery', count: 156, trend: 'down' },
      { word: 'refund', count: 142, trend: 'up' },
      { word: 'appointment', count: 128, trend: 'stable' },
      { word: 'account', count: 115, trend: 'up' }
    ],
    speakerStats: {
      customer: {
        totalSpeakTime: 65.3,
        avgSpeakingRate: 145,
        interruptions: 23
      },
      agent: {
        totalSpeakTime: 34.7,
        avgSpeakingRate: 160,
        interruptions: 8
      }
    },
    qualityMetrics: {
      clarity: 92.1,
      completeness: 88.7,
      relevance: 94.3,
      satisfaction: 87.6
    }
  });

  const generateMockConversations = (): Conversation[] => [
    {
      id: 'conv-001',
      timestamp: new Date(Date.now() - 3600000),
      duration: 180,
      participants: {
        customer: 'John Doe',
        agent: 'Agent Smith'
      },
      sentiment: 'positive',
      score: 92,
      keywords: ['billing', 'refund', 'resolved'],
      transcript: 'Customer had a billing inquiry that was successfully resolved...',
      issues: [],
      outcomes: {
        resolved: true,
        escalation: false,
        satisfaction: 9
      }
    },
    {
      id: 'conv-002',
      timestamp: new Date(Date.now() - 7200000),
      duration: 420,
      participants: {
        customer: 'Jane Smith',
        agent: 'Agent Johnson'
      },
      sentiment: 'negative',
      score: 45,
      keywords: ['complaint', 'escalation', 'manager'],
      transcript: 'Customer expressed frustration with service quality...',
      issues: [
        {
          type: 'sentiment',
          severity: 'high',
          description: 'Customer showed high frustration levels',
          timestamp: 120
        },
        {
          type: 'quality',
          severity: 'medium',
          description: 'Request for supervisor escalation',
          timestamp: 300
        }
      ],
      outcomes: {
        resolved: false,
        escalation: true,
        satisfaction: 2
      }
    },
    {
      id: 'conv-003',
      timestamp: new Date(Date.now() - 10800000),
      duration: 150,
      participants: {
        customer: 'Mike Wilson',
        agent: 'Agent Davis'
      },
      sentiment: 'neutral',
      score: 78,
      keywords: ['password', 'reset', 'account'],
      transcript: 'Standard password reset request completed successfully...',
      issues: [
        {
          type: 'technical',
          severity: 'low',
          description: 'System delay during authentication',
          timestamp: 45
        }
      ],
      outcomes: {
        resolved: true,
        escalation: false,
        satisfaction: 7
      }
    }
  ];

  // Initialize data
  useEffect(() => {
    setAnalytics(generateMockAnalytics());
    setConversations(generateMockConversations());
  }, []);

  // Real-time updates
  useEffect(() => {
    if (!realTimeUpdates) return;

    const interval = setInterval(() => {
      setAnalytics(prev => {
        if (!prev) return generateMockAnalytics();
        
        return {
          ...prev,
          totalConversations: prev.totalConversations + Math.floor(Math.random() * 3),
          avgDuration: Math.max(120, prev.avgDuration + (Math.random() - 0.5) * 10),
          successRate: Math.min(100, Math.max(80, prev.successRate + (Math.random() - 0.5) * 2)),
          sentimentDistribution: {
            positive: Math.max(50, Math.min(80, prev.sentimentDistribution.positive + (Math.random() - 0.5) * 2)),
            neutral: Math.max(15, Math.min(35, prev.sentimentDistribution.neutral + (Math.random() - 0.5) * 1)),
            negative: Math.max(5, Math.min(15, prev.sentimentDistribution.negative + (Math.random() - 0.5) * 1))
          },
          speakerStats: {
            customer: {
              totalSpeakTime: Math.max(50, Math.min(80, prev.speakerStats.customer.totalSpeakTime + (Math.random() - 0.5) * 2)),
              avgSpeakingRate: Math.max(120, Math.min(180, prev.speakerStats.customer.avgSpeakingRate + (Math.random() - 0.5) * 5)),
              interruptions: Math.max(0, prev.speakerStats.customer.interruptions + Math.floor(Math.random() * 3))
            },
            agent: {
              totalSpeakTime: 100 - prev.speakerStats.customer.totalSpeakTime,
              avgSpeakingRate: Math.max(140, Math.min(200, prev.speakerStats.agent.avgSpeakingRate + (Math.random() - 0.5) * 5)),
              interruptions: Math.max(0, prev.speakerStats.agent.interruptions + Math.floor(Math.random() * 2))
            }
          },
          qualityMetrics: {
            clarity: Math.max(80, Math.min(100, prev.qualityMetrics.clarity + (Math.random() - 0.5) * 2)),
            completeness: Math.max(80, Math.min(100, prev.qualityMetrics.completeness + (Math.random() - 0.5) * 2)),
            relevance: Math.max(80, Math.min(100, prev.qualityMetrics.relevance + (Math.random() - 0.5) * 2)),
            satisfaction: Math.max(70, Math.min(100, prev.qualityMetrics.satisfaction + (Math.random() - 0.5) * 3))
          }
        };
      });

      // Add new conversation occasionally
      if (Math.random() > 0.8) {
        const newConversation: Conversation = {
          id: 'conv_' + Date.now(),
          timestamp: new Date(),
          duration: Math.floor(Math.random() * 600) + 60,
          participants: {
            customer: ['Customer A', 'Customer B', 'Customer C'][Math.floor(Math.random() * 3)],
            agent: ['Agent X', 'Agent Y', 'Agent Z'][Math.floor(Math.random() * 3)]
          },
          sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)] as 'positive' | 'neutral' | 'negative',
          score: Math.floor(Math.random() * 100),
          keywords: ['support', 'help', 'issue', 'question', 'billing'].slice(0, Math.floor(Math.random() * 3) + 1),
          transcript: 'Conversation transcript placeholder...',
          issues: Math.random() > 0.7 ? [{
            type: ['sentiment', 'compliance', 'quality', 'technical'][Math.floor(Math.random() * 4)] as any,
            severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
            description: 'Sample issue description',
            timestamp: Math.floor(Math.random() * 200)
          }] : [],
          outcomes: {
            resolved: Math.random() > 0.3,
            escalation: Math.random() > 0.8,
            satisfaction: Math.floor(Math.random() * 10) + 1
          }
        };

        setConversations(prev => [newConversation, ...prev.slice(0, 19)]);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [realTimeUpdates]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-500 bg-green-100 border-green-200';
      case 'negative': return 'text-red-500 bg-red-100 border-red-200';
      case 'neutral': return 'text-gray-500 bg-gray-100 border-gray-200';
      default: return 'text-gray-500 bg-gray-100 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'down': return <TrendingDown className="w-3 h-3 text-red-500" />;
      default: return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  const getQualityColor = (value: number) => {
    if (value >= 90) return 'text-green-500';
    if (value >= 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getIssueSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Mic className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Voice Analytics & Insights</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-1 rounded-lg border border-border bg-card text-sm"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            onClick={() => setRealTimeUpdates(!realTimeUpdates)}
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-medium border transition-all",
              realTimeUpdates 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-muted text-muted-foreground border-border"
            )}
          >
            {realTimeUpdates ? 'Live' : 'Paused'}
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span className="text-xs text-muted-foreground">{selectedPeriod}</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{analytics.totalConversations.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Total Conversations</div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="text-xs text-green-500">+5%</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{Math.floor(analytics.avgDuration / 60)}:{(analytics.avgDuration % 60).toString().padStart(2, '0')}</div>
          <div className="text-sm text-muted-foreground">Avg Duration</div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-green-500" />
            <span className="text-xs text-green-500">+2%</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{analytics.successRate.toFixed(1)}%</div>
          <div className="text-sm text-muted-foreground">Success Rate</div>
        </div>

        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <Heart className="w-5 h-5 text-pink-500" />
            <span className="text-xs text-muted-foreground">Score</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{analytics.qualityMetrics.satisfaction.toFixed(0)}/10</div>
          <div className="text-sm text-muted-foreground">Avg Satisfaction</div>
        </div>
      </div>

      {/* Sentiment Distribution & Keywords */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Distribution */}
        <div className="p-4 rounded-lg border bg-card">
          <h3 className="font-semibold mb-4">Sentiment Distribution</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm">Positive</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${analytics.sentimentDistribution.positive}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{analytics.sentimentDistribution.positive.toFixed(1)}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full" />
                <span className="text-sm">Neutral</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gray-500 transition-all duration-500"
                    style={{ width: `${analytics.sentimentDistribution.neutral}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{analytics.sentimentDistribution.neutral.toFixed(1)}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-sm">Negative</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${analytics.sentimentDistribution.negative}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{analytics.sentimentDistribution.negative.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Keywords */}
        <div className="p-4 rounded-lg border bg-card">
          <h3 className="font-semibold mb-4">Top Keywords</h3>
          <div className="space-y-2">
            {analytics.topKeywords.map(keyword => (
              <div key={keyword.word} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getTrendIcon(keyword.trend)}
                  <span className="text-sm font-medium">{keyword.word}</span>
                </div>
                <span className="text-sm text-muted-foreground">{keyword.count} mentions</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quality Metrics */}
      <div className="p-4 rounded-lg border bg-card">
        <h3 className="font-semibold mb-4">Quality Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={cn("text-2xl font-bold", getQualityColor(analytics.qualityMetrics.clarity))}>
              {analytics.qualityMetrics.clarity.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Clarity</div>
          </div>
          <div className="text-center">
            <div className={cn("text-2xl font-bold", getQualityColor(analytics.qualityMetrics.completeness))}>
              {analytics.qualityMetrics.completeness.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Completeness</div>
          </div>
          <div className="text-center">
            <div className={cn("text-2xl font-bold", getQualityColor(analytics.qualityMetrics.relevance))}>
              {analytics.qualityMetrics.relevance.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">Relevance</div>
          </div>
          <div className="text-center">
            <div className={cn("text-2xl font-bold", getQualityColor(analytics.qualityMetrics.satisfaction))}>
              {analytics.qualityMetrics.satisfaction.toFixed(0)}%
            </div>
            <div className="text-sm text-muted-foreground">Satisfaction</div>
          </div>
        </div>
      </div>

      {/* Speaker Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-4 rounded-lg border bg-card">
          <h3 className="font-semibold mb-4">Customer Speaking Patterns</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Speak Time</span>
              <span className="text-sm font-medium">{analytics.speakerStats.customer.totalSpeakTime.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Speaking Rate</span>
              <span className="text-sm font-medium">{analytics.speakerStats.customer.avgSpeakingRate} wpm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Interruptions</span>
              <span className="text-sm font-medium">{analytics.speakerStats.customer.interruptions}</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-card">
          <h3 className="font-semibold mb-4">Agent Speaking Patterns</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Speak Time</span>
              <span className="text-sm font-medium">{analytics.speakerStats.agent.totalSpeakTime.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Speaking Rate</span>
              <span className="text-sm font-medium">{analytics.speakerStats.agent.avgSpeakingRate} wpm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Interruptions</span>
              <span className="text-sm font-medium">{analytics.speakerStats.agent.interruptions}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="p-4 rounded-lg border bg-card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Recent Conversations</h3>
          <button className="text-sm text-primary hover:underline flex items-center gap-1">
            <Eye className="w-4 h-4" />
            View All
          </button>
        </div>
        <div className="space-y-3">
          {conversations.slice(0, 5).map(conversation => (
            <div
              key={conversation.id}
              className="p-3 rounded-lg bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => setSelectedConversation(selectedConversation === conversation.id ? null : conversation.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium text-sm">{conversation.participants.customer} ↔ {conversation.participants.agent}</div>
                  <div className="text-xs text-muted-foreground">
                    {conversation.timestamp.toLocaleString()} • {conversation.duration}s
                  </div>
                </div>
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium border",
                  getSentimentColor(conversation.sentiment)
                )}>
                  {conversation.sentiment}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                <span>Score: {conversation.score}/100</span>
                <span>Resolution: {conversation.outcomes.resolved ? '✓' : '✗'}</span>
                <span>Satisfaction: {conversation.outcomes.satisfaction}/10</span>
                {conversation.issues.length > 0 && (
                  <span className="text-red-500">
                    {conversation.issues.length} {conversation.issues.length === 1 ? 'issue' : 'issues'}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {conversation.keywords.map(keyword => (
                  <span 
                    key={keyword}
                    className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs"
                  >
                    {keyword}
                  </span>
                ))}
              </div>

              {/* Issues */}
              {conversation.issues.length > 0 && (
                <div className="mt-2 space-y-1">
                  {conversation.issues.map((issue, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        getIssueSeverityColor(issue.severity)
                      )} />
                      <span className="text-muted-foreground">{issue.type}: {issue.description}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Conversation Details */}
              {selectedConversation === conversation.id && (
                <div className="mt-3 p-3 rounded bg-background border">
                  <h4 className="font-medium mb-2">Transcript Preview</h4>
                  <p className="text-sm text-muted-foreground mb-3">{conversation.transcript}</p>
                  <div className="flex gap-2">
                    <button className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs">
                      View Full Transcript
                    </button>
                    <button className="px-2 py-1 border border-border rounded text-xs">
                      Download Audio
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}