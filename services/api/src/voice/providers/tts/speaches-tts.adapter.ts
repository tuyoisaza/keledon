import { Logger } from '@nestjs/common';
import { TtsAdapter, TtsChunk } from './tts-adapter.interface';
import { TTSService } from '../../../tts/tts.service';

export interface SpeachesTtsAdapterConfig {
  voice?: string;
  language?: string;
  teamId?: string;
}

/**
 * TTS adapter that wraps the existing TTSService for Speaches/Kokoro TTS.
 *
 * The TTSService already handles:
 *   - Speaches HTTP call with /v1/audio/speech
 *   - WAV header finalization
 *   - Language-aware voice selection (es→af_bella, en→af_sky)
 *   - Raw PCM / compressed audio fallback
 *
 * This adapter provides a clean TtsAdapter interface over that service
 * so the KeledonRealtimePipelineProvider can use it interchangeably.
 */
export class SpeachesTtsAdapter implements TtsAdapter {
  readonly id = 'speaches';
  private readonly logger = new Logger(SpeachesTtsAdapter.name);
  private config!: SpeachesTtsAdapterConfig;
  private stopped = false;

  constructor(private readonly ttsService: TTSService) {}

  async initialize(config: SpeachesTtsAdapterConfig): Promise<void> {
    this.config = config;
    this.stopped = false;
    this.logger.log(`SpeachesTTS adapter initialized voice=${config.voice || 'auto'} lang=${config.language || 'auto'}`);
  }

  async speak(
    text: string,
    options?: { voice?: string; interruptible?: boolean; onChunk?: (chunk: TtsChunk) => void },
  ): Promise<{ duration?: number; error?: string }> {
    if (this.stopped) return { error: 'Adapter stopped' };

    let lastChunkFormat = 'wav';

    const result = await this.ttsService.speakStreaming(
      text,
      (chunkBase64: string) => {
        if (this.stopped) return;
        const audio = Buffer.from(chunkBase64, 'base64');
        options?.onChunk?.({
          audio,
          sequence: 'chunk',
          format: lastChunkFormat,
        });
      },
      {
        interruptible: options?.interruptible ?? true,
        teamId: this.config.teamId,
      },
    );

    options?.onChunk?.({
      audio: Buffer.alloc(0),
      sequence: 'end',
      format: lastChunkFormat,
      duration: result.duration,
    });

    return { duration: result.duration };
  }

  stop(): void {
    this.stopped = true;
    this.ttsService.stop();
  }
}
