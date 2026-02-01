export enum AgentType {
  ORCHESTRATOR = 'orchestrator',
  TTS_AGENT = 'tts-agent',
  STT_AGENT = 'stt-agent',
  VISION_AGENT = 'vision-agent',
  RPA_AGENT = 'rpa-agent',
  COORDINATOR = 'coordinator',
  ANALYTICS_AGENT = 'analytics-agent'
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface ConversationContext {
  sessionId: string;
  userId?: string;
  history: DialogueTurn[];
  entities: Record<string, any>;
  intents: UserIntent[];
  preferences: UserPreferences;
  memory: SemanticMemory[];
  lastUpdated: Date;
  contextScore: number;             // Relevance score for context
}

export interface DialogueTurn {
  id: string;
  sessionId: string;
  userInput: string;
  systemResponse: string;
  intent: UserIntent;
  entities: Record<string, any>;
  confidence: number;
  timestamp: Date;
  agentId: string;
  turnNumber: number;
  metadata: {
    processingTime: number;
    agentConfidence: number;
    contextUsed: boolean;
    learningApplied: boolean;
  };
}

export interface UserIntent {
  id: string;
  name: string;
  description: string;
  confidence: number;
  entities: IntentEntity[];
  action: string;
  parameters: Record<string, any>;
  alternatives: IntentAlternative[];
}

export interface IntentEntity {
  type: string;
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  metadata?: any;
}

export interface IntentAlternative {
  intent: string;
  confidence: number;
  reason: string;
}

export interface SemanticMemory {
  id: string;
  type: 'fact' | 'preference' | 'pattern' | 'relationship';
  content: any;
  confidence: number;
  source: 'user' | 'system' | 'inferred';
  timestamp: Date;
  expiration?: Date;
  accessCount: number;
  lastAccessed?: Date;
}

export interface UserPreferences {
  sessionId: string;
  voiceSpeed: number;
  interactionStyle: 'formal' | 'casual' | 'friendly' | 'professional';
  preferredAgents: string[];
  privacySettings: {
    shareData: boolean;
    rememberHistory: boolean;
    allowPersonalization: boolean;
  };
  accessibilitySettings: {
    screenReader: boolean;
    highContrast: boolean;
    largeText: boolean;
  };
  automationSettings: {
    confirmationRequired: boolean;
    speedPreference: 'safe' | 'fast' | 'efficient';
    errorHandling: 'conservative' | 'aggressive';
  };
}

export interface OrchestrationOptions {
  sessionId: string;
  agents: string[];
  context: ConversationContext;
  intent?: UserIntent;
  taskComplexity: 'simple' | 'medium' | 'complex' | 'enterprise';
  memoryDuration: number;
  learningEnabled: boolean;
  coordinationMode: 'sequential' | 'parallel' | 'adaptive';
  priority: TaskPriority;
  timeout?: number;
}

export interface AgentExecution {
  agentId: string;
  agentType: AgentType;
  task: string;
  status: TaskStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  result?: any;
  confidence: number;
  error?: string;
  coordinationId: string;
}

export interface RecommendedAction {
  id: string;
  type: 'automation' | 'response' | 'clarification' | 'escalation';
  description: string;
  agentId: string;
  priority: TaskPriority;
  parameters: Record<string, any>;
  estimatedDuration: number;
  confidence: number;
  reasoning: string;
}

export interface OrchestrationResult {
  sessionId: string;
  agents: AgentExecution[];
  conversation: DialogueTurn[];
  context: ConversationContext;
  nextActions: RecommendedAction[];
  confidence: number;
  processingTime: number;
  success: boolean;
  insights: string[];
  recommendations: string[];
}

export interface Task {
  id: string;
  sessionId: string;
  type: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
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

export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'busy' | 'error';
  performance: {
    successRate: number;
    averageResponseTime: number;
    tasksCompleted: number;
    errorRate: number;
    lastUpdated: Date;
  };
  configuration: {
    maxConcurrentTasks: number;
    timeoutDuration: number;
    retryAttempts: number;
    learningEnabled: boolean;
  };
  specialization: {
    domain: string[];
    languages: string[];
    modalities: string[];
    expertise: number[]; // 1-10 scale
  };
}

export interface AgentCoordination {
  coordinationId: string;
  sessionId: string;
  primaryAgent: string;
  supportingAgents: string[];
  mode: 'collaborative' | 'hierarchical' | 'peer-to-peer';
  conflictResolution: ConflictResolutionStrategy;
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

export interface ConflictResolutionStrategy {
  type: 'voting' | 'seniority' | 'expertise' | 'performance' | 'hybrid';
  parameters: Record<string, any>;
  enabled: boolean;
}

export interface LoadBalancingStrategy {
  type: 'round_robin' | 'least_busy' | 'capability_based' | 'performance_based' | 'predictive';
  weights: Record<string, number>;
  enabled: boolean;
}

export interface LearningInsights {
  sessionId: string;
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
  type: 'user_behavior' | 'workflow' | 'error' | 'success';
  description: string;
  frequency: number;
  confidence: number;
  lastSeen: Date;
  context: Record<string, any>;
  recommendedAction: string;
}

export interface Optimization {
  id: string;
  type: 'performance' | 'workflow' | 'resource' | 'strategy';
  description: string;
  impact: number;
  effort: number;
  confidence: number;
  implemented: boolean;
  results?: any;
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

export interface Adaptation {
  id: string;
  type: 'workflow' | 'parameter' | 'strategy' | 'resource';
  description: string;
  oldValue: any;
  newValue: any;
  reason: string;
  confidence: number;
  effectiveness: number;
}

export interface PerformanceImprovement {
  metric: string;
  oldValue: number;
  newValue: number;
  improvement: number;
  confidence: number;
  reason: string;
}