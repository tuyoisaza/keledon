import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Mic, 
  Brain, 
  Cpu, 
  ArrowRight, 
  Play, 
  Pause, 
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  MessageSquare,
  Settings
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAILoops } from '../../hooks/useAILoops';

interface AgentStep {
  id: string;
  name: string;
  type: string;
  status: string;
  duration?: number;
  data?: any;
  error?: string;
}

interface AgentLoop {
  id: string;
  name: string;
  status: string;
  steps: AgentStep[];
  currentStepIndex: number;
  totalSteps: number;
  progress: number;
  performance: any;
  error?: string;
  confidence?: number;
}

export default function AIAgentLoop() {
  const { 
    loops, 
    selectedLoop, 
    loading,
    createLoop,
    startLoop,
    pauseLoop,
    resetLoop
  } = useAILoops();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
      case 'running': return 'text-blue-500 bg-blue-500/10 border-blue-500/20 animate-pulse';
      case 'completed': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'failed': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle': return <Clock className="w-4 h-4" />;
      case 'running': return <Brain className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="ml-3 text-muted-foreground">Loading AI loops...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">AI Intelligence Loop</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={createLoop}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            Create New Loop
          </button>
        </div>
      </div>

      {/* Loops Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loops.map((loop) => (
          <div key={loop.id} className="p-6 rounded-xl bg-card border border-border">
            {/* Loop Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-foreground">{loop.name}</h3>
                <p className="text-xs text-muted-foreground">{loop.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs border uppercase flex items-center gap-1",
                  getStatusColor(loop.status)
                )}>
                  {getStatusIcon(loop.status)}
                  <span>{loop.status}</span>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">
                  Step {loop.currentStepIndex + 1} of {loop.totalSteps}
                </span>
                <div className="text-sm font-medium">{Math.round(loop.progress || 0)}%</div>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${loop.progress || 0}%` }}
                />
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {loop.steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-lg border-2 flex items-center justify-center",
                    index < loop.currentStepIndex ? "border-gray-300 bg-gray-50" : 
                    index === loop.currentStepIndex ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50",
                    step.status === 'completed' ? "bg-green-50" : "",
                    step.status === 'failed' ? "bg-red-50" : ""
                  )}>
                    <span className="text-sm font-medium">{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground">{step.name}</h4>
                    <p className="text-xs text-muted-foreground">{step.type}</p>
                    {step.status === 'completed' && (
                      <div className="text-xs text-green-600">✓ {step.data || 'Completed'}</div>
                    )}
                    {step.status === 'failed' && (
                      <div className="text-xs text-red-600">✗ {step.error || 'Failed'}</div>
                    )}
                  </div>
                  {index < loop.steps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => startLoop(loop.id)}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                disabled={loop.status === 'running'}
              >
                Start
              </button>
              <button
                onClick={() => pauseLoop(loop.id)}
                className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                disabled={loop.status !== 'running'}
              >
                Pause
              </button>
              <button
                onClick={() => resetLoop(loop.id)}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                Reset
              </button>
            </div>

            {/* Confidence */}
            {loop.confidence && (
              <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700">
                    Confidence: {loop.confidence.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {/* Error */}
            {loop.error && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">
                    Error: {loop.error}
                  </span>
                </div>
              </div>
            )}

            {/* Performance */}
            {loop.performance && (
              <div className="mt-4 p-3 rounded-lg border border-border">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Avg Step Time</span>
                    <div className="font-mono">{loop.performance.avgStepTime || 0}ms</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Success Rate</span>
                    <div className="font-mono">{loop.performance.successRate || 0}%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Duration</span>
                    <div className="font-mono">{loop.performance.totalDuration || 0}ms</div>
                  </div>
                </div>
              </div>
            )}

            {/* Selected highlight */}
            {selectedLoop === loop.id && (
              <div className="ring-2 ring-primary ring-offset-2 rounded-lg">
                <div className="text-xs text-primary">Selected Loop</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}