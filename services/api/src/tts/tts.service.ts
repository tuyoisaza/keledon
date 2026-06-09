import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import { MvpStoreService } from '../mvp/mvp-store.service';
import { ProviderConfigService } from '../providers/provider-config.service';
import { getApiVersion } from '../version';

export interface TTSResult {
  audioData?: Buffer;
  duration?: number;
  error?: string;
}

@Injectable()
export class TTSService {
  private eventEmitter = new EventEmitter();
  private currentStream: Readable | null = null;
  private voiceId = process.env.ELEVENLABS_VOICE_ID || 'pFZP5JQG7iQjIQuC4Bku';

  constructor(
    private readonly mvpStore: MvpStoreService,
    private readonly providerConfig: ProviderConfigService,
  ) {
    console.log('[TTS] TTSService initialized (with DB persistence)');
  }

  /**
   * Resolve provider config: Supabase DB → MvpStore (file/JSON) → env vars → mock
   */
  private async resolveTTSConfig() {
    // Try Supabase database first
    const companyId = process.env.COMPANY_ID || 'default';
    const dbConfig = await this.providerConfig.fetchActiveConfig(companyId);

    if (dbConfig.ttsProviderId && dbConfig.ttsProviderId !== 'webspeech') {
      return {
        providerId: dbConfig.ttsProviderId,
        apiKey: dbConfig.ttsApiKey,
        voiceId: dbConfig.ttsVoiceId,
        source: 'database',
      };
    }

    // Fallback to local MvpStore (file-based, ephemeral)
    const fileConfig = this.mvpStore.getTTSConfig();
    if (fileConfig.providerId && fileConfig.providerId !== 'webspeech' && fileConfig.providerId !== 'auto') {
      return {
        providerId: fileConfig.providerId,
        apiKey: fileConfig.apiKey,
        voiceId: fileConfig.voiceId || 'ef_dora',
        source: 'file',
      };
    }

    // Fallback to env vars / auto-detect
    const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;

    return {
      providerId: hasElevenLabs ? 'elevenlabs' : hasOpenAI ? 'openai' : 'mock',
      apiKey: '',
      voiceId: 'ef_dora',
      source: 'env',
    };
  }

  async speak(
    text: string,
    options: { interruptible?: boolean } = {},
  ): Promise<TTSResult> {
    const cfg = await this.resolveTTSConfig();
    const provider = cfg.providerId;

    console.log(
      `[v${getApiVersion()}] [TTS] Speaking with ${provider} (source: ${cfg.source}): "${text.substring(0, 50)}..."`,
    );

    try {
      if (provider === 'kokoro') {
        const baseUrl = cfg.apiKey || 'https://kokoro-api-production-0bfa.up.railway.app';
        return await this.speakWithKokoro(text, baseUrl, cfg.voiceId);
      } else if (provider === 'elevenlabs') {
        return await this.speakWithElevenLabs(text, options);
      } else if (provider === 'openai' || provider === 'openai-tts') {
        return await this.speakWithOpenAI(text, options);
      } else {
        console.log('[TTS] Mock TTS mode (no provider configured)');
        return { audioData: Buffer.from(''), duration: 0 };
      }
    } finally {
      this.eventEmitter.emit('speak:completed');
    }
  }

  /**
   * Stream TTS audio chunks via a callback, for WebSocket delivery.
   */
  async speakStreaming(
    text: string,
    onChunk: (base64: string) => void,
    options: { interruptible?: boolean } = {},
  ): Promise<TTSResult> {
    const cfg = await this.resolveTTSConfig();
    const provider = cfg.providerId;

    console.log(
      `[v${getApiVersion()}] [TTS] Streaming with ${provider} (source: ${cfg.source}): "${text.substring(0, 50)}..."`,
    );

    if (provider === 'kokoro') {
      const baseUrl = cfg.apiKey || 'https://kokoro-api-production-0bfa.up.railway.app';
      const result = await this.speakWithKokoro(text, baseUrl, cfg.voiceId);
      if (result.audioData && result.audioData.length > 0) {
        const chunkSize = 32000;
        for (let i = 0; i < result.audioData.length; i += chunkSize) {
          const chunk = result.audioData.slice(i, Math.min(i + chunkSize, result.audioData.length));
          onChunk(chunk.toString('base64'));
        }
      }
      return result;
    } else if (provider === 'elevenlabs') {
      return await this.streamWithElevenLabs(text, onChunk, options);
    } else if (provider === 'openai' || provider === 'openai-tts') {
      const result = await this.speakWithOpenAI(text, options);
      if (result.audioData && result.audioData.length > 0) {
        const chunkSize = 32000;
        for (let i = 0; i < result.audioData.length; i += chunkSize) {
          const chunk = result.audioData.slice(i, Math.min(i + chunkSize, result.audioData.length));
          onChunk(chunk.toString('base64'));
        }
      }
      return result;
    } else {
      console.log('[TTS] Mock streaming — no provider configured');
      return { audioData: Buffer.from(''), duration: 0 };
    }
  }

