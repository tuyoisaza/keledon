import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Mic, 
  MicOff, 
  Cpu, 
  Globe, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Zap,
  Brain,
  Volume2,
  Radio
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAgentStatus } from '../../hooks/useAgentStatus';

interface AgentControlCenterProps {
  className?: string;
}

export default function AgentControlCenter({ className }: AgentControlCenterProps) {
  const { 
    agents, 
    systemHealth, 
    loading, 
    selectAgent,
    clearSelection
  } = useAgentStatus();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle': return <Clock className="w-4 h-4" />;
      case 'listening': return <Mic className="w-4 h-4" />;
      case 'processing': return <Brain className="w-4 h-4" />;
      case 'executing': return <Zap className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
      case 'listening': return 'text-green-500 bg-green-500/10 border-green-500/20 animate-pulse';
      case 'processing': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'executing': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'error': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Agent Control Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time agent monitoring and performance tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-md border border-border">
            <Clock className="w-4 h-4" />
            <span>Real-time Status</span>
          </div>
          <button
            onClick={() => {/* TODO: Implement real-time toggle */}}
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-medium border transition-all",
              true /* realTimeUpdates */ ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"
            )}
          >
            {/* realTimeUpdates ? 'Live' : 'Paused' */}
          </button>
        </div>
      </div>

      {/* System Health Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { key: 'overall', label: 'System', icon: Globe },
          { key: 'websocket', label: 'WebSocket', icon: Radio },
          { key: 'tts', label: 'TTS', icon: Volume2 },
          { key: 'stt', label: 'STT', icon: Mic },
          { key: 'ai', label: 'AI', icon: Brain }
        ].map(({ key, label, icon: Icon }) => (
          <div key={key} className="p-3 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{label}</span>
            </div>
            <div className={cn("text-xs font-medium", systemHealth[key as keyof typeof systemHealth])}>
              {systemHealth[key as keyof typeof systemHealth]?.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Loading agent status...</span>
          </div>
        ) : (
          <>
            {agents.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground mb-4">No agents connected</div>
                <p className="text-sm text-muted-foreground">Agent status will appear here when agents are available.</p>
              </div>
            ) : (
              agents.map((agent) => (
                <div
                  key={agent.id}
                  className={cn(
                    "p-4 rounded-lg border bg-card cursor-pointer transition-all hover:border-primary/30",
                    agent.id === selectAgent && "border-primary bg-primary/5"
                  )}
                  onClick={() => selectAgent(agent.id)}
                >
                  {/* Agent Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{agent.name}</h3>
                      <p className="text-xs text-muted-foreground font-mono">{agent.id}</p>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded-full text-xs border uppercase flex items-center gap-1",
                      getStatusColor(agent.status)
                    )}>
                      {getStatusIcon(agent.status)}
                      <span>{agent.status}</span>
                    </div>
                  </div>

                  {/* Audio Level Indicator */}
                  {agent.status === 'listening' && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Mic className="w-3 h-3 text-green-500" />
                        <span className="text-xs text-muted-foreground">Audio Level</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-150"
                          style={{ width: `${agent.audioLevel * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Capabilities */}
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-1">
                      {agent.capabilities.map((cap) => (
                        <span 
                          key={cap}
                          className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">CPU</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-300",
                              agent.performance.cpu > 70 ? "bg-red-500" :
                              agent.performance.cpu > 50 ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{ width: `${agent.performance.cpu}%` }}
                          />
                        </div>
                        </div>
                        <span className="text-xs font-mono">{Math.round(agent.performance.cpu)}%</span>
                      </div>
                    </div>
                  </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Memory</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-300",
                              agent.performance.memory > 70 ? "bg-red-500" :
                              agent.performance.memory > 50 ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{ width: `${agent.performance.memory}%` }}
                          />
                        </div>
                        </div>
                        <span className="text-xs font-mono">{Math.round(agent.performance.memory)}%</span>
                      </div>
                    </div>
                  </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Network</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-300",
                              agent.performance.network > 70 ? "bg-red-500" :
                              agent.performance.network > 50 ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{ width: `${agent.performance.network}%` }}
                          />
                        </div>
                        </div>
                        <span className="text-xs font-mono">{Math.round(agent.performance.network)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Current Session */}
                  {agent.currentSession && (
                    <div className="text-xs text-muted-foreground">
                      <span className="text-muted-foreground">Session: </span>
                      <span className="font-mono text-primary">{agent.currentSession.slice(0, 8)}</span>
                    </div>
                  )}

                  {/* Errors */}
                  {agent.errors.length > 0 && (
                    <div className="mt-2 p-2 rounded bg-red-50 border border-red-200">
                      <div className="flex items-center gap-1 text-red-700 text-xs">
                        <AlertCircle className="w-3 h-3" />
                        {agent.errors[agent.errors.length - 1]}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
            )}
          </>
        )}
      </div>

      {/* Selected Agent Details */}
      {selectAgent && (
        <div className="mt-6 p-4 rounded-lg border bg-card">
          <h3 className="font-semibold mb-3">Agent Details: {agents.find(a => a.id === selectAgent)?.name}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">ID:</span>
              <p className="font-mono">{selectAgent}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <p className="font-semibold">{agents.find(a => a.id === selectAgent)?.status}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Last Activity:</span>
              <p>{agents.find(a => a.id === selectAgent)?.lastActivity?.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Session:</span>
              <p className="font-mono">{agents.find(a => a.id === selectAgent)?.currentSession || 'None'}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button 
              onClick={() => selectAgent(selectAgent)}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
            >
              Start Agent
            </button>
            <button 
              onClick={() => {/* TODO: Implement stopAgent */}}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
            >
              Stop Agent
            </button>
            <button 
              onClick={clearSelection}
              className="px-3 py-1 bg-muted text-muted-foreground rounded text-sm hover:bg-muted/80 transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}