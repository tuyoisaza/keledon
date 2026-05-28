// Canonical Event Contracts - Source of Truth

export interface AgentEvent {
  session_id: string;
  event_type: 'text_input' | 'ui_result' | 'system';
  payload: Record<string, any>;
  ts: string; // ISO-8601
  agent_id: string;
}

export interface CloudCommand {
  say: {
    text: string;
    interruptible: boolean;
  };
  ui_steps: string[];
  confidence: number;
  mode: 'normal' | 'safe';
  flow_id: string;
  flow_run_id: string;
}

export interface UIStep {
  step_id: string;
  action: 'fill_field' | 'click' | 'wait_for' | 'submit';
  selector: string;
  value: string;
  post_condition: {
    type: 'dom_equals' | 'exists';
    selector: string;
    expected: string;
  };
}

export interface ExecutionEvidenceEvent {
  event: 'agent.exec.start' | 'agent.exec.end' | 'agent.exec.error';
  session_id: string;
  decision_id: string;
  trace_id: string;
  command_id?: string;
  command_type: string;
  tab_id: string;
  execution_result: 'success' | 'failure' | 'blocked';
  execution_status?: 'success' | 'failure' | 'blocked';
  execution_timestamp?: string;
  outcome: 'success' | 'failure' | 'blocked';
  started_at: string;
  completed_at: string;
  latency_ms: number;
  evidence: {
    source: 'browser-extension';
    action?: string;
    detail?: string;
    error_code?: string;
  };
  metadata?: {
    traceparent?: string;
    tracestate?: string;
  };
}

export interface AgentExecResultAckEvent {
  event: 'agent.exec.start' | 'agent.exec.end' | 'agent.exec.error';
  session_id: string;
  decision_id: string;
  trace_id: string;
  command_id?: string;
  command_type: string;
  tab_id: string;
  execution_status: 'success' | 'failure' | 'blocked';
  execution_timestamp: string;
  metadata?: {
    traceparent?: string;
    tracestate?: string;
  };
}
