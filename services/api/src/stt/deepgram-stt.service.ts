import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

export interface DeepgramTranscriptResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  duration?: number;
}

@Injectable()
export class DeepgramSTTService {
  private readonly logger = new Logger(DeepgramSTTService.name);
  private client: any = null;
  private clientInitialized = false;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Lazy-initialize the Deepgram SDK client.
   * Returns true if the client is ready, false if the API key is missing.
   */
  private async ensureClient(): Promise<boolean> {
    if (this.clientInitialized && this.client) return true;

    const sttConfig = this.configService.getSttConfig();
    const apiKey = sttConfig.deepgramApiKey;

    if (!apiKey) {
      this.logger.warn('[DeepgramSTT] No DEEPGRAM_API_KEY configured — service unavailable');
      return false;
    }

    try {
      const { createClient } = await import('@deepgram/sdk');
      this.client = createClient(apiKey);
      this.clientInitialized = true;
      this.logger.log('[DeepgramSTT] Client initialized');
      return true;
    } catch (error: any) {
      this.logger.error('[DeepgramSTT] Failed to initialize Deepgram SDK:', error.message);
      return false;
    }
  }

  /**
   * Transcribe a full audio buffer (prerecorded) via Deepgram REST API.
   * Returns the transcribed text, or null on failure.
   */
  async transcribeAudio(audioBuffer: Buffer): Promise<string | null> {
    const ready = await this.ensureClient();
    if (!ready) return null;

    const sttConfig = this.configService.getSttConfig();
    const model = sttConfig.deepgramModel || 'nova-2';

    try {
      this.logger.log(`[DeepgramSTT] Transcoding ${audioBuffer.length} bytes with model=${model}`);

      const { result, error } = await this.client.listen.prerecorded.transcribeFile(
        audioBuffer,
        {
          model,
          smart_format: true,
          punctuate: true,
          language: sttConfig.deepgramLanguage || 'en',
          encoding: sttConfig.deepgramEncoding || 'linear16',
          sample_rate: sttConfig.deepgramSampleRate || 16000,
        },
      );

      if (error) {
        this.logger.error('[DeepgramSTT] Transcription error:', error.message);
        return null;
      }

      const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
      if (!transcript) {
        this.logger.warn('[DeepgramSTT] No transcript in response');
        return '';
      }

      this.logger.log(`[DeepgramSTT] Transcript: "${transcript.substring(0, 100)}..."`);
      return transcript;
    } catch (error: any) {
      this.logger.error('[DeepgramSTT] Transcription failed:', error.message);
      return null;
    }
  }

  /**
   * Create a live transcription connection to Deepgram.
   * Returns a LiveTranscription connection object or null on failure.
   */
  async createLiveStream(): Promise<any | null> {
    const ready = await this.ensureClient();
    if (!ready) return null;

    const sttConfig = this.configService.getSttConfig();

    try {
      const connection = this.client.listen.live.transcription({
        model: sttConfig.deepgramModel || 'nova-2',
        smart_format: true,
        punctuate: true,
        language: sttConfig.deepgramLanguage || 'en',
        encoding: sttConfig.deepgramEncoding || 'linear16',
        sample_rate: sttConfig.deepgramSampleRate || 16000,
        interim_results: true,
      });

      connection.on('open', () => {
        this.logger.log('[DeepgramSTT] Live connection opened');
      });

      connection.on('error', (err: any) => {
        this.logger.error('[DeepgramSTT] Live connection error:', err?.message || err);
      });

      connection.on('close', () => {
        this.logger.log('[DeepgramSTT] Live connection closed');
      });

      return connection;
    } catch (error: any) {
      this.logger.error('[DeepgramSTT] Failed to create live stream:', error.message);
      return null;
    }
  }

  /**
   * Check whether the Deepgram service is configured and available.
   */
  isAvailable(): boolean {
    const sttConfig = this.configService.getSttConfig();
    return !!sttConfig.deepgramApiKey;
  }
}
