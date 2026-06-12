/**
 * Provider status levels — never fake a status.
 * 'unknown' → not yet initialized or checked
 * 'initializing' → startup in progress
 * 'ready' → initialized and operational
 * 'degraded' → operational but with reduced capability (e.g., STT slow, TTS model loading)
 * 'error' → failed, needs attention
 */
export type ProviderHealth = 'unknown' | 'initializing' | 'ready' | 'degraded' | 'error';

/**
 * Structured status object for a single pipeline component (STT, TTS, or LLM).
 */
export interface ProviderStatus {
  /** Provider identifier (e.g. 'speaches', 'openai', 'kokoro') */
  id: string;
  /** Human-readable name */
  name: string;
  /** Current health level */
  health: ProviderHealth;
  /** Additional detail (e.g. model name, latency, error message) */
  detail?: string;
}

/**
 * Aggregate voice pipeline status for a team/session.
 * Returned by the provider's getStatus() and exposed via
 * GET /api/voice-provider/status/:sessionId.
 */
export interface VoicePipelineStatus {
  /** Provider id (e.g. 'keledon-realtime-pipeline') */
  provider: string;
  /** Whether initialize() completed */
  initialized: boolean;
  /** STT component status */
  stt: ProviderStatus;
  /** TTS component status */
  tts: ProviderStatus;
  /** LLM / Cloud Brain component status */
  llm: ProviderStatus;
  /** Whether VAD is enabled */
  vadEnabled: boolean;
  /** Whether barge-in is enabled */
  bargeInEnabled: boolean;
  /** Active session id (if any) */
  activeSessionId?: string;
  /** ISO timestamp of this status snapshot */
  timestamp: string;
  /** Provider-level error (last runtime error) */
  error?: { message: string; at: string };
}

/**
 * Voice provider configuration resolved from team/tenant settings.
 */
export interface VoiceProviderConfig {
  /** Team identifier */
  teamId?: string;
  /** Unified voice pipeline provider (e.g. keledon-realtime-pipeline, web-speech-local) */
  voiceProvider?: string;
  /** STT provider id */
  sttProvider: string;
  /** TTS provider id */
  ttsProvider: string;
  llmProvider: string;
  sttApiKey?: string;
  ttsApiKey?: string;
  llmApiKey?: string;
  authToken?: string;
  voiceId?: string;
  speachesApiUrl?: string;
  vadEnabled: boolean;
  bargeInEnabled: boolean;
  [key: string]: any; // allow provider-specific extras
}

/**
 * Contract: a voice provider must implement a conversational session lifecycle.
 * Cloud decides; Agent executes.
 */
export interface VoiceProvider {
  /** Unique provider identifier */
  readonly id: string;

  /** Initialize with resolved configuration */
  initialize(config: VoiceProviderConfig): Promise<void>;

  /** Start a new conversation session */
  startSession(sessionId: string): Promise<void>;

  /** End current session */
  stopSession(sessionId: string): Promise<void>;

  /** Feed captured audio into the STT pipeline */
  onAudioInput(audio: Buffer): Promise<void>;

  /** Speak text through the TTS pipeline (called when Cloud sends a say command) */
  speak(command: { text: string; interruptible?: boolean }): Promise<void>;

  /** Interrupt current speech (barge-in or system interrupt) */
  interrupt(reason: string): Promise<void>;

  /** Get current aggregate pipeline status */
  getStatus(): VoicePipelineStatus;

  /** Clean up resources */
  destroy(): Promise<void>;
}
