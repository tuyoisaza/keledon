export interface Agent {
  id: string;
  name: string;
  type: 'ui-automation' | 'voice-analytics' | 'decision-engine' | 'orchestrator' | 'monitor';
  status: 'active' | 'idle' | 'busy' | 'offline' | 'error';
  capabilities: string[];
  priority: number;
  loadFactor: number;
  maxConcurrentTasks: number;
  currentTaskCount: number;
  health: AgentHealth;
  metadata: Record<string, any>;
}

export interface AgentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  uptime: number;
  resources: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export interface Task {
  id: string;
  type: string;
  priority: number;
  payload: Record<string, any>;
  requirements: TaskRequirements;
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  assignedAgentId?: string;
  result?: any;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

export interface TaskRequirements {
  capabilities: string[];
  minPriority: number;
  maxLoadFactor: number;
  estimatedDuration: number;
  dependencies: string[];
  resourceRequirements: {
    cpu?: number;
    memory?: number;
    network?: number;
  };
}

export interface AgentPool {
  id: string;
  name: string;
  agents: Agent[];
  taskQueue: Task[];
  priorityMode: 'fifo' | 'priority' | 'load_balanced';
  maxQueueSize: number;
  currentQueueSize: number;
}

export interface OrchestrationStrategy {
  name: string;
  description: string;
  selectAgent(task: Task, agents: Agent[]): Agent | null;
  onTaskComplete(task: Task, agent: Agent): void;
  onTaskFail(task: Task, agent: Agent, error: string): void;
  onAgentHealthChange(agentId: string): void;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: 'draft' | 'active' | 'paused' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  context: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  agentType: string;
  taskType: string;
  payload: Record<string, any>;
  dependencies: string[];
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  timeout: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
}