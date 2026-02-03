// Based on c:/Keldon/CONTRACTS.md

// ========== AGENT -> CLOUD ==========

export const EVENT_AUDIO_CHUNK = 'AUDIO_CHUNK';
export interface AudioChunkPayload {
  type: string; // e.g. "audio/webm"
  payload: string; // base64
  source: 'mic' | 'tab';
  timestamp: number;
}

export const EVENT_FLOW_RESULT = 'FLOW_RESULT';
export interface FlowResultPayload {
  correlation_id: string;
  flow_run_id?: string;
  status: 'SUCCESS' | 'FAILURE';
  data?: Record<string, any>;
  error?: {
    step_index: number;
    action: string;
    message: string;
  };
}

export const EVENT_PAGE_SNAPSHOT = 'PAGE_SNAPSHOT';
export interface PageSnapshotPayload {
  url: string;
  title: string;
  dom_hash: string;
  html_snippet: string;
}

// ========== CLOUD -> AGENT ==========

export const EVENT_EXECUTE_FLOW = 'EXECUTE_FLOW';
export interface ExecuteFlowPayload {
  correlation_id: string;
  flow_id?: string;
  flow_definition_id?: string;
  flow_version_id?: string;
  flow_run_id?: string;
  steps?: Record<string, any>[];
  params?: Record<string, string>;
}

export const EVENT_PLAY_AUDIO = 'PLAY_AUDIO';
export interface PlayAudioPayload {
  format: 'mp3' | 'wav';
  payload: string; // base64
  interruptible: boolean;
}

export const EVENT_STOP_EXECUTION = 'STOP_EXECUTION';
export interface StopExecutionPayload {
  reason: 'user_interruption' | 'system_error';
}
