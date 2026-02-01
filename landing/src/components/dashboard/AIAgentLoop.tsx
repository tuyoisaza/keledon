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
import { useAILoops } from '../../hooks/useAILoops';

interface AgentStep {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
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
  const [loops, setLoops] = useState<AgentLoop[]>([]);
  const [selectedLoop, setSelectedLoop] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [autoRun, setAutoRun] = useState(true);

  const stepDefinitions = [
    { id: 'audio', name: 'Audio Capture', icon: Mic },
    { id: 'stt', name: 'Speech-to-Text', icon: MessageSquare },
    { id: 'ai', name: 'AI Processing', icon: Brain },
    { id: 'decision', name: 'Decision Engine', icon: Cpu },
    { id: 'rpa', name: 'RPA Execution', icon: Zap }
  ];

  const createNewLoop = (): AgentLoop => ({
    id: 'loop_' + Date.now(),
    name: `Agent Loop ${loops.length + 1}`,
    status: 'idle',
    steps: stepDefinitions.map(step => ({
      id: step.id,
      name: step.name,
      icon: step.icon,
      status: 'idle' as const
    }))
  });

  const runAgentLoop = async (loopId: string) => {
    setLoops(prev => prev.map(loop => 
      loop.id === loopId 
        ? { ...loop, status: 'running', startTime: new Date() }
        : loop
    ));

    const stepDelays = [1000, 2000, 1500, 1000, 2000]; // Simulate processing times
    
    for (let i = 0; i < stepDefinitions.length; i++) {
      const step = stepDefinitions[i];
      
      // Mark step as active
      setLoops(prev => prev.map(loop => 
        loop.id === loopId 
          ? {
              ...loop,
              steps: loop.steps.map(s => 
                s.id === step.id 
                  ? { ...s, status: 'active' as const }
                  : s
              )
            }
          : loop
      ));

      // Simulate step processing
      await new Promise(resolve => setTimeout(resolve, stepDelays[i]));
      
      // Random success/failure (90% success rate)
      const success = Math.random() > 0.1;
      const stepData = generateStepData(step.id);
      
      // Mark step as completed or failed
      setLoops(prev => prev.map(loop => 
        loop.id === loopId 
          ? {
              ...loop,
              steps: loop.steps.map(s => 
                s.id === step.id 
                  ? {
                      ...s,
                      status: success ? 'completed' as const : 'error' as const,
                      duration: stepDelays[i],
                      data: stepData,
                      error: success ? undefined : 'Random processing error occurred'
                    }
                  : s
              )
            }
          : loop
      ));

      // If a step fails, stop the loop
      if (!success) {
        setLoops(prev => prev.map(loop => 
          loop.id === loopId 
            ? { ...loop, status: 'error' as const, endTime: new Date() }
            : loop
        ));
        return;
      }
    }

    // Complete the loop
    setLoops(prev => prev.map(loop => 
      loop.id === loopId 
        ? { 
            ...loop, 
            status: 'completed' as const, 
            endTime: new Date(),
            confidence: Math.random() * 20 + 80, // 80-100% confidence
            result: {
              action: 'Customer order processed successfully',
              fields: ['Name', 'Email', 'Order ID'],
              confidence: 92
            }
          }
        : loop
    ));
  };

  const generateStepData = (stepId: string): any => {
    switch (stepId) {
      case 'audio':
        return {
          format: 'PCM',
          sampleRate: '16kHz',
          duration: '3.2s',
          quality: 'HD'
        };
      case 'stt':
        return {
          transcript: 'I would like to order a large pizza with pepperoni and mushrooms',
          confidence: 94,
          language: 'en-US'
        };
      case 'ai':
        return {
          intent: 'place_order',
          entities: { size: 'large', toppings: ['pepperoni', 'mushrooms'] },
          sentiment: 'positive'
        };
      case 'decision':
        return {
          action: 'fill_order_form',
          confidence: 92,
          reasoning: 'Intent matched order placement pattern'
        };
      case 'rpa':
        return {
          steps_executed: 5,
          fields_filled: 4,
          buttons_clicked: 2,
          success_rate: 100
        };
      default:
        return {};
    }
  };

  const resetLoop = (loopId: string) => {
    setLoops(prev => prev.map(loop => 
      loop.id === loopId 
        ? {
            ...loop,
            status: 'idle',
            steps: loop.steps.map(s => ({ ...s, status: 'idle' as const, data: undefined, error: undefined })),
            startTime: undefined,
            endTime: undefined,
            confidence: undefined,
            result: undefined
          }
        : loop
    ));
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

  // Auto-run demo
  useEffect(() => {
    if (!autoRun || isRunning) return;

    const interval = setInterval(async () => {
      const newLoop = createNewLoop();
      setLoops(prev => [...prev, newLoop]);
      setIsRunning(true);
      await runAgentLoop(newLoop.id);
      setIsRunning(false);
    }, 8000);

    return () => clearInterval(interval);
  }, [autoRun, isRunning, loops.length]);

  // Initialize with one loop
  useEffect(() => {
    if (loops.length === 0) {
      const initialLoop = createNewLoop();
      setLoops([initialLoop]);
    }
  }, []);

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
            onClick={() => setAutoRun(!autoRun)}
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-medium border transition-all",
              autoRun 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-muted text-muted-foreground border-border"
            )}
          >
            {autoRun ? 'Auto Demo' : 'Manual'}
          </button>
          <button
            onClick={() => {
              const newLoop = createNewLoop();
              setLoops(prev => [...prev, newLoop]);
            }}
            className="px-3 py-1 rounded-lg text-sm font-medium bg-primary text-primary-foreground border-primary"
          >
            Add Loop
          </button>
        </div>
      </div>

      {/* Loops Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loops.map((loop) => (
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
                    onClick={() => runAgentLoop(loop.id)}
                    className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                    title="Run Loop"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
                {loop.status === 'running' && (
                  <button
                    className="p-2 rounded-lg bg-yellow-500 text-white animate-pulse"
                    title="Running..."
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
                  onClick={() => setSelectedLoop(selectedLoop === loop.id ? null : loop.id)}
                  className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                  title="View Details"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Step Flow */}
            <div className="space-y-3">
              {loop.steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg border-2 transition-all",
                      getStepColor(step.status)
                    )}>
                      <Icon className="w-4 h-4" />
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
        ))}
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