import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { useSocket } from '../context/SocketContext';

interface FlowStep {
  id: string;
  name: string;
  type: 'navigate' | 'click' | 'fill' | 'extract' | 'wait' | 'screenshot' | 'search';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  selector?: string;
  value?: string;
  result?: any;
  duration?: number;
  error?: string;
  metadata?: {
    element_text?: string;
    element_position?: { x: number; y: number };
    screenshot_url?: string;
    extracted_data?: any;
  };
}

interface FlowExecution {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  steps: FlowStep[];
  startTime?: Date;
  endTime?: Date;
  currentStepIndex: number;
  totalSteps: number;
  progress: number;
  performance: {
    totalDuration: number;
    averageStepTime: number;
    successRate: number;
    errorRate: number;
  };
}

export function useFlowExecution(socket?: Socket | null) {
  const { socket: contextSocket } = useSocket();
  const actualSocket = socket || contextSocket;
  
  const [executions, setExecutions] = useState<FlowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);

  useEffect(() => {
    if (!actualSocket) {
      console.warn('useFlowExecution: No socket connection available');
      setLoading(false);
      return;
    }

    setLoading(true);

    // Request initial data
    actualSocket.emit('dashboard:get-flow-executions');

    // Listen for flow execution updates
    const handleFlowExecutionsUpdate = (data: FlowExecution[]) => {
      setExecutions(data);
      setLoading(false);
    };

    const handleFlowExecutionUpdate = (execution: FlowExecution) => {
      setExecutions(prev => {
        const index = prev.findIndex(e => e.id === execution.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = execution;
          return updated;
        }
        return [...prev, execution];
      });
    };

    const handleFlowStepUpdate = (data: { executionId: string; step: FlowStep; stepIndex: number }) => {
      setExecutions(prev => prev.map(execution => 
        execution.id === data.executionId 
          ? {
              ...execution,
              steps: execution.steps.map((s, i) => 
                i === data.stepIndex ? data.step : s
              ),
              currentStepIndex: data.stepIndex,
              progress: ((data.stepIndex + 1) / execution.totalSteps) * 100
            }
          : execution
      ));
    };

    const handleFlowProgress = (data: { executionId: string; progress: number; currentStepIndex: number }) => {
      setExecutions(prev => prev.map(execution => 
        execution.id === data.executionId 
          ? {
              ...execution,
              progress: data.progress,
              currentStepIndex: data.currentStepIndex
            }
          : execution
      ));
    };

    // Register event listeners
    actualSocket.on('dashboard:flow-executions-update', handleFlowExecutionsUpdate);
    actualSocket.on('dashboard:flow-execution-update', handleFlowExecutionUpdate);
    actualSocket.on('dashboard:flow-step-update', handleFlowStepUpdate);
    actualSocket.on('dashboard:flow-progress', handleFlowProgress);

    // Cleanup on unmount
    return () => {
      actualSocket.off('dashboard:flow-executions-update', handleFlowExecutionsUpdate);
      actualSocket.off('dashboard:flow-execution-update', handleFlowExecutionUpdate);
      actualSocket.off('dashboard:flow-step-update', handleFlowStepUpdate);
      actualSocket.off('dashboard:flow-progress', handleFlowProgress);
    };
  }, [actualSocket]);

  // Control functions
  const createExecution = (flowData?: Partial<FlowExecution>) => {
    if (actualSocket) {
      actualSocket.emit('dashboard:flow-create', flowData);
    }
  };

  const startExecution = (executionId: string) => {
    if (actualSocket) {
      actualSocket.emit('dashboard:flow-start', { executionId });
    }
  };

  const pauseExecution = (executionId: string) => {
    if (actualSocket) {
      actualSocket.emit('dashboard:flow-pause', { executionId });
    }
  };

  const stopExecution = (executionId: string) => {
    if (actualSocket) {
      actualSocket.emit('dashboard:flow-stop', { executionId });
    }
  };

  const resetExecution = (executionId: string) => {
    if (actualSocket) {
      actualSocket.emit('dashboard:flow-reset', { executionId });
    }
  };

  const deleteExecution = (executionId: string) => {
    if (actualSocket) {
      actualSocket.emit('dashboard:flow-delete', { executionId });
    }
  };

  const selectExecution = (executionId: string) => {
    setSelectedExecution(selectedExecution === executionId ? null : executionId);
  };

  const clearSelection = () => {
    setSelectedExecution(null);
  };

  return {
    executions,
    selectedExecution,
    loading,
    selectExecution,
    clearSelection,
    createExecution,
    startExecution,
    pauseExecution,
    stopExecution,
    resetExecution,
    deleteExecution
  };
}