import React from 'react';
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
  Search,
  Settings,
  Activity
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFlowExecution } from '../../hooks/useFlowExecution';

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

interface FlowVisualizerProps {
  className?: string;
}

export default function FlowExecutionVisualizer({ className }: FlowVisualizerProps) {
  const { 
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
  } = useFlowExecution();

  const [showDetails, setShowDetails] = React.useState(true);

  const stepIcons = {
    navigate: Link,
    click: MousePointer,
    fill: Type,
    extract: Code,
    wait: Clock,
    screenshot: Camera,
    search: Search
  };

  const getStepColor = (status: FlowStep['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-500 bg-gray-50 border-gray-200';
      case 'running': return 'text-blue-500 bg-blue-50 border-blue-200 animate-pulse';
      case 'completed': return 'text-green-500 bg-green-50 border-green-200';
      case 'failed': return 'text-red-500 bg-red-50 border-red-200';
      case 'skipped': return 'text-yellow-500 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: FlowExecution['status']) => {
    switch (status) {
      case 'running': return <Activity className="w-4 h-4 animate-pulse" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleCreateExecution = () => {
    const newExecution = {
      name: `Flow Execution ${executions.length + 1}`,
      status: 'idle' as const,
      steps: [],
      currentStepIndex: 0,
      totalSteps: 0,
      progress: 0,
      performance: {
        totalDuration: 0,
        averageStepTime: 0,
        successRate: 0,
        errorRate: 0
      }
    };
    createExecution(newExecution);
  };

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-primary animate-pulse" />
          <h2 className="text-xl font-semibold">Flow Execution Visualizer</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Zap className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Loading Flow Executions...</p>
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
            onClick={handleCreateExecution}
            className="px-3 py-1 rounded-lg text-sm font-medium bg-primary text-primary-foreground border-primary"
          >
            Create Flow
          </button>
        </div>
      </div>

      {/* Executions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {executions.length === 0 ? (
          <div className="col-span-full p-8 text-center border-2 border-dashed border-border rounded-lg">
            <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Flow Executions Found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first flow execution to start monitoring RPA automation workflows.
            </p>
            <button
              onClick={handleCreateExecution}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Create First Flow
            </button>
          </div>
        ) : (
          executions.map((execution) => (
            <div key={execution.id} className="p-4 rounded-lg border bg-card">
              {/* Execution Header */}
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">{execution.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      execution.status === 'running' && "text-blue-500 bg-blue-100",
                      execution.status === 'completed' && "text-green-500 bg-green-100",
                      execution.status === 'failed' && "text-red-500 bg-red-100",
                      execution.status === 'paused' && "text-yellow-500 bg-yellow-100",
                      execution.status === 'idle' && "text-gray-500 bg-gray-100"
                    )}>
                      {execution.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {execution.currentStepIndex} / {execution.totalSteps} steps
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(execution.progress)}% complete
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {execution.status === 'idle' && (
                    <button
                      onClick={() => startExecution(execution.id)}
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
                      title="Pause Execution"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  )}
                  {execution.status === 'paused' && (
                    <button
                      onClick={() => startExecution(execution.id)}
                      className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                      title="Resume Execution"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  {execution.status === 'running' && (
                    <button
                      onClick={() => stopExecution(execution.id)}
                      className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                      title="Stop Execution"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => resetExecution(execution.id)}
                    className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                    title="Reset Execution"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => selectExecution(execution.id)}
                    className="p-2 rounded-lg border border-border hover:bg-muted transition-colors"
                    title="View Details"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteExecution(execution.id)}
                    className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                    title="Delete Execution"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>Progress</span>
                  <span>{Math.round(execution.progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      execution.status === 'failed' ? "bg-red-500" :
                      execution.status === 'completed' ? "bg-green-500" :
                      execution.status === 'running' ? "bg-blue-500" :
                      "bg-gray-500"
                    )}
                    style={{ width: `${execution.progress}%` }}
                  />
                </div>
              </div>

              {/* Steps */}
              {showDetails && execution.steps.length > 0 && (
                <div className="space-y-2 mb-4">
                  {execution.steps.slice(0, 5).map((step, index) => {
                    const Icon = stepIcons[step.type];
                    return (
                      <div key={step.id} className="flex items-center gap-2 text-sm">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="flex-1">{step.name}</span>
                        {getStatusIcon(step.status as any)}
                        {step.duration && (
                          <span className="text-xs text-muted-foreground">
                            {step.duration}ms
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {execution.steps.length > 5 && (
                    <div className="text-xs text-muted-foreground text-center">
                      ... and {execution.steps.length - 5} more steps
                    </div>
                  )}
                </div>
              )}

              {/* Performance Metrics */}
              {showDetails && (
                <div className="grid grid-cols-3 gap-4 text-sm border-t pt-3">
                  <div>
                    <span className="text-muted-foreground">Total:</span>
                    <p className="font-semibold">{execution.performance.totalDuration}ms</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Step:</span>
                    <p className="font-semibold">{Math.round(execution.performance.averageStepTime)}ms</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Success:</span>
                    <p className="font-semibold">{Math.round(execution.performance.successRate)}%</p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Selected Execution Details */}
      {selectedExecution && (
        <div className="p-4 rounded-lg border bg-card">
          <h3 className="font-semibold mb-3">Execution Details: {executions.find(e => e.id === selectedExecution)?.name}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status:</span>
              <p className="font-semibold">{executions.find(e => e.id === selectedExecution)?.status}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Progress:</span>
              <p>{Math.round(executions.find(e => e.id === selectedExecution)?.progress || 0)}%</p>
            </div>
            <div>
              <span className="text-muted-foreground">Steps:</span>
              <p>{executions.find(e => e.id === selectedExecution)?.currentStepIndex} / {executions.find(e => e.id === selectedExecution)?.totalSteps}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Duration:</span>
              <p>{executions.find(e => e.id === selectedExecution)?.performance.totalDuration}ms</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}