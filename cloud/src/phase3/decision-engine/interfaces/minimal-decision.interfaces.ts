export interface MinimalDecisionInput {
  text?: string;
  event?: string;
  context?: Record<string, any>;
}

export interface MinimalDecision {
  decision_type: "suggestion" | "action" | "escalate" | "ignore";
  confidence: number;
  reasoning: string;
  next_action: string | null;
}

export interface MinimalDecisionRule {
  pattern: RegExp | string;
  decision: Partial<MinimalDecision>;
  priority: number;
}