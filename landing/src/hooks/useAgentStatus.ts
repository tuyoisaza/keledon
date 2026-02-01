import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface AgentStatus {
  id: string;
  name: string;
  status: 'idle' | 'listening' | 'processing' | 'executing' | 'error';
  audioLevel: number;
  lastActivity: Date;
  capabilities: string[];
  currentSession?: string;
  performance: {
    cpu: number;
    memory: number;
    network: number;
  };
  errors: string[];
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  websocket: 'connected' | 'disconnected' | 'connecting';
  tts: 'ready' | 'busy' | 'error';
  stt: 'ready' | 'busy' | 'error';
  ai: 'ready' | 'busy' | 'error' | 'processing';
}

export function useAgentStatus(socket: Socket | null) {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    overall: 'healthy',
    websocket: 'disconnected',
    tts: 'ready',
    stt: 'ready',
    ai: 'ready'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!socket) {
      console.warn('useAgentStatus: No socket connection available');
      setLoading(false);
      return;
    }

    setLoading(true);

    // Request initial data
    socket.emit('dashboard:get-agent-status');
    socket.emit('dashboard:get-system-health');

    // Listen for agent status updates
    const handleAgentStatusUpdate = (data: AgentStatus[]) => {
      setAgents(data);
      setLoading(false);
    };

    const handleSystemHealthUpdate = (data: SystemHealth) => {
      setSystemHealth(data);
    };

    const handleAgentStatus = (agent: AgentStatus) => {
      setAgents(prev => {
        const index = prev.findIndex(a => a.id === agent.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = agent;
          return updated;
        }
        return [...prev, agent];
      });
    };

    const handleAudioLevel = (data: { agentId: string; audioLevel: number }) => {
      setAgents(prev => prev.map(agent => 
        agent.id === data.agentId 
          ? { ...agent, audioLevel: data.audioLevel }
          : agent
      ));
    };

    const handlePerformanceMetrics = (data: { agentId: string; performance: any }) => {
      setAgents(prev => prev.map(agent => 
        agent.id === data.agentId 
          ? { ...agent, performance: data.performance, lastActivity: new Date() }
          : agent
      ));
    };

    // Register event listeners
    socket.on('dashboard:agent-status-update', handleAgentStatusUpdate);
    socket.on('dashboard:system-health-update', handleSystemHealthUpdate);
    socket.on('dashboard:agent-status', handleAgentStatus);
    socket.on('dashboard:agent-audio-level', handleAudioLevel);
    socket.on('dashboard:agent-performance-metrics', handlePerformanceMetrics);

    // Cleanup on unmount
    return () => {
      socket.off('dashboard:agent-status-update', handleAgentStatusUpdate);
      socket.off('dashboard:system-health-update', handleSystemHealthUpdate);
      socket.off('dashboard:agent-status', handleAgentStatus);
      socket.off('dashboard:agent-audio-level', handleAudioLevel);
      socket.off('dashboard:agent-performance-metrics', handlePerformanceMetrics);
    };
  }, [socket]);

  // Agent control functions
  const selectAgent = (agentId: string) => {
    setSelectedAgent(selectedAgent === agentId ? null : agentId);
  };

  const clearSelection = () => {
    setSelectedAgent(null);
  };

  return {
    agents,
    selectedAgent,
    systemHealth,
    loading,
    selectAgent,
    clearSelection,
    // Control functions for backend communication
    startAgent: (agentId: string) => {
      if (socket) {
        socket.emit('dashboard:agent-start', { agentId });
      }
    },
    stopAgent: (agentId: string) => {
      if (socket) {
        socket.emit('dashboard:agent-stop', { agentId });
      }
    },
    restartAgent: (agentId: string) => {
      if (socket) {
        socket.emit('dashboard:agent-restart', { agentId });
      }
    }
  };
}