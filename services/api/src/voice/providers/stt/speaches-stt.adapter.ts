import { Logger } from '@nestjs/common';
import { SttAdapter, SttResult } from './stt-adapter.interface';

export interface SpeachesSttAdapterConfig {
  baseUrl: string;
  apiKey: string;
  model?: string;
  language?: string;
}

/**
 * STT adapter that calls Speaches (OpenAI-compatible /v1/audio/transcriptions).
 *
 * Accepts raw audio bytes, posts them to Speaches, returns the transcript.
 * Used by the KeledonRealtimePipelineProvider when Speaches is the configured
 * STT provider.
 */
export class SpeachesSttAdapter implements SttAdapter {
  readonly id = 'speaches';
  private readonly logger = new Logger(SpeachesSttAdapter.name);
  private config!: SpeachesSttAdapterConfig;

  async initialize(config: SpeachesSttAdapterConfig): Promise<void> {
    this.config = {
      baseUrl: config.baseUrl.replace(/\/+$/, ''),
      apiKey: config.apiKey,
      model: config.model || 'whisper-1',
      language: config.language || undefined,
    };
    this.logger.log(`SpeachesSTT initialized → ${this.config.baseUrl} model=${this.config.model}`);
  }

  async transcribe(audio: Buffer, options?: { language?: string }): Promise<SttResult> {
    if (!this.config) throw new Error('SpeachesSTT not initialized');

    const formData = new FormData();
    const blob = new Blob([audio as unknown as BlobPart], { type: 'audio/wav' });
    formData.append('file', blob, 'audio.wav');
    formData.append('model', this.config.model);
    const lang = options?.language || this.config.language;
    if (lang) formData.append('language', lang);

    const res = await fetch(`${this.config.baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.config.apiKey}` },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown error');
      throw new Error(`Speaches STT error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    return {
      text: data.text || '',
      confidence: data.confidence ?? (data.segments?.[0]?.confidence ?? 1.0),
      isFinal: true,
      language: data.language || lang || undefined,
      durationMs: data.duration_ms || undefined,
    };
  }
}
