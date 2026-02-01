import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { useSocket } from '../context/SocketContext';

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

export function useAgentStatus(socket?: Socket | null) {
  const { socket: contextSocket } = useSocket();
  const actualSocket = socket || contextSocket;
  
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
    if (!actualSocket) {
      console.warn('useAgentStatus: No socket connection available');
      setLoading(false);
      return;
    }

    setLoading(true);

    // Request initial data
    actualSocket.emit('dashboard:get-agent-status');
    actualSocket.emit('dashboard:get-system-health');

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
    actualSocket.on('dashboard:agent-status-update', handleAgentStatusUpdate);
    actualSocket.on('dashboard:system-health-update', handleSystemHealthUpdate);
    actualSocket.on('dashboard:agent-status', handleAgentStatus);
    actualSocket.on('dashboard:agent-audio-level', handleAudioLevel);
    actualSocket.on('dashboard:agent-performance-metrics', handlePerformanceMetrics);

    // Cleanup on unmount
    return () => {
      actualSocket.off('dashboard:agent-status-update', handleAgentStatusUpdate);
      actualSocket.off('dashboard:system-health-update', handleSystemHealthUpdate);
      actualSocket.off('dashboard:agent-status', handleAgentStatus);
      actualSocket.off('dashboard:agent-audio-level', handleAudioLevel);
      actualSocket.off('dashboard:agent-performance-metrics', handlePerformanceMetrics);
    };
  }, [actualSocket]);

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
      if (actualSocket) {
        actualSocket.emit('dashboard:agent-start', { agentId });
      }
    },
    stopAgent: (agentId: string) => {
      if (actualSocket) {
        actualSocket.emit('dashboard:agent-stop', { agentId });
      }
    },
    restartAgent: (agentId: string) => {
      if (actualSocket) {
        actualSocket.emit('dashboard:agent-restart', { agentId });
      }
    }
  };
}