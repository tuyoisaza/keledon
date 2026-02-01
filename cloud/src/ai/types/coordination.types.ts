export enum CoordinationStrategy {
  COLLABORATIVE = 'collaborative',
  HIERARCHICAL = 'hierarchical',
  PEER_TO_PEER = 'peer-to-peer',
  CONFLICT_RESOLVER = 'conflict_resolver',
  LOAD_BALANCER = 'load_balancer'
}

export enum ConflictResolutionStrategy {
  VOTING = 'voting',
  SENIORITY = 'seniority',
  EXPERTISE = 'expertise',
  PERFORMANCE = 'performance',
  HYBRID = 'hybrid'
}

export enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_BUSY = 'least_busy',
  CAPABILITY_BASED = 'capability_based',
  PERFORMANCE_BASED = 'performance_based',
  PREDICTIVE = 'predictive'
}

export interface AgentStatus {
  id: string;
  type: string;
  status: 'active' | 'idle' | 'busy' | 'error' | 'offline';
  currentTask?: string;
  lastUpdated: Date;
  metrics: {
    successRate: number;
    averageResponseTime: number;
    tasksCompleted: number;
    currentLoad: number;
    maxCapacity: number;
  };
  configuration: {
    maxConcurrentTasks: number;
    timeoutDuration: number;
    retryAttempts: number;
    learningEnabled: boolean;
    specialization: string[];
  };
}

export interface Task {
  id: string;
  sessionId: string;
  type: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  assignedAgent?: string;
  dependencies: string[];
  parameters: Record<string, any>;
  createdAt: Date;
  scheduledFor?: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  metadata: {
    complexity: number;
    estimatedDuration: number;
    actualDuration?: number;
    quality: number;
    efficiency: number;
  };
}

export interface AgentCoordination {
  coordinationId: string;
  sessionId: string;
  primaryAgent: string;
  supportingAgents: string[];
  mode: CoordinationStrategy;
  conflictResolver: ConflictResolutionStrategy;
  loadBalancing: LoadBalancingStrategy;
  status: 'active' | 'idle' | 'resolving_conflicts';
  createdAt: Date;
  lastActivity: Date;
  metrics: {
    totalTasks: number;
    completedTasks: number;
    conflictsResolved: number;
    efficiency: number;
    averageTaskDuration: number;
  };
}

export interface CoordinationOptions {
  sessionId: string;
  agents: string[];
  strategy?: CoordinationStrategy;
  conflictResolver?: ConflictResolutionStrategy;
  loadBalancing?: LoadBalancingStrategy;
  enableLearning?: boolean;
  priorityWeights?: Record<string, number>;
}

export interface CoordinationResult {
  sessionId: string;
  agents: AgentExecution[];
  conversation: any;
  nextActions: RecommendedAction[];
  confidence: number;
  processingTime: number;
  success: boolean;
  metrics: CoordinationMetrics;
}

export interface CoordinationMetrics {
  totalAgents: number;
  activeAgents: number;
  tasksQueued: number;
  tasksCompleted: number;
  averageTaskDuration: number;
  systemEfficiency: number;
  conflictResolutionRate: number;
  loadDistribution: Record<string, number>;
}

export interface RecommendedAction {
  id: string;
  type: 'task_assignment' | 'conflict_resolution' | 'load_rebalancing' | 'performance_optimization' | 'escalation';
  description: string;
  agentId?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  parameters: Record<string, any>;
  estimatedDuration: number;
  confidence: number;
  reasoning: string;
}

export interface TaskExecution {
  agentId: string;
  agentType: string;
  taskId: string;
  taskType: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  result?: any;
  confidence: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface LearningEvent {
  id: string;
  agentId: string;
  agentType: string;
  type: 'success' | 'failure' | 'pattern' | 'adaptation' | 'optimization';
  description: string;
  data: any;
  confidence: number;
  timestamp: Date;
  feedback?: string;
  context: Record<string, any>;
}

export interface SystemLearning {
  patterns: LearningEvent[];
  adaptations: Adaptation[];
  insights: LearningInsights;
  lastUpdated: Date;
  modelVersion: string;
  performance: {
    overallAccuracy: number;
    responseTime: number;
    errorRate: number;
    taskSuccessRate: number;
  };
}

export interface LearningInsights {
  patterns: Pattern[];
  optimizations: Optimization[];
  errors: LearningError[];
  adaptations: Adaptation[];
  performanceImprovement: PerformanceImprovement;
  confidence: number;
  generatedAt: Date;
}

export interface Pattern {
  id: string;
  type: string;
  description: string;
  frequency: number;
  confidence: number;
  lastSeen: Date;
  context: Record<string, any>;
  recommendedAction: string;
}

export interface Optimization {
  id: string;
  type: string;
  description: string;
  impact: number;
  effort: number;
  confidence: number;
  results?: any;
  implemented: boolean;
}

export interface Adaptation {
  id: string;
  type: string;
  description: string;
  oldValue: any;
  newValue: any;
  reason: string;
  confidence: number;
  effectiveness: number;
}

export interface LearningError {
  id: string;
  error: string;
  frequency: number;
  lastOccurrence: Date;
  resolution?: string;
  prevention?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceImprovement {
  metric: string;
  oldValue: number;
  newValue: number;
  improvement: number;
  confidence: number;
  reason: string;
}