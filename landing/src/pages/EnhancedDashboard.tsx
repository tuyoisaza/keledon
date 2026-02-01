import React, { useState } from 'react';
import { 
  Activity, 
  Cpu, 
  Mic, 
  Zap, 
  Plug, 
  BarChart3,
  Monitor,
  Settings
} from 'lucide-react';
import { cn } from '../lib/utils';
import AgentControlCenter from '../components/dashboard/AgentControlCenter';
import AIAgentLoop from '../components/dashboard/AIAgentLoop';
import FlowExecutionVisualizer from '../components/dashboard/FlowExecutionVisualizer';
import IntegrationHub from '../components/dashboard/IntegrationHub';
import VoiceAnalytics from '../components/dashboard/VoiceAnalytics';

type TabType = 'agent-control' | 'ai-loop' | 'flow-viz' | 'integrations' | 'voice-analytics';

interface TabConfig {
  id: TabType;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  component: React.ComponentType<any>;
}

export default function EnhancedDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('agent-control');

  const tabs: TabConfig[] = [
    {
      id: 'agent-control',
      name: 'Agent Control',
      icon: Activity,
      description: 'Real-time agent monitoring and performance tracking',
      component: AgentControlCenter
    },
    {
      id: 'ai-loop',
      name: 'AI Intelligence',
      icon: Cpu,
      description: 'AI processing pipeline and decision making',
      component: AIAgentLoop
    },
    {
      id: 'flow-viz',
      name: 'Flow Execution',
      icon: Zap,
      description: 'RPA workflow visualization and monitoring',
      component: FlowExecutionVisualizer
    },
    {
      id: 'integrations',
      name: 'Integrations',
      icon: Plug,
      description: 'Enterprise platform connections and health monitoring',
      component: IntegrationHub
    },
    {
      id: 'voice-analytics',
      name: 'Voice Analytics',
      icon: BarChart3,
      description: 'Conversation insights and sentiment analysis',
      component: VoiceAnalytics
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-3 p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          KELEDON Enhanced Dashboard
        </h1>
        <p className="text-muted-foreground mb-8">
          Real-time monitoring with WebSocket integration - Mockups removed!
        </p>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium border transition-all",
                  isActive 
                    ? "bg-primary text-primary-foreground border-primary shadow-lg" 
                    : "bg-card text-card-foreground border-border hover:bg-muted/50"
                )}
              >
                <Icon className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">{tab.name}</div>
                  <div className="text-xs text-muted-foreground">{tab.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Component */}
        <div className="flex-1 bg-card rounded-lg border border-border">
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  );
}

  const tabs: TabConfig[] = [
    {
      id: 'agent-control',
      name: 'Agent Control',
      icon: Activity,
      description: 'Real-time agent status monitoring',
      component: AgentControlCenter
    },
    {
      id: 'ai-loop',
      name: 'AI Intelligence',
      icon: Cpu,
      description: 'Complete AI agent processing loop',
      component: AIAgentLoop
    },
    {
      id: 'flow-viz',
      name: 'Flow Execution',
      icon: Zap,
      description: 'RPA workflow visualization',
      component: FlowExecutionVisualizer
    },
    {
      id: 'integrations',
      name: 'Integrations',
      icon: Plug,
      description: 'Enterprise platform connections',
      component: IntegrationHub
    },
    {
      id: 'voice-analytics',
      name: 'Voice Analytics',
      icon: Mic,
      description: 'Conversation insights and metrics',
      component: VoiceAnalytics
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || AgentControlCenter;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Monitor className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">KELEDON Enhanced Dashboard</h1>
              <p className="text-muted-foreground">AI-powered browser automation platform</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 border-b-2 transition-all whitespace-nowrap",
                    activeTab === tab.id
                      ? "border-primary text-primary bg-primary/5"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <div className="text-left">
                    <div className="font-medium">{tab.name}</div>
                    <div className="text-xs opacity-70">{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <ActiveComponent />
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span>KELEDON v2.0 - Mockup Dashboard</span>
            </div>
            <div className="flex items-center gap-4">
              <span>All components are functional demonstrations</span>
              <Settings className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}