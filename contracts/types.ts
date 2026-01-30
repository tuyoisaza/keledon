/**
 * Generated TypeScript types for KELEDON contracts v1
 * This file contains type definitions derived from JSON schemas
 */

// ============================================================================
// Brain Event Types (Agent → Cloud)
// ============================================================================

export interface BrainEvent {
  event_id: string;
  session_id: string;
  timestamp: string; // ISO 8601 date-time
  type: 'text_input' | 'ui_result' | 'system';
  payload: TextInputPayload | UIResultPayload | SystemPayload;
}

export interface TextInputPayload {
  text: string;
  confidence: number; // 0-1
  provider: string; // e.g., 'deepgram', 'local'
  metadata?: Record<string, any>;
}

export interface UIResultPayload {
  flow_id: string;
  step_id: string;
  status: 'success' | 'failure' | 'timeout';
  result?: Record<string, any>;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  duration_ms?: number;
}

export interface SystemPayload {
  event: 'call_started' | 'call_ended' | 'error' | 'connection_lost' | 'connection_restored';
  data?: Record<string, any>;
}

// ============================================================================
// Brain Command Types (Cloud → Agent)
// ============================================================================

export interface BrainCommand {
  command_id: string;
  session_id: string;
  timestamp: string; // ISO 8601 date-time
  type: 'say' | 'ui_steps' | 'mode' | 'stop';
  payload: SayPayload | UIStepsPayload | ModePayload | StopPayload;
}

export interface SayPayload {
  text: string;
  interruptible?: boolean;
  provider?: string; // e.g., 'elevenlabs', 'local'
  voice?: string;
  metadata?: Record<string, any>;
}

export interface UIStepsPayload {
  flow_id: string;
  steps: RPAStep[];
  context?: Record<string, any>;
  timeout_ms?: number;
}

export interface ModePayload {
  mode: 'normal' | 'safe' | 'silent';
  confidence?: number; // 0-1
  reason?: string;
}

export interface StopPayload {
  reason?: string;
  graceful?: boolean;
}

// ============================================================================
// Audio Types
// ============================================================================

export interface TextInput {
  text: string;
  confidence: number; // 0-1
  provider: 'deepgram' | 'whisper' | 'local' | 'azure' | 'google';
  timestamp: string; // ISO 8601 date-time
  alternatives?: Array<{
    text: string;
    confidence: number; // 0-1
  }>;
  words?: Array<{
    word: string;
    start: number; // seconds
    end: number; // seconds
    confidence: number; // 0-1
  }>;
  language?: string;
  duration_ms?: number;
  metadata?: {
    model?: string;
    audio_format?: string;
    sample_rate?: number;
    channels?: number;
  };
}

export interface SpeakCommand {
  text: string;
  provider: 'elevenlabs' | 'local' | 'azure' | 'google' | 'aws';
  timestamp: string; // ISO 8601 date-time
  voice?: string;
  language?: string;
  speed?: number; // 0.25-4.0, default 1.0
  pitch?: number; // -20.0 to 20.0, default 0.0
  volume?: number; // 0.0-1.0, default 1.0
  interruptible?: boolean;
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'excited' | 'calm';
  ssml?: boolean;
  format?: 'mp3' | 'wav' | 'ogg' | 'pcm';
  sample_rate?: 8000 | 16000 | 22050 | 44100 | 48000;
  metadata?: {
    model?: string;
    voice_settings?: Record<string, any>;
    output_format?: string;
  };
}

// ============================================================================
// RPA Types
// ============================================================================

export interface RPAStep {
  id: string;
  action: 'click' | 'fill' | 'read' | 'wait_for' | 'navigate' | 'select' | 'assert' | 'hover';
  selector: string;
  value?: string;
  text?: string;
  attribute?: string;
  url?: string;
  option?: string;
  timeout_ms?: number; // default 5000
  condition?: {
    element_exists?: boolean;
    element_visible?: boolean;
    element_enabled?: boolean;
  };
  post_condition?: {
    element_exists?: boolean;
    element_visible?: boolean;
    text_contains?: string;
  };
  retry?: {
    max_attempts?: number; // 1-10, default 1
    delay_ms?: number; // default 1000
  };
  metadata?: Record<string, any>;
}

export interface RPAResult {
  step_id: string;
  status: 'success' | 'failure' | 'timeout';
  timestamp: string; // ISO 8601 date-time
  duration_ms?: number;
  result?: {
    text?: string;
    attribute?: string;
    element_count?: number;
    element_state?: {
      visible?: boolean;
      enabled?: boolean;
      selected?: boolean;
    };
  };
  error?: {
    code: 'element_not_found' | 'element_not_visible' | 'element_not_interactable' | 'timeout' | 'selector_invalid' | 'javascript_error' | 'network_error' | 'permission_denied' | 'unknown_error';
    message: string;
    details?: {
      selector?: string;
      attempt?: number;
      stack_trace?: string;
      page_url?: string;
    };
  };
  screenshot?: {
    data_url: string; // base64
    width: number;
    height: number;
  };
  metadata?: {
    retry_count?: number;
    tab_id?: string;
    page_url?: string;
  };
}

// ============================================================================
// WebSocket Types
// ============================================================================

export interface RealtimeMessage {
  message_id: string;
  timestamp: string; // ISO 8601 date-time
  direction: 'agent_to_cloud' | 'cloud_to_agent';
  message_type: 'brain_event' | 'brain_command' | 'audio_chunk' | 'heartbeat' | 'error' | 'ack';
  session_id?: string;
  payload: BrainEventPayload | BrainCommandPayload | AudioChunkPayload | HeartbeatPayload | ErrorPayload | AckPayload;
  metadata?: {
    correlation_id?: string;
    retry_count?: number;
    priority?: 'low' | 'normal' | 'high' | 'critical';
  };
}

export type BrainEventPayload = BrainEvent;
export type BrainCommandPayload = BrainCommand;

export interface AudioChunkPayload {
  chunk_id: string;
  sequence_number: number;
  audio_data: string; // base64 data-url
  format: {
    encoding: 'pcm' | 'mulaw' | 'alaw' | 'opus';
    sample_rate: 8000 | 16000 | 22050 | 44100 | 48000;
    channels: 1 | 2;
    bit_depth?: 16 | 24 | 32;
  };
  is_final?: boolean;
  duration_ms?: number;
}

export interface HeartbeatPayload {
  status: 'alive' | 'busy' | 'error';
  uptime_ms: number;
}

export interface ErrorPayload {
  code: 'connection_failed' | 'authentication_failed' | 'validation_failed' | 'rate_limited' | 'internal_error' | 'timeout' | 'protocol_error';
  message: string;
  details?: Record<string, any>;
  retry_after_ms?: number;
}

export interface AckPayload {
  ack_message_id: string;
  status: 'received' | 'processed' | 'failed';
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Admin API Types (from OpenAPI)
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Configuration {
  user_id: string;
  tenant_id: string;
  stt?: {
    provider?: 'deepgram' | 'whisper' | 'local';
    api_key?: string;
    model?: string;
    language?: string;
  };
  tts?: {
    provider?: 'elevenlabs' | 'local' | 'azure';
    api_key?: string;
    voice?: string;
    language?: string;
  };
  llm?: {
    provider?: 'openai' | 'anthropic' | 'local';
    api_key?: string;
    model?: string;
    temperature?: number; // 0-2
  };
  features?: {
    local_stt?: boolean;
    local_tts?: boolean;
    rpa_enabled?: boolean;
    rag_enabled?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface ConfigurationUpdate {
  stt?: Configuration['stt'];
  tts?: Configuration['tts'];
  llm?: Configuration['llm'];
  features?: Configuration['features'];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  tenant_id: string;
  created_by: string;
  status?: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'archived';
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  project_id: string;
  version: string;
  status?: 'draft' | 'active' | 'deprecated';
  steps: RPAStep[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface FlowCreate {
  name: string;
  description?: string;
  project_id: string;
  steps: RPAStep[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next?: boolean;
  has_prev?: boolean;
}

// ============================================================================
// Common Utility Types
// ============================================================================

export type UUID = string;
export type ISODateTime = string;

export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  pagination?: Pagination;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version?: string;
}

// ============================================================================
// Type Guards and Validators
// ============================================================================

export function isBrainEvent(obj: any): obj is BrainEvent {
  return obj && 
         typeof obj.event_id === 'string' &&
         typeof obj.session_id === 'string' &&
         typeof obj.timestamp === 'string' &&
         ['text_input', 'ui_result', 'system'].includes(obj.type) &&
         typeof obj.payload === 'object';
}

export function isBrainCommand(obj: any): obj is BrainCommand {
  return obj &&
         typeof obj.command_id === 'string' &&
         typeof obj.session_id === 'string' &&
         typeof obj.timestamp === 'string' &&
         ['say', 'ui_steps', 'mode', 'stop'].includes(obj.type) &&
         typeof obj.payload === 'object';
}

export function isRealtimeMessage(obj: any): obj is RealtimeMessage {
  return obj &&
         typeof obj.message_id === 'string' &&
         typeof obj.timestamp === 'string' &&
         ['agent_to_cloud', 'cloud_to_agent'].includes(obj.direction) &&
         ['brain_event', 'brain_command', 'audio_chunk', 'heartbeat', 'error', 'ack'].includes(obj.message_type) &&
         typeof obj.payload === 'object';
}