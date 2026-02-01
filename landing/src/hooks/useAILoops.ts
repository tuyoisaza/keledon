import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { useSocket } from '../context/SocketContext';

interface AgentStep {
  id: string;
  name: string;
  icon: string;
  status: 'idle' | 'active' | 'completed' | 'error';
  duration?: number;
  data?: any;
  error?: string;
}

interface AgentLoop {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  steps: AgentStep[];
  startTime?: Date;
  endTime?: Date;
  confidence?: number;
  result?: any;
}

export function useAILoops(socket?: Socket | null) {
  const { socket: contextSocket } = useSocket();
  const actualSocket = socket || contextSocket;
  
  const [loops, setLoops] = useState<AgentLoop[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoop, setSelectedLoop] = useState<string | null>(null);

  useEffect(() => {
    if (!actualSocket) {
      console.warn('useAILoops: No socket connection available');
      setLoading(false);
      return;
    }

    setLoading(true);

    // Request initial data
    actualSocket.emit('dashboard:get-ai-loops');

    // Listen for AI loop updates
    const handleAILoopsUpdate = (data: AgentLoop[]) => {
      setLoops(data);
      setLoading(false);
    };

    const handleAILoopUpdate = (loop: AgentLoop) => {
      setLoops(prev => {
        const index = prev.findIndex(l => l.id === loop.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = loop;
          return updated;
        }
        return [...prev, loop];
      });
    };

    const handleAILoopStep = (data: { loopId: string; step: AgentStep }) => {
      setLoops(prev => prev.map(loop => 
        loop.id === data.loopId 
          ? {
              ...loop,
              steps: loop.steps.map(s => 
                s.id === data.step.id ? data.step : s
              )
            }
          : loop
      ));
    };

    // Register event listeners
    actualSocket.on('dashboard:ai-loops-update', handleAILoopsUpdate);
    actualSocket.on('dashboard:ai-loop-update', handleAILoopUpdate);
    actualSocket.on('dashboard:ai-loop-step', handleAILoopStep);

    // Cleanup on unmount
    return () => {
      actualSocket.off('dashboard:ai-loops-update', handleAILoopsUpdate);
      actualSocket.off('dashboard:ai-loop-update', handleAILoopUpdate);
      actualSocket.off('dashboard:ai-loop-step', handleAILoopStep);
    };
  }, [actualSocket]);

  // Control functions
  const createLoop = (loopData?: Partial<AgentLoop>) => {
    if (actualSocket) {
      actualSocket.emit('dashboard:ai-loop-create', loopData);
    }
  };

  const startLoop = (loopId: string) => {
    if (actualSocket) {
      actualSocket.emit('dashboard:ai-loop-start', { loopId });
    }
  };

  const pauseLoop = (loopId: string) => {
    if (actualSocket) {
      actualSocket.emit('dashboard:ai-loop-pause', { loopId });
    }
  };

  const resetLoop = (loopId: string) => {
    if (actualSocket) {
      actualSocket.emit('dashboard:ai-loop-reset', { loopId });
    }
  };

  const deleteLoop = (loopId: string) => {
    if (actualSocket) {
      actualSocket.emit('dashboard:ai-loop-delete', { loopId });
    }
  };

  const selectLoop = (loopId: string) => {
    setSelectedLoop(selectedLoop === loopId ? null : loopId);
  };

  const clearSelection = () => {
    setSelectedLoop(null);
  };

  return {
    loops,
    selectedLoop,
    loading,
    selectLoop,
    clearSelection,
    createLoop,
    startLoop,
    pauseLoop,
    resetLoop,
    deleteLoop
  };
}