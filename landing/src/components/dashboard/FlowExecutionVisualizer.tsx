import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap,
  ArrowRight,
  Code,
  MousePointer,
  Type,
  Link,
  Camera,
  Search
} from 'lucide-react';
import { cn } from '../../lib/utils';

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
    avgStepTime: number;
    successRate: number;
    totalDuration: number;
  };
  error?: string;
}

interface FlowVisualizerProps {
  className?: string;
}

export default function FlowExecutionVisualizer({ className }: FlowVisualizerProps) {
  const [executions, setExecutions] = useState<FlowExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [autoExecute, setAutoExecute] = useState(true);
  const [showDetails, setShowDetails] = useState(true);

  const stepIcons = {
    navigate: Link,
    click: MousePointer,
    fill: Type,
    extract: Code,
    wait: Clock,
    screenshot: Camera,
    search: Search
  };

  const createMockExecution = (): FlowExecution => {
    const steps: FlowStep[] = [
      {
        id: 'step-1',
        name: 'Navigate to Website',
        type: 'navigate',
        status: 'pending',
        selector: 'https://example.com',
        value: 'https://example.com'
      },
      {
        id: 'step-2',
        name: 'Click Login Button',
        type: 'click',
        status: 'pending',
        selector: '#login-btn',
        metadata: {
          element_text: 'Login',
          element_position: { x: 250, y: 150 }
        }
      },
      {
        id: 'step-3',
        name: 'Fill Email Field',
        type: 'fill',
        status: 'pending',
        selector: '#email',
        value: 'user@example.com',
        metadata: {
          element_text: 'Enter your email'
        }
      },
      {
        id: 'step-4',
        name: 'Fill Password Field',
        type: 'fill',
        status: 'pending',
        selector: '#password',
        value: '••••••••',
        metadata: {
          element_text: 'Enter password'
        }
      },
      {
        id: 'step-5',
        name: 'Submit Form',
        type: 'click',
        status: 'pending',
        selector: '#submit',
        metadata: {
          element_text: 'Sign In',
          element_position: { x: 300, y: 400 }
        }
      },
      {
        id: 'step-6',
        name: 'Verify Login Success',
        type: 'extract',
        status: 'pending',
        selector: '.welcome-message',
        metadata: {
          element_text: 'Welcome back!'
        }
      }
    ];

    return {
      id: 'exec_' + Date.now(),
      name: `Login Flow ${executions.length + 1}`,
      status: 'idle',
      steps,
      currentStepIndex: 0,
      totalSteps: steps.length,
      progress: 0,
      performance: {
        avgStepTime: 0,
        successRate: 0,
        totalDuration: 0
      }
    };
  };

  const executeFlow = async (executionId: string) => {
    const execution = executions.find(e => e.id === executionId);
    if (!execution) return;

    setExecutions(prev => prev.map(e => 
      e.id === executionId 
        ? { ...e, status: 'running', startTime: new Date() }
        : e
    ));

    const stepDelays = [1500, 800, 600, 600, 800, 1000];
    let successCount = 0;
    const startTime = Date.now();

    for (let i = 0; i < execution.steps.length; i++) {
      const step = execution.steps[i];
      
      // Update current step
      setExecutions(prev => prev.map(e => 
        e.id === executionId 
          ? { 
              ...e, 
              currentStepIndex: i,
              progress: (i / e.totalSteps) * 100,
              steps: e.steps.map((s, idx) => 
                idx === i 
                  ? { ...s, status: 'running' as const }
                  : idx < i 
                  ? { ...s, status: 'completed' as const }
                  : s
              )
            }
          : e
      ));

      // Simulate step execution
      await new Promise(resolve => setTimeout(resolve, stepDelays[i]));
      
      // Random success/failure (85% success rate)
      const success = Math.random() > 0.15;
      const stepResult = generateStepResult(step);
      
      if (success) {
        successCount++;
        setExecutions(prev => prev.map(e => 
          e.id === executionId 
            ? {
                ...e,
                steps: e.steps.map((s, idx) => 
                  idx === i 
                    ? { 
                        ...s, 
                        status: 'completed' as const,
                        result: stepResult,
                        duration: stepDelays[i]
                      }
                    : s
                )
              }
            : e
        ));
      } else {
        // Step failed
        setExecutions(prev => prev.map(e => 
          e.id === executionId 
            ? {
                ...e,
                status: 'failed' as const,
                endTime: new Date(),
                steps: e.steps.map((s, idx) => 
                  idx === i 
                    ? { 
                        ...s, 
                        status: 'failed' as const,
                        error: 'Element not found or interaction failed',
                        duration: stepDelays[i]
                      }
                    : s
                ),
                performance: {
                  avgStepTime: (Date.now() - startTime) / (i + 1),
                  successRate: (successCount / (i + 1)) * 100,
                  totalDuration: Date.now() - startTime
                },
                error: 'Flow execution failed at step ' + (i + 1)
              }
            : e
        ));
        return;
      }
    }

    // Complete successfully
    const totalDuration = Date.now() - startTime;
    setExecutions(prev => prev.map(e => 
      e.id === executionId 
        ? {
            ...e,
            status: 'completed' as const,
            endTime: new Date(),
            currentStepIndex: execution.totalSteps,
            progress: 100,
            performance: {
              avgStepTime: totalDuration / execution.totalSteps,
              successRate: (successCount / execution.totalSteps) * 100,
              totalDuration
            }
          }
        : e
    ));
  };

  const generateStepResult = (step: FlowStep): any => {
    switch (step.type) {
      case 'navigate':
        return { url: step.value, loaded: true, title: 'Example Website' };
      case 'click':
        return { clicked: true, element: step.selector, coordinates: { x: 250, y: 150 } };
      case 'fill':
        return { filled: true, element: step.selector, value: step.value };
      case 'extract':
        return { 
          text: 'Welcome back! User successfully logged in.',
          element: step.selector,
          success: true
        };
      case 'screenshot':
        return { 
          screenshot_url: '/screenshots/step_' + Date.now() + '.png',
          dimensions: { width: 1920, height: 1080 }
        };
      case 'search':
        return { 
          found: true, 
          count: Math.floor(Math.random() * 10) + 1,
          elements: ['button', 'input', 'div']
        };
      default:
        return { success: true };
    }
  };

  const pauseExecution = (executionId: string) => {
    setExecutions(prev => prev.map(e => 
      e.id === executionId 
        ? { ...e, status: 'paused' }
        : e
    ));
  };

  const resetExecution = (executionId: string) => {
    setExecutions(prev => prev.map(e => 
      e.id === executionId 
        ? {
            ...e,
            status: 'idle',
            currentStepIndex: 0,
            progress: 0,
            steps: e.steps.map(s => ({ 
              ...s, 
              status: 'pending' as const, 
              result: undefined, 
              error: undefined, 
              duration: undefined 
            })),
            startTime: undefined,
            endTime: undefined,
            performance: {
              avgStepTime: 0,
              successRate: 0,
              totalDuration: 0
            },
            error: undefined
          }
        : e
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'text-gray-500 bg-gray-100';
      case 'running': return 'text-blue-500 bg-blue-100';
      case 'completed': return 'text-green-500 bg-green-100';
      case 'failed': return 'text-red-500 bg-red-100';
      case 'paused': return 'text-yellow-500 bg-yellow-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'border-gray-300 text-gray-500';
      case 'running': return 'border-blue-500 text-blue-500 bg-blue-50 animate-pulse';
      case 'completed': return 'border-green-500 text-green-500 bg-green-50';
      case 'failed': return 'border-red-500 text-red-500 bg-red-50';
      case 'skipped': return 'border-yellow-500 text-yellow-500 bg-yellow-50';
      default: return 'border-gray-300 text-gray-500';
    }
  };

  // Auto-execute demo
  useEffect(() => {
    if (!autoExecute) return;

    const interval = setInterval(() => {
      const newExecution = createMockExecution();
      setExecutions(prev => [...prev, newExecution]);
      setTimeout(() => executeFlow(newExecution.id), 500);
    }, 12000);

    return () => clearInterval(interval);
  }, [autoExecute, executions.length]);

  // Initialize with one execution
  useEffect(() => {
    if (executions.length === 0) {
      const initialExecution = createMockExecution();
      setExecutions([initialExecution]);
    }
  }, []);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Flow Execution Visualizer</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-medium border transition-all",
              showDetails 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-muted text-muted-foreground border-border"
            )}
          >
            {showDetails ? 'Detailed' : 'Simple'}
          </button>
          <button
            onClick={() => setAutoExecute(!autoExecute)}
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-medium border transition-all",
              autoExecute 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-muted text-muted-foreground border-border"
            )}
          >
            Auto Demo
          </button>
          <button
            onClick={() => setExecutions([...executions, createMockExecution()])}
            className="px-3 py-1 rounded-lg text-sm font-medium bg-primary text-primary-foreground"
          >
            New Flow
          </button>
        </div>
      </div>

      {/* Executions Grid */}
      <div className="space-y-4">
        {executions.map((execution) => (
          <div key={execution.id} className="p-4 rounded-lg border bg-card">
            {/* Execution Header */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-semibold text-foreground">{execution.name}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    getStatusColor(execution.status)
                  )}>
                    {execution.status.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Step {execution.currentStepIndex} / {execution.totalSteps}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {Math.round(execution.progress)}% complete
                  </div>
                  {execution.performance.successRate > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {Math.round(execution.performance.successRate)}% success
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {execution.status === 'idle' && (
                  <button
                    onClick={() => executeFlow(execution.id)}
                    className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                    title="Start Execution"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
                {execution.status === 'running' && (
                  <button
                    onClick={() => pauseExecution(execution.id)}
                    className="p-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
                    title="Pause"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                )}
                {execution.status === 'paused' && (
                  <button
                    onClick={() => executeFlow(execution.id)}
                    className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                    title="Resume"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
                {(execution.status === 'completed' || execution.status === 'failed') && (
                  <button
                    onClick={() => resetExecution(execution.id)}
                    className="p-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition-colors"
                    title="Reset"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedExecution(selectedExecution === execution.id ? null : execution.id)}
                  className={cn(
                    "p-2 rounded-lg border transition-colors",
                    selectedExecution === execution.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-muted"
                  )}
                  title="View Details"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500",
                    execution.status === 'failed' ? "bg-red-500" :
                    execution.status === 'completed' ? "bg-green-500" :
                    execution.status === 'running' ? "bg-blue-500" : "bg-gray-300"
                  )}
                  style={{ width: `${execution.progress}%` }}
                />
              </div>
            </div>

            {/* Steps Flow */}
            <div className="space-y-2">
              {execution.steps.map((step, index) => {
                const Icon = stepIcons[step.type];
                return (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg border-2 transition-all flex-shrink-0",
                      getStepStatusColor(step.status)
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate">{step.name}</span>
                          {showDetails && step.selector && (
                            <div className="text-xs text-muted-foreground truncate">
                              Target: {step.selector}
                            </div>
                          )}
                          {step.value && (
                            <div className="text-xs text-muted-foreground">
                              Value: {step.type === 'fill' ? '••••••••' : step.value}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {step.status === 'completed' && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          {step.status === 'failed' && (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          {step.status === 'running' && (
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          )}
                          {step.duration && (
                            <span className="text-xs text-muted-foreground">
                              {step.duration}ms
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {showDetails && step.result && (
                        <div className="mt-1 p-2 rounded bg-muted text-xs">
                          <div className="font-medium">Result:</div>
                          {step.result.url && <div>URL: {step.result.url}</div>}
                          {step.result.clicked && <div>✓ Element clicked</div>}
                          {step.result.filled && <div>✓ Field populated</div>}
                          {step.result.text && <div>Text: "{step.result.text}"</div>}
                          {step.result.found && <div>Found {step.result.count} elements</div>}
                        </div>
                      )}
                      
                      {step.error && (
                        <div className="mt-1 p-2 rounded bg-red-50 text-red-700 text-xs">
                          Error: {step.error}
                        </div>
                      )}
                    </div>

                    {index < execution.steps.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Execution Summary */}
            {execution.status !== 'idle' && execution.status !== 'running' && (
              <div className="mt-4 p-3 rounded-lg bg-muted border">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <p className="font-medium">{execution.performance.totalDuration}ms</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Step Time:</span>
                    <p className="font-medium">{Math.round(execution.performance.avgStepTime)}ms</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Success Rate:</span>
                    <p className="font-medium">{Math.round(execution.performance.successRate)}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p className="font-medium capitalize">{execution.status}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}