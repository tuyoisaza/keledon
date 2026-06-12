/**
 * STT — Speech-to-Text Adapter Interface
 *
 * Any STT provider (Speaches, Deepgram, Whisper, etc.) implements this.
 * The KeledonRealtimePipelineProvider uses whichever adapter is configured.
 */

export interface SttResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  language?: string;
  durationMs?: number;
}

export interface SttAdapter {
  readonly id: string;
  initialize(config: Record<string, any>): Promise<void>;
  transcribe(audio: Buffer, options?: { language?: string }): Promise<SttResult>;
}
