// Canonical Data Model Contracts - Source of Truth
import { UIStep } from './events';

export interface Session {
  id: string;
  agent_id: string;
  created_at: string; // ISO-8601
  updated_at: string; // ISO-8601
  status: 'active' | 'paused' | 'completed' | 'error';
  tab_url?: string;
  tab_title?: string;
  metadata?: Record<string, any>;
}

export interface Event {
  id: string;
  session_id: string;
  event_type: 'text_input' | 'ui_result' | 'system';
  payload: Record<string, any>;
  ts: string; // ISO-8601
  agent_id: string;
  created_at: string; // ISO-8601
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  steps: UIStep[];
  created_at: string; // ISO-8601
  updated_at: string; // ISO-8601
}

export interface FlowRun {
  id: string;
  flow_id: string;
  session_id: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  started_at: string; // ISO-8601
  completed_at?: string; // ISO-8601
  current_step_index?: number;
}

export interface UIExecution {
  id: string;
  session_id: string;
  flow_run_id: string;
  step_id: string;
  action: string;
  selector: string;
  value?: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: Record<string, any>;
  error?: string;
  created_at: string; // ISO-8601
  completed_at?: string; // ISO-8601
}