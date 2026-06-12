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
 * Structured status object for a single provider (STT, TTS, or LLM).
 */
export interface ProviderStatus {
  /** Provider identifier (e.g. 'speaches', 'openai', 'kokoro') */
  id: string;
  /** Human-readable name */
  name: string;
  /** Provider category */
  kind: 'stt' | 'tts' | 'llm';
  /** Current health level */
  health: ProviderHealth;
  /** Additional detail (e.g. model name, latency, error message) */
  detail?: string;
  /** Whether an API key is configured */
  keyConfigured: boolean;
  /** ISO timestamp of last check */
  lastChecked?: string;
}

/**
 * Aggregate voice pipeline status for a team session.
 */
export interface VoicePipelineStatus {
  sessionId?: string;
  stt: ProviderStatus;
  tts: ProviderStatus;
  llm: ProviderStatus;
  /** Whether VAD is enabled */
  vadEnabled: boolean;
  /** Whether barge-in is enabled */
  bargeInEnabled: boolean;
}

/**
 * Voice provider configuration resolved from team/tenant settings.
 */
export interface VoiceProviderConfig {
  teamId: string;
  sttProvider: string;
  ttsProvider: string;
  llmProvider: string;
  sttApiKey: string;
  ttsApiKey: string;
  llmApiKey: string;
  voiceId?: string;
  speachesApiUrl?: string;
  vadEnabled: boolean;
  bargeInEnabled: boolean;
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
  onAudioInput(audio: { data: string; format: string }): Promise<void>;

  /** Speak text through the TTS pipeline (called when Cloud sends a say command) */
  speak(text: string, interruptible: boolean): Promise<void>;

  /** Interrupt current speech (barge-in) */
  interrupt(reason: string): Promise<void>;

  /** Get current provider health */
  getStatus(): ProviderStatus;

  /** Clean up resources */
  destroy(): Promise<void>;
}
