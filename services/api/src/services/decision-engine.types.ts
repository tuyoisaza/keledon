import { AgentEvent, CloudCommand } from '../contracts/events';
import { DecisionEvidence } from '../telemetry/decision-evidence';

export interface DecisionContext {
  sessionId: string;
  agentId: string;
  previousEvents: AgentEvent[];
  currentTranscript: string;
  confidence: number;
  metadata: Record<string, any>;
}

export interface DecisionResult {
  command: CloudCommand;
  confidence: number;
  reasoning: string;
  context: Record<string, any>;
  processingTime: number;
  decisionEvidence?: DecisionEvidence;
}
