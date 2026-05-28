// Canonical Event Contracts - Source of Truth

export interface AgentEvent {
  event_id?: string;
  session_id: string;
  event_type: 'text_input' | 'ui_result' | 'system';
  payload: Record<string, any>;
  ts: string; // ISO-8601
  agent_id: string;
}

export interface CloudCommand {
  command_id?: string;
  session_id?: string;
  timestamp?: string;
  type?: 'say' | 'ui_steps' | 'mode' | 'stop' | 'error';
  say?: {
    text: string;
    interruptible: boolean;
    voice?: string;
    language?: string;
    speed?: number;
    pitch?: number;
    volume?: number;
    metadata?: Record<string, any>;
  };
  ui_steps?: any[];
  confidence: number;
  mode: 'normal' | 'safe' | 'silent' | 'error';
  flow_id: string | null;
  flow_run_id: string | null;
  metadata?: Record<string, any>;
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

export interface ExecutionEvidence {
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

export interface AgentExecResultAck {
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
