import type {
  AgentStatus,
  SystemHealth,
} from '../services/agent-monitoring.service';
import type { FlowExecution, FlowStep } from '../services/flow-execution.types';

export interface DashboardSocketData {
  type: string;
  agentId?: string;
  loopId?: string;
  executionId?: string;
  providerId?: string;
  status?: AgentStatus['status'];
  audioLevel?: number;
  performance?: AgentStatus['performance'];
  health?: SystemHealth;
  step?: FlowStep;
  stepIndex?: number;
  progress?: number;
  config?: Record<string, unknown>;
  timeRange?: '1h' | '24h' | '7d' | '30d';
  loopData?: { name?: string };
  flowData?: { name?: string; priority?: FlowExecution['priority'] };
}
