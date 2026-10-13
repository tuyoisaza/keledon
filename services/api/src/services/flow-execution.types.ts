export interface FlowExecution {
  id: string;
  name: string;
  description?: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  flowId?: string;
  sessionId?: string;
  agentId?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  currentStepIndex: number;
  totalSteps: number;
  progress: number; // 0-100
  steps: FlowStep[];
  performance: FlowPerformance;
  result?: FlowResult;
  error?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlowStep {
  id: string;
  name: string;
  type:
    | 'navigate'
    | 'input'
    | 'click'
    | 'wait'
    | 'extract'
    | 'validate'
    | 'conditional'
    | 'loop'
    | 'api'
    | 'script';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  description?: string;
  parameters?: Record<string, unknown>;
  expectedResult?: unknown;
  actualResult?: unknown;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  screenshot?: string;
  data?: unknown;
  retries: number;
  maxRetries: number;
}

export interface FlowPerformance {
  totalDuration: number;
  averageStepTime: number;
  successRate: number;
  errorRate: number;
  retriedSteps: number;
  fastestStep: string;
  slowestStep: string;
  resourceUsage?: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export interface FlowResult {
  success: boolean;
  action: string;
  data?: any;
  fields_filled?: string[];
  files_downloaded?: string[];
  forms_submitted?: string[];
  processes_automated?: string[];
  time_saved?: number; // minutes
  errors_avoided?: number;
}

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  steps: Omit<
    FlowStep,
    'status' | 'startTime' | 'endTime' | 'duration' | 'error' | 'retries'
  >[];
  estimatedDuration: number;
  complexity: 'simple' | 'moderate' | 'complex';
  tags: string[];
  author: string;
  createdAt: Date;
  updatedAt: Date;
}
