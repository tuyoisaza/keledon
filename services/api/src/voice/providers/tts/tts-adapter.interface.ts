/**
 * TTS — Text-to-Speech Adapter Interface
 *
 * Any TTS provider (Kokoro/Speaches, ElevenLabs, Web Speech API, etc.)
 * implements this.  The KeledonRealtimePipelineProvider uses whichever
 * adapter is configured for the current team/session.
 */

export interface TtsChunk {
  audio: Buffer;
  sequence: 'chunk' | 'end' | 'single';
  format: string;
  duration?: number;
}

export interface TtsAdapter {
  readonly id: string;
  initialize(config: Record<string, any>): Promise<void>;
  speak(
    text: string,
    options?: {
      voice?: string;
      interruptible?: boolean;
      onChunk?: (chunk: TtsChunk) => void;
    },
  ): Promise<{ duration?: number; error?: string }>;
  stop(): void;
}
