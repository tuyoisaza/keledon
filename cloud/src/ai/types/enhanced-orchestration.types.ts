/**
 * Enhanced Types for Complete Conversations Orchestrator System
 * Integrates RAG, Flow Execution, RPA, and Side Panel Communication
 */

// Core System Types
export enum AgentType {
  ORCHESTRATOR = 'orchestrator',
  TTS_AGENT = 'tts-agent',
  STT_AGENT = 'stt-agent',
  VISION_AGENT = 'vision-agent',
  RPA_AGENT = 'rpa-agent',
  RAG_AGENT = 'rag-agent',
  FLOW_AGENT = 'flow-agent',
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
  CANCELLED = 'cancelled',
  RETRYING = 'retrying'
}

export enum SessionState {
  ACTIVE = 'active',
  IDLE = 'idle',
  TRANSFERRING = 'transferring',
  TERMINATED = 'terminated',
  ERROR = 'error'
}

export enum RPAExecutionState {
  READY = 'ready',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  INTERRUPTED = 'interrupted'
}

// Enhanced Session Management
export interface EnhancedConversationContext {
  sessionId: string;
  userId?: string;
  companyId: string;
  telephonySession?: TelephonySession;
  conversationState: SessionState;
  history: DialogueTurn[];
  entities: Record<string, any>;
  intents: UserIntent[];
  preferences: UserPreferences;
  memory: SemanticMemory[];
  vectorContext: VectorContext;
  flowState: FlowState;
  rpaSession: RPASession;
  sidePanelConnection: SidePanelConnection;
  lastUpdated: Date;
  contextScore: number;
  performance: SessionPerformance;
  security: SecurityContext;
}

export interface TelephonySession {
  callId: string;
  genesysSessionId?: string;
  phoneNumber: string;
  startTime: Date;
  duration?: number;
  state: 'ringing' | 'answered' | 'held' | 'ended';
  quality: {
    latency: number;
    packetLoss: number;
    connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  };
  metadata: {
    ivrPath?: string[];
    agentTransfers?: number;
    recordingUrl?: string;
  };
}

// RAG Integration Types
export interface VectorContext {
  vectors: VectorMemory[];
  searchResults: KnowledgeRetrieval[];
  embeddings: EmbeddingResult[];
  lastQuery?: string;
  lastSearchTime: Date;
  searchHistory: SearchHistoryEntry[];
}

export interface VectorMemory {
  id: string;
  sessionId: string;
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    timestamp: Date;
    relevance: number;
    userId?: string;
    companyId?: string;
    category?: string;
    tags?: string[];
  };
}

export interface KnowledgeRetrieval {
  id: string;
  content: string;
  source: string;
  score: number;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface EmbeddingResult {
  text: string;
  embedding: number[];
  model: string;
  dimensions: number;
  processingTime: number;
}

export interface SearchHistoryEntry {
  query: string;
  timestamp: Date;
  resultCount: number;
  averageScore: number;
  satisfied?: boolean;
}

// Flow Engine Types
export interface FlowState {
  flowId: string;
  currentNode: string;
  previousNodes: string[];
  variables: Record<string, any>;
  history: FlowExecution[];
  status: 'idle' | 'executing' | 'waiting' | 'completed' | 'error';
  flowDefinition: FlowDefinition;
  context: FlowContext;
}

export interface FlowDefinition {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
  connections: FlowConnection[];
  variables: FlowVariable[];
  triggers: FlowTrigger[];
  metadata: {
    version: string;
    author: string;
    created: Date;
    updated: Date;
    category: string;
    complexity: 'simple' | 'medium' | 'complex';
  };
}

export interface FlowNode {
  id: string;
  type: 'start' | 'process' | 'decision' | 'action' | 'end' | 'subflow';
  name: string;
  description: string;
  position: { x: number; y: number };
  configuration: {
    agent?: AgentType;
    task?: string;
    condition?: string;
    timeout?: number;
    retryPolicy?: RetryPolicy;
    parameters?: Record<string, any>;
  };
  metadata: {
    category: string;
    estimatedDuration: number;
    requirements: string[];
  };
}

export interface FlowConnection {
  id: string;
  fromNode: string;
  toNode: string;
  condition?: string;
  label?: string;
  metadata: Record<string, any>;
}

export interface FlowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: any;
  description: string;
  required: boolean;
  metadata: Record<string, any>;
}

export interface FlowTrigger {
  type: 'intent' | 'event' | 'schedule' | 'manual';
  condition: string;
  parameters: Record<string, any>;
}

export interface FlowExecution {
  id: string;
  nodeId: string;
  flowId: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  status: TaskStatus;
  result?: any;
  error?: string;
  agentId?: string;
  metadata: {
    duration?: number;
    retryCount?: number;
    inputUsed?: Record<string, any>;
    outputGenerated?: Record<string, any>;
  };
}

