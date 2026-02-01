import React from 'react';
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
  Radio,
  MessageSquare,
  Play,
  RotateCcw,
  ArrowRight,
  Settings,
  XCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAILoops } from '../../hooks/useAILoops';

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

interface AIAgentLoopProps {
  className?: string;
}

export default function AIAgentLoop({ className }: AIAgentLoopProps) {
  const { 
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
  } = useAILoops();

  const stepDefinitions = [
    { id: 'audio', name: 'Audio Capture', icon: Mic },
    { id: 'stt', name: 'Speech-to-Text', icon: MessageSquare },
    { id: 'ai', name: 'AI Processing', icon: Brain },
    { id: 'decision', name: 'Decision Engine', icon: Cpu },
    { id: 'rpa', name: 'RPA Execution', icon: Zap }
  ];

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Mic': return Mic;
      case 'MessageSquare': return MessageSquare;
      case 'Brain': return Brain;
      case 'Cpu': return Cpu;
      case 'Zap': return Zap;
      default: return Activity;
    }
  };

  const getStepColor = (status: AgentStep['status']) => {
    switch (status) {
      case 'idle': return 'text-gray-500 border-gray-200';
      case 'active': return 'text-blue-500 border-blue-200 bg-blue-50 animate-pulse';
      case 'completed': return 'text-green-500 border-green-200 bg-green-50';
      case 'error': return 'text-red-500 border-red-200 bg-red-50';
      default: return 'text-gray-500 border-gray-200';
    }
  };

  const getLoopStatusColor = (status: AgentLoop['status']) => {
    switch (status) {
      case 'idle': return 'text-gray-500 bg-gray-100';
      case 'running': return 'text-blue-500 bg-blue-100';
      case 'completed': return 'text-green-500 bg-green-100';
      case 'error': return 'text-red-500 bg-red-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const handleCreateLoop = () => {
    const newLoop = {
      name: `Agent Loop ${loops.length + 1}`,
      status: 'idle' as const,
      steps: stepDefinitions.map(step => ({
        id: step.id,
        name: step.name,
        icon: step.id,
        status: 'idle' as const
      }))
    };
    createLoop(newLoop);
  };

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary animate-pulse" />
          <h2 className="text-xl font-semibold">AI Agent Intelligence Loop</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Activity className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Loading AI Loops...</p>
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
          <Activity className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">AI Agent Intelligence Loop</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateLoop}
            className="px-3 py-1 rounded-lg text-sm font-medium bg-primary text-primary-foreground border-primary"
          >
            Create Loop
          </button>
        </div>
      </div>

      {/* Loops Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loops.length === 0 ? (
          <div className="col-span-full p-8 text-center border-2 border-dashed border-border rounded-lg">
            <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No AI Loops Found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first AI agent loop to start monitoring intelligent automation workflows.
            </p>
            <button
              onClick={handleCreateLoop}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Create First Loop
            </button>
          </div>
        ) : (
          loops.map((loop) => (
            <div key={loop.id} className="p-4 rounded-lg border bg-card">
              {/* Loop Header */}
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">{loop.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      getLoopStatusColor(loop.status)
                    )}>
                      {loop.status.toUpperCase()}
                    </span>
                    {loop.confidence && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(loop.confidence)}% confidence
                      </span>
                    )}
                    {loop.startTime && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round((loop.endTime?.getTime() || Date.now()) - loop.startTime.getTime())}ms
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {loop.status === 'idle' && (
                    <button
                      onClick={() => startLoop(loop.id)}
                      className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                      title="Run Loop"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  {loop.status === 'running' && (
                    <button
                      onClick={() => pauseLoop(loop.id)}
                      className="p-2 rounded-lg bg-yellow-500 text-white animate-pulse"
                      title="Pause Loop"
                    >
                      <Activity className="w-4 h-4" />
                    </button>
                  )}
                  {(loop.status === 'completed' || loop.status === 'error') && (
                    <button
                      onClick={() => resetLoop(loop.id)}
                      className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                      title="Reset Loop"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => selectLoop(loop.id)}
                    className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                    title="View Details"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteLoop(loop.id)}
                    className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                    title="Delete Loop"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Step Flow */}
              <div className="space-y-3">
                {loop.steps.map((step, index) => {
                  const IconComponent = getIconComponent(step.icon);
                  return (
                    <div key={step.id} className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg border-2 transition-all",
                        getStepColor(step.status)
                      )}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{step.name}</span>
                          {step.status === 'completed' && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          {step.status === 'error' && (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          {step.status === 'active' && (
                            <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
                          )}
                        </div>
                        
                        {step.data && (
                          <div className="mt-1 p-2 rounded bg-muted text-xs">
                            {step.data.transcript && (
                              <div>"{step.data.transcript}"</div>
                            )}
                            {step.data.intent && (
                              <div>Intent: {step.data.intent}</div>
                            )}
                            {step.data.confidence && (
                              <div>Confidence: {step.data.confidence}%</div>
                            )}
                            {step.data.steps_executed && (
                              <div>Steps: {step.data.steps_executed} completed</div>
                            )}
                          </div>
                        )}
                        
                        {step.error && (
                          <div className="mt-1 p-2 rounded bg-red-100 text-red-700 text-xs">
                            {step.error}
                          </div>
                        )}
                      </div>

                      {index < loop.steps.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Result */}
              {loop.result && (
                <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-green-700">Loop Completed Successfully</span>
                  </div>
                  <div className="text-sm text-green-600">
                    {loop.result.action}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Selected Loop Details */}
      {selectedLoop && (
        <div className="p-4 rounded-lg border bg-card">
          <h3 className="font-semibold mb-3">Loop Details: {loops.find(l => l.id === selectedLoop)?.name}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status:</span>
              <p className="font-semibold">{loops.find(l => l.id === selectedLoop)?.status}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Start Time:</span>
              <p>{loops.find(l => l.id === selectedLoop)?.startTime?.toLocaleTimeString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Duration:</span>
              <p>
                {(() => {
                  const loop = loops.find(l => l.id === selectedLoop);
                  return loop?.startTime && loop?.endTime 
                    ? `${Math.round(loop.endTime.getTime() - loop.startTime.getTime())}ms`
                    : 'N/A';
                })()}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Confidence:</span>
              <p>{loops.find(l => l.id === selectedLoop)?.confidence?.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}