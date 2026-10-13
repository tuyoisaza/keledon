import { CloudCommand } from '../contracts/events';
import { DecisionEvidence } from '../telemetry/decision-evidence';

export interface DecisionContext {
  sessionId: string;
  agentId: string;
  previousEvents: unknown[];
  currentTranscript: string;
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface DecisionResult {
  command: CloudCommand;
  confidence: number;
  reasoning: string;
  context: Record<string, unknown>;
  processingTime: number;
  decisionEvidence?: DecisionEvidence;
}