export interface FlowContext {
  variables: Record<string, any>;
  history: FlowExecution[];
  environment: {
    userAgent?: string;
    sessionId: string;
    userId?: string;
    companyId?: string;
    timestamp: Date;
  };
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  initialDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

// RPA Execution Types
export interface RPASession {
  id: string;
  sessionId: string;
  flowId?: string;
  browserContext: BrowserContext;
  workflows: RPAWorkflow[];
  currentExecution?: RPAExecution;
  status: RPAExecutionState;
  startTime: Date;
  endTime?: Date;
  metadata: {
    browserType: string;
    viewport: { width: number; height: number };
    userAgent: string;
    capabilities: string[];
  };
}

export interface RPAWorkflow {
  id: string;
  name: string;
  description: string;
  steps: RPAStep[];
  configuration: RPAConfiguration;
  status: 'active' | 'inactive' | 'testing';
  metadata: {
    category: string;
    author: string;
    version: string;
    lastUpdated: Date;
    successRate: number;
    averageDuration: number;
  };
}

export interface RPAStep {
  id: string;
  type: 'navigate' | 'click' | 'type' | 'extract' | 'wait' | 'verify' | 'script';
  name: string;
  selector?: string;
  value?: string;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  parameters: Record<string, any>;
  expectedOutput?: any;
  metadata: {
    description: string;
    category: string;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export interface RPAConfiguration {
  browser: {
    type: 'chromium' | 'firefox' | 'webkit';
    headless: boolean;
    viewport: { width: number; height: number };
    userAgent?: string;
  };
  timeouts: {
    default: number;
    navigation: number;
    element: number;
    script: number;
  };
  security: {
    ignoreHTTPS: boolean;
    blockAds: boolean;
    sandbox: boolean;
  };
  performance: {
    enableCaching: boolean;
    enableResourceOptimization: boolean;
    maxConcurrentSteps: number;
  };
}

export interface RPAExecution {
  id: string;
  workflowId: string;
  stepId: string;
  sessionId: string;
  status: TaskStatus;
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  screenshot?: string;
  logs: RPALogEntry[];
  metadata: {
    duration?: number;
    elementFound: boolean;
    retryCount: number;
    browserContext?: any;
  };
}

export interface RPALogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
  screenshot?: string;
  element?: {
    selector: string;
    text: string;
    coordinates: { x: number; y: number };
  };
}

export interface BrowserContext {
  id: string;
  type: 'browser' | 'mobile' | 'tablet';
  pageUrl?: string;
  pageTitle?: string;
  elements: ElementInfo[];
  screenshot?: string;
  metadata: {
    userAgent: string;
    viewport: { width: number; height: number };
    timestamp: Date;
  };
}

export interface ElementInfo {
  selector: string;
  text: string;
  type: string;
  coordinates: { x: number; y: number; width: number; height: number };
  attributes: Record<string, string>;
  visibility: boolean;
  clickable: boolean;
  fillable: boolean;
}

// Side Panel Communication Types
export interface SidePanelConnection {
  id: string;
  sessionId: string;
  socketId: string;
  status: 'connected' | 'disconnected' | 'error';
  lastActivity: Date;
  capabilities: string[];
  permissions: SidePanelPermissions;
  events: SidePanelEvent[];
}

export interface SidePanelPermissions {
  canViewWorkflows: boolean;
  canExecuteRPA: boolean;
  canViewConversation: boolean;
  canControlFlow: boolean;
  canAccessAnalytics: boolean;
  canModifySettings: boolean;
}

export interface SidePanelEvent {
  id: string;
  type: 'rpa_start' | 'rpa_pause' | 'rpa_stop' | 'flow_update' | 'conversation_update' | 'system_alert';
  timestamp: Date;
  data: Record<string, any>;
  source: 'system' | 'user' | 'agent' | 'external';
  priority: TaskPriority;
}

// Enhanced Agent Types
export interface EnhancedAgent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  capabilities: string[];
  status: 'active' | 'inactive' | 'busy' | 'error';
  performance: AgentPerformance;
  configuration: AgentConfiguration;
  specialization: AgentSpecialization;
  integration: AgentIntegration;
  learning: AgentLearning;
}

export interface AgentIntegration {
  apis: {
    openai?: OpenAIConfig;
    anthropic?: AnthropicConfig;
    google?: GoogleAIConfig;
    qdrant?: QdrantConfig;
    genesys?: GenesysConfig;
  };
  webhooks: {
    urls: string[];
    authentication: string;
    events: string[];
  };
  database: {
    connected: boolean;
    connectionString?: string;
    collections: string[];
  };
}

export interface OpenAIConfig {
  apiKey: string;
  organization?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  endpoint?: string;
}

export interface AnthropicConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface GoogleAIConfig {
  apiKey: string;
  model: string;
  projectId: string;
  location: string;
}

export interface QdrantConfig {
  url: string;
  apiKey?: string;
  collection: string;
  embeddingModel: string;
}

export interface GenesysConfig {
  environment: string;
  clientId: string;
  clientSecret: string;
  apiEndpoint: string;
  region: string;
}

// Performance and Analytics
export interface SessionPerformance {
  responseTime: number;
  agentUtilization: Record<string, number>;
  taskSuccessRate: number;
  rpaExecutionTime: number;
  searchRelevanceScore: number;
  userSatisfactionScore?: number;
  errorCount: number;
  bottleneck: string | null;
}

export interface SystemMetrics {
  totalSessions: number;
  activeSessions: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageResponseTime: number;
  systemLoad: number;
  agentPerformance: Record<string, AgentPerformance>;
  timestamp: Date;
}

// Security and Authentication
export interface SecurityContext {
  sessionId: string;
  userId?: string;
  accessToken?: string;
  refreshToken?: string;
  permissions: string[];
  roles: string[];
  companyId?: string;
  securityLevel: 'low' | 'medium' | 'high';
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Legacy Compatibility (for backward compatibility)
export interface ConversationContext {
  sessionId: string;
  userId?: string;
  history: DialogueTurn[];
  entities: Record<string, any>;
  intents: UserIntent[];
  preferences: UserPreferences;
  memory: SemanticMemory[];
  lastUpdated: Date;
  contextScore: number;
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
    modelUsed: string;
    tokensUsed: number;
    searchQueries?: string[];
    rpaExecutions?: string[];
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
  alternatives: UserIntent[];
  metadata: {
    recognizedBy: string;
    processingTime: number;
    contextUsed: string[];
  };
}

export interface IntentEntity {
  name: string;
  value: string;
  type: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  metadata?: Record<string, any>;
}

export interface SemanticMemory {
  id: string;
  content: string;
  importance: number;
  timestamp: Date;
  decayRate: number;
  tags: string[];
  associations: string[];
  embedding?: number[];
}

export interface UserPreferences {
  voiceSpeed: number;
  interactionStyle: 'friendly' | 'professional' | 'casual' | 'formal';
  preferredAgents: string[];
  privacySettings: {
    shareData: boolean;
    rememberHistory: boolean;
    allowPersonalization: boolean;
    analyticsOptIn: boolean;
  };
  accessibilitySettings: {
    screenReader: boolean;
    highContrast: boolean;
    largeText: boolean;
    voiceCommands: boolean;
  };
  automationSettings: {
    confirmationRequired: boolean;
    speedPreference: 'safe' | 'efficient' | 'aggressive';
    errorHandling: 'conservative' | 'moderate' | 'aggressive';
  };
  languageSettings: {
    preferred: string;
    fallback: string;
    autoDetect: boolean;
  };
}

export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  capabilities: string[];
  status: string;
  performance: any;
  configuration: any;
  specialization: any;
}

export interface Task {
  id: string;
  sessionId: string;
  type: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  parameters: Record<string, any>;
  dependencies?: string[];
  createdAt: Date;
  assignedTo?: string;
  completedAt?: Date;
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
  error?: string;
  confidence: number;
  coordinationId: string;
  retryCount?: number;
  metadata?: Record<string, any>;
}

export interface RecommendedAction {
  id: string;
  type: string;
  description: string;
  agentId: string;
  priority: TaskPriority;
  parameters: Record<string, any>;
  estimatedDuration: number;
  confidence: number;
  reasoning: string;
}

export interface LearningInsights {
  id: string;
  sessionId?: string;
  userId?: string;
  type: string;
  insight: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  actionItems: string[];
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface AgentPerformance {
  successRate: number;
  averageResponseTime: number;
  tasksCompleted: number;
  errorRate: number;
  lastUpdated: Date;
  totalExecutionTime: number;
  peakLoadTime: number;
  capabilities: Record<string, number>;
}

export interface OrchestrationOptions {
  sessionId: string;
  userId?: string;
  companyId?: string;
  agents: string[];
  taskComplexity: 'simple' | 'medium' | 'complex' | 'enterprise';
  coordinationMode: 'collaborative' | 'hierarchical' | 'peer_to_peer';
  intent?: UserIntent;
  context?: any;
  telephonySession?: TelephonySession;
  rpaEnabled?: boolean;
  sidePanelConnected?: boolean;
  ragEnabled?: boolean;
  flowId?: string;
}

export interface OrchestrationResult {
  sessionId: string;
  agents: AgentExecution[];
  conversation: DialogueTurn[];
  context: EnhancedConversationContext;
  nextActions: RecommendedAction[];
  confidence: number;
  processingTime: number;
  success: boolean;
  insights: string[];
  recommendations: string[];
  rpaExecutions?: RPAExecution[];
  flowExecutions?: FlowExecution[];
  knowledgeRetrieval?: KnowledgeRetrieval[];
  sidePanelUpdates?: SidePanelEvent[];
}