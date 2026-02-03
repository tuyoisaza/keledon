/**
 * KELEDON Core Domain Models
 * Shared between cloud/ and landing/
 * Based on CONTRACTS.md and Brief V1 terminology
 */

// ============================================================
// FLOW DEFINITIONS (Immutable, versioned)
// ============================================================

export interface Flow {
  id: string;
  name: string;                   // "Create Case in Salesforce"
  description?: string;
  interfaceId: string;            // Target platform (Genesys, Salesforce, etc.)
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FlowVersion {
  id: string;
  flowId: string;
  version: number;                // Monotonically increasing
  steps: FlowStep[];
  variables: Record<string, string>;
  createdAt: string;
  createdBy: string;              // User ID who recorded this version
  reason?: string;                // "DOM changed", "New field added"
}

export type FlowStepType =
  | 'click'
  | 'type'
  | 'read'
  | 'navigate'
  | 'wait'
  | 'condition'
  | 'extract';

export interface FlowStep {
  id: string;
  type: FlowStepType;
  name?: string;
  selector?: string;
  value?: string;
  url?: string;
  variable?: string;
  waitMs?: number;
  condition?: {
    variable: string;
    operator: 'equals' | 'contains' | 'gt' | 'lt' | 'exists' | 'empty';
    value: string;
  };
  onTrue?: string;
  onFalse?: string;
}

// ============================================================
// EXECUTION RECORDS (Runtime, auditable)
// ============================================================

export interface FlowRun {
  id: string;
  flowId: string;
  flowVersionId: string;
  sessionId: string;              // Call/conversation session
  userId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  error?: string;
  stepExecutions: StepExecution[];
}

export interface StepExecution {
  id: string;
  flowRunId: string;
  stepId: string;
  status: 'success' | 'failed' | 'skipped';
  output?: string;
  error?: string;
  executedAt: string;
  durationMs: number;
  evidence?: Evidence;
}

// ============================================================
// DECISION (Cloud decides, Agent executes)
// ============================================================

export interface Decision {
  id: string;
  sessionId: string;
  intent: string;                 // Classified intent from STT/RAG
  confidence: number;             // 0-1
  policyId?: string;              // Applied policy
  selectedFlowId: string;
  selectedFlowVersionId: string;
  reason: string;                 // "Matched intent 'check_order_status' with 0.92 confidence"
  decidedAt: string;
  decidedBy: 'system' | 'manual'; // Automatic or human override
}

// ============================================================
// EVIDENCE (Audit trail, first-class)
// ============================================================

export interface Evidence {
  id: string;
  flowRunId: string;
  stepExecutionId?: string;
  type: 'screenshot' | 'dom_snapshot' | 'log' | 'selector_used';
  data: string;                   // Base64 or JSON depending on type
  capturedAt: string;
}

// ============================================================
// RE-EXPORTS for compatibility with existing workflow.interface.ts
// ============================================================

export type {
  Flow as Workflow,
  FlowVersion as WorkflowVersion,
  FlowRun as WorkflowExecution,
  StepExecution as StepResult,
};
