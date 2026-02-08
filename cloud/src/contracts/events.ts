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