  async streamWithElevenLabs(
    text: string,
    onChunk: (base64: string) => void,
    options: { interruptible?: boolean },
  ): Promise<TTSResult> {
    const cfg = await this.resolveTTSConfig();
    const apiKey = cfg.apiKey || process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return { error: 'ELEVENLABS_API_KEY not configured' };
    }

    try {
      const { ElevenLabsClient } = await import('elevenlabs');
      const client = new ElevenLabsClient({ apiKey });

      const audio = await client.textToSpeech.convertAsStream(this.voiceId, {
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true,
        },
      });

      const chunks: Buffer[] = [];
      for await (const chunk of audio) {
        if (
          options.interruptible &&
          this.eventEmitter.listenerCount('stop') > 0
        ) {
          console.log('[TTS] Streaming interrupted');
          break;
        }
        const buf = Buffer.from(chunk);
        chunks.push(buf);
        onChunk(buf.toString('base64'));
      }

      const audioData = Buffer.concat(chunks);
      const duration = this.estimateDuration(audioData.length);

      console.log(
        `[TTS] Streamed ${chunks.length} chunks, ${audioData.length} bytes, ~${duration.toFixed(1)}s audio`,
      );

      return { audioData, duration };
    } catch (error: any) {
      console.error('[TTS] ElevenLabs streaming error:', error.message);
      return { error: error.message };
    }
  }

  async speakWithElevenLabs(
    text: string,
    options: { interruptible?: boolean },
  ): Promise<TTSResult> {
    const cfg = await this.resolveTTSConfig();
    const apiKey = cfg.apiKey || process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return { error: 'ELEVENLABS_API_KEY not configured' };
    }

    try {
      const { ElevenLabsClient } = await import('elevenlabs');
      const client = new ElevenLabsClient({ apiKey });

      const audio = await client.textToSpeech.convertAsStream(this.voiceId, {
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true,
        },
      });

      const chunks: Buffer[] = [];
      for await (const chunk of audio) {
        if (
          options.interruptible &&
          this.eventEmitter.listenerCount('stop') > 0
        ) {
          console.log('[TTS] Interrupted');
          break;
        }
        chunks.push(Buffer.from(chunk));
      }

      const audioData = Buffer.concat(chunks);
      const duration = this.estimateDuration(audioData.length);

      console.log(
        `[TTS] Generated ${audioData.length} bytes, ~${duration.toFixed(1)}s audio`,
      );

      return { audioData, duration };
    } catch (error: any) {
      console.error('[TTS] ElevenLabs error:', error.message);
      return { error: error.message };
    }
  }

  async speakWithOpenAI(
    text: string,
    _options: { interruptible?: boolean },
  ): Promise<TTSResult> {
    const cfg = await this.resolveTTSConfig();
    const apiKey = cfg.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return { error: 'OPENAI_API_KEY not configured' };
    }

    try {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey });

      const voice = (process.env.OPENAI_TTS_VOICE || 'nova') as
        | 'alloy' | 'ash' | 'coral' | 'echo' | 'fable' | 'nova' | 'onyx' | 'sage' | 'shimmer';
      const model = (process.env.OPENAI_TTS_MODEL || 'tts-1') as
        | 'tts-1' | 'tts-1-hd' | 'gpt-4o-mini-tts';

      const response = await openai.audio.speech.create({
        model,
        voice,
        input: text,
        response_format: 'mp3',
      });

      const arrayBuffer = await response.arrayBuffer();
      const audioData = Buffer.from(arrayBuffer);
      const duration = this.estimateDuration(audioData.length);

      console.log(
        `[TTS] OpenAI generated ${audioData.length} bytes, ~${duration.toFixed(1)}s audio (voice: ${voice})`,
      );
      return { audioData, duration };
    } catch (error: any) {
      console.error('[TTS] OpenAI TTS error:', error.message);
      return { error: error.message };
    }
  }

  async speakWithKokoro(
    text: string,
    baseUrl: string,
    voice: string,
  ): Promise<TTSResult> {
    try {
      const response = await fetch(`${baseUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'kokoro',
          input: text,
          voice,
          response_format: 'wav',
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[TTS] Kokoro error (${response.status}): ${errText}`);
        return { error: `Kokoro API returned ${response.status}` };
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioData = Buffer.from(arrayBuffer);
      const duration = audioData.length / (24000 * 2);
      const duration2 = this.estimateDuration(audioData.length);

      console.log(
        `[TTS] Kokoro generated ${audioData.length} bytes, ~${duration.toFixed(1)}s audio (voice: ${voice})`,
      );
      return { audioData, duration: duration || duration2 };
    } catch (error: any) {
      console.error('[TTS] Kokoro error:', error.message);
      return { error: error.message };
    }
  }

  private estimateDuration(bytes: number): number {
    const bitrate = 128000;
    return (bytes * 8) / bitrate;
  }

  async stop(): Promise<void> {
    console.log('[TTS] Stop requested');
    this.eventEmitter.emit('stop');
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}
