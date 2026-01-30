/**
 * RPA Types and Enums
 * 
 * Contains common types used throughout the RPA system
 */

export enum ExecutionMode {
  DETERMINISTIC = 'deterministic',
  RECOVERY = 'recovery',
  TESTING = 'testing'
}

export enum StepType {
  NAVIGATION = 'navigation',
  INTERACTION = 'interaction',
  VALIDATION = 'validation',
  EXTRACTION = 'extraction'
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface StepMetrics {
  execution_time_ms: number;
  memory_usage_mb?: number;
  dom_elements?: number;
  network_requests?: number;
  scroll_events?: number;
}

export interface ExecutionContext {
  session_id: string;
  tab_id: string;
  url: string;
  timestamp: string;
  user_agent: string;
  viewport: {
    width: number;
    height: number;
  };
}

export interface RollbackContext {
  step_id: string;
  action: string;
  selector: string;
  rollback_action?: string;
  elements_modified: string[];
  state_before: any;
}

export interface ValidationContext {
  step_id: string;
  phase: 'pre' | 'post';
  selector: string;
  validation_rules: any[];
  custom_validators: any[];
}

export interface ErrorRecoveryContext {
  step_id: string;
  error_type: string;
  recovery_attempts: number;
  max_attempts: number;
  recovery_strategies: string[];
  successful_recovery?: boolean;
}

export interface PerformanceMetrics {
  total_steps: number;
  successful_steps: number;
  failed_steps: number;
  success_rate: number;
  average_step_time_ms: number;
  total_execution_time_ms: number;
  memory_peak_mb: number;
  network_requests_total: number;
  dom_changes_total: number;
  rollback_count: number;
  rollback_rate: number;
}

export interface AuditEvent {
  timestamp: string;
  event_type: string;
  step_id?: string;
  details: any;
  user_id?: string;
  session_id?: string;
  tab_id?: string;
}

export interface SelectorInfo {
  selector: string;
  element_count: number;
  first_element_tag?: string;
  first_element_id?: string;
  first_element_class?: string;
  is_visible?: boolean;
  is_clickable?: boolean;
  bounding_rect?: DOMRect;
}

export interface PageState {
  url: string;
  title: string;
  ready_state: DocumentReadyState;
  scroll_position: { x: number; y: number };
  viewport_size: { width: number; height: number };
  dom_element_count: number;
  network_requests_count?: number;
  memory_usage_mb?: number;
  timestamp: string;
}