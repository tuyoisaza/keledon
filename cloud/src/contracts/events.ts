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