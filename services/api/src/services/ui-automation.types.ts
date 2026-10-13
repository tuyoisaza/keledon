export interface UIAction {
  id: string;
  action_type:
    | 'click'
    | 'type'
    | 'select'
    | 'hover'
    | 'scroll'
    | 'navigate'
    | 'screenshot'
    | 'wait'
    | 'extract_text'
    | 'submit_form';
  selector: string;
  value?: string;
  options?: Record<string, unknown>;
  timeout?: number;
  wait_condition?: string;
}

export interface UIActionResult {
  action_id: string;
  success: boolean;
  error?: string;
  element?: string;
  value?: string;
  screenshot?: string;
  text?: string;
  metadata?: Record<string, unknown>;
  execution_time?: number;
  timestamp: string;
}

export interface UIStep {
  step_id: string;
  action: UIAction;
  description: string;
  result?: UIActionResult;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
}

export interface UIExecutionSummary {
  action_id: string;
  results: UIActionResult[];
  summary: {
    total_steps: number;
    successful_steps: number;
    failed_steps: number;
    execution_time: number;
  };
  timestamp: string;
}

export interface UIExecutionHistoryEntry {
  sessionId: string;
  result: UIExecutionSummary;
  timestamp: string;
}
