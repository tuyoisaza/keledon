export interface Decision {
  id: string;
  type: 'route' | 'action' | 'delegate' | 'escalate';
  priority: number;
  context: Record<string, any>;
  metadata: {
    timestamp: Date;
    agent: string;
    confidence: number;
  };
}

export interface DecisionRule {
  id: string;
  name: string;
  condition: (context: any) => boolean;
  action: (context: any) => Decision;
  priority: number;
  enabled: boolean;
}

export interface RoutingTable {
  [key: string]: DecisionRule[];
}

export interface AgentCapability {
  id: string;
  name: string;
  capabilities: string[];
  availability: boolean;
  loadFactor: number;
}

export interface DecisionContext {
  sessionId: string;
  userId?: string;
  intent: string;
  parameters: Record<string, any>;
  history: Decision[];
  availableAgents: AgentCapability[];
}