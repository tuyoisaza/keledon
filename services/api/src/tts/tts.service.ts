import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import { MvpStoreService } from '../mvp/mvp-store.service';
import { PrismaService } from '../prisma/prisma.service';
import { getApiVersion } from '../version';

export interface TTSResult {
  audioData?: Buffer;
  duration?: number;
  error?: string;
  voice?: string;
  language?: 'es' | 'en' | 'other';
  elapsedMs?: number;
}

@Injectable()
export class TTSService {
  private eventEmitter = new EventEmitter();
  private currentStream: Readable | null = null;
  private readonly speachesWarmups = new Set<string>();
  private voiceId = process.env.ELEVENLABS_VOICE_ID || 'pFZP5JQG7iQjIQuC4Bku';

  constructor(
    private readonly mvpStore: MvpStoreService,
    private readonly prisma: PrismaService,
  ) {
    console.log('[TTS] TTSService initialized');
  }

  private async resolveTTSConfig(teamId?: string): Promise<{
    providerId: string;
    apiKey: string;
    voiceId: string;
    apiUrl?: string;
  }> {
    // Try DB first if teamId provided
    if (teamId) {
      try {
        const team = await this.prisma.team.findUnique({
          where: { id: teamId },
          select: {
            ttsProvider: true,
            ttsApiKey: true,
            ttsVoiceId: true,
            ttsEndpointUrl: true,
            speachesApiUrl: true,
            speachesApiKey: true,
          },
        });
        if (team?.ttsProvider) {
          return {
            providerId: team.ttsProvider,
            apiKey:
              team.ttsProvider === 'speaches'
                ? team.speachesApiKey || team.ttsApiKey || ''
                : team.ttsApiKey || '',
            voiceId: team.ttsVoiceId || '',
            apiUrl:
              team.ttsProvider === 'speaches'
                ? team.speachesApiUrl || team.ttsEndpointUrl || undefined
                : team.ttsEndpointUrl || undefined,
          };
        }
      } catch (e) {
        console.warn(
          '[TTS] Failed to fetch team config from DB, falling back to store:',
          e,
        );
      }
    }

    // Fall back to MvpStore (file-based config)
    const ttsConfig = this.mvpStore.getTTSConfig();
    return {
      providerId: ttsConfig.providerId || 'webspeech',
      apiKey: ttsConfig.apiKey || '',
      voiceId: ttsConfig.voiceId || '',
    };
  }

  async speak(
    text: string,
    options: {
      interruptible?: boolean;
      teamId?: string;
      forceLanguageVoice?: boolean;
    } = {},
  ): Promise<TTSResult> {
    // Provider selection: DB > file config > env vars > default
    const teamConfig = options.teamId
      ? await this.resolveTTSConfig(options.teamId)
      : null;
    const ttsConfig = teamConfig || this.mvpStore.getTTSConfig();
    const providerId = ttsConfig.providerId || 'webspeech';
    const apiKeyFromStore = ttsConfig.apiKey;

    const hasElevenLabs = !!(apiKeyFromStore || process.env.ELEVENLABS_API_KEY);
    const hasOpenAI = !!(apiKeyFromStore || process.env.OPENAI_API_KEY);

    let provider: string;
    if (providerId !== 'webspeech' && providerId !== 'auto') {
      provider = providerId;
    } else if (hasElevenLabs) {
      provider = 'elevenlabs';
    } else if (hasOpenAI) {
      provider = 'openai';
    } else {
      provider = 'mock';
    }

    console.log(
      `[v${getApiVersion()}] [TTS] Speaking with ${provider} (config providerId=${providerId}): "${text.substring(0, 50)}..."`,
    );

    try {
      if (provider === 'kokoro') {
        const baseUrl =
          apiKeyFromStore ||
          'https://kokoro-api-production-0bfa.up.railway.app';
        const voice = ttsConfig.voiceId || 'ef_dora';
        return await this.speakWithKokoro(text, baseUrl, voice);
      } else if (provider === 'speaches') {
        const speachesApiUrl = (ttsConfig as any).apiUrl as string | undefined;
        const baseUrl =
          speachesApiUrl || 'https://speaches-production-c63f.up.railway.app';
        const voice = this.getSpeachesVoice(
          text,
          ttsConfig.voiceId,
          options.forceLanguageVoice,
        );
        return await this.speakWithSpeaches(
          text,
          baseUrl,
          apiKeyFromStore || process.env.SPEACHES_API_KEY || '',
          voice,
        );
      } else if (provider === 'elevenlabs') {
        return await this.speakWithElevenLabs(text, options);
      } else if (provider === 'openai') {
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
   * The callback receives base64-encoded audio chunks as they arrive.
   */
  async speakStreaming(
    text: string,
    onChunk: (base64: string) => void,
    options: {
      interruptible?: boolean;
      teamId?: string;
      forceLanguageVoice?: boolean;
    } = {},
  ): Promise<TTSResult> {
    const teamConfig = options.teamId
      ? await this.resolveTTSConfig(options.teamId)
      : null;
    const ttsConfig = teamConfig || this.mvpStore.getTTSConfig();
    const providerId = ttsConfig.providerId || 'webspeech';
    const apiKeyFromStore = ttsConfig.apiKey;

    const hasElevenLabs = !!(apiKeyFromStore || process.env.ELEVENLABS_API_KEY);
    const hasOpenAI = !!(apiKeyFromStore || process.env.OPENAI_API_KEY);

    let provider: string;
    if (providerId !== 'webspeech' && providerId !== 'auto') {
      provider = providerId;
    } else if (hasElevenLabs) {
      provider = 'elevenlabs';
    } else if (hasOpenAI) {
      provider = 'openai';
    } else {
      provider = 'mock';
    }

    console.log(
      `[v${getApiVersion()}] [TTS] Streaming with ${provider}: "${text.substring(0, 50)}..."`,
    );

    if (provider === 'kokoro') {
      const baseUrl =
        apiKeyFromStore || 'https://kokoro-api-production-0bfa.up.railway.app';
      const voice = ttsConfig.voiceId || 'ef_dora';
      const result = await this.speakWithKokoro(text, baseUrl, voice);
      if (result.audioData && result.audioData.length > 0) {
        // Kokoro returns a complete WAV file. Do not split WAV bytes into arbitrary
        // chunks: each browser Audio() playback needs the RIFF header.
        onChunk(result.audioData.toString('base64'));
      }
      return result;
    } else if (provider === 'speaches') {
      const speachesApiUrl = (ttsConfig as any).apiUrl as string | undefined;
      const baseUrl =
        speachesApiUrl || 'https://speaches-production-c63f.up.railway.app';
      const voice = this.getSpeachesVoice(
        text,
        ttsConfig.voiceId,
        options.forceLanguageVoice,
      );
      const result = await this.speakWithSpeaches(
        text,
        baseUrl,
        apiKeyFromStore || process.env.SPEACHES_API_KEY || '',
        voice,
      );
      if (result.audioData && result.audioData.length > 0) {
        console.log(
          `[TTS] Speaches encoded MP3 ${result.audioData.length} bytes (voice: ${voice}, lang: ${this.detectLanguage(text)})`,
        );
        onChunk(result.audioData.toString('base64'));
      }
      return result;
    } else if (provider === 'elevenlabs') {
      return await this.streamWithElevenLabs(text, onChunk, options);
    } else if (provider === 'openai') {
      // OpenAI's TTS isn't streaming, so generate full audio then chunk it
      const result = await this.speakWithOpenAI(text, options);
      if (result.audioData && result.audioData.length > 0) {
        const chunkSize = 32000; // ~1s of MP3 audio
        for (let i = 0; i < result.audioData.length; i += chunkSize) {
          const chunk = result.audioData.slice(
            i,
            Math.min(i + chunkSize, result.audioData.length),
          );
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
    const ttsConfig = this.mvpStore.getTTSConfig();
    const apiKey = ttsConfig.apiKey || process.env.ELEVENLABS_API_KEY;

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
    const ttsConfig = this.mvpStore.getTTSConfig();
    const apiKey = ttsConfig.apiKey || process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      console.log('[TTS] ElevenLabs API key not configured, using mock');
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
    const ttsConfig = this.mvpStore.getTTSConfig();
    const apiKey = ttsConfig.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { error: 'OPENAI_API_KEY not configured' };
    }

    try {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey });

      const voice = (process.env.OPENAI_TTS_VOICE || 'nova') as
        | 'alloy'
        | 'ash'
        | 'coral'
        | 'echo'
        | 'fable'
        | 'nova'
        | 'onyx'
        | 'sage'
        | 'shimmer';
      const model = (process.env.OPENAI_TTS_MODEL || 'tts-1') as
        | 'tts-1'
        | 'tts-1-hd'
        | 'gpt-4o-mini-tts';

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
      // WAV at 24kHz: duration = bytes / (sampleRate * channels * bitsPerSample/8)
      const duration = audioData.length / (24000 * 2); // 24kHz, 16-bit, mono
      // Fallback: OpenAI-style estimate
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

  async speakWithSpeaches(
    text: string,
    baseUrl: string,
    apiKey: string,
    voice: string,
  ): Promise<TTSResult> {
    try {
      const startedAt = Date.now();
      const lang = this.detectLanguage(text);
      console.log(
        `[TTS] Speaches request start voice=${voice} lang=${lang} textLen=${text.length}`,
      );
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
      const response = await fetch(
        `${baseUrl.replace(/\/+$/, '')}/v1/audio/speech`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'speaches-ai/Kokoro-82M-v1.0-ONNX',
            input: text,
            voice,
            response_format: 'mp3',
            speed: 1.15,
          }),
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[TTS] Speaches error (${response.status}): ${errText}`);
        return {
          error: `Speaches API returned ${response.status}: ${errText.substring(0, 200)}`,
        };
      }

      const arrayBuffer = await response.arrayBuffer();
      const elapsedMs = Date.now() - startedAt;
      const audioData = Buffer.from(arrayBuffer);
      const duration = this.estimateDuration(audioData.length);
      console.log(
        `[TTS] Speaches MP3 ${audioData.length} bytes, ~${duration.toFixed(1)}s audio (voice: ${voice}, lang: ${lang}, elapsed=${elapsedMs}ms)`,
      );
      if (audioData.length === 0) {
        return { error: 'Speaches returned empty audio' };
      }
      return { audioData, duration, voice, language: lang, elapsedMs };
    } catch (error: any) {
      console.error('[TTS] Speaches error:', error.message);
      return { error: error.message };
    }
  }

  private estimateWavOrCompressedDuration(audioData: Buffer): number {
    const wavDuration = this.estimateWavDuration(audioData);
    return wavDuration || this.estimateDuration(audioData.length);
  }

  async warmSpeachesForTeam(
    teamId?: string,
    language: 'es' | 'en' = 'es',
  ): Promise<void> {
    const warmupKey = `${teamId || 'default'}:${language}`;
    if (this.speachesWarmups.has(warmupKey)) return;
    this.speachesWarmups.add(warmupKey);
    const startedAt = Date.now();
    const ttsConfig = teamId
      ? await this.resolveTTSConfig(teamId)
      : this.mvpStore.getTTSConfig();
    if ((ttsConfig.providerId || '').toLowerCase() !== 'speaches') return;
    const speachesApiUrl = (ttsConfig as any).apiUrl as string | undefined;
    const baseUrl =
      speachesApiUrl || 'https://speaches-production-c63f.up.railway.app';
    const voice = this.getSpeachesVoiceForLanguage(language);
    const warmText = language === 'es' ? 'Hola.' : 'Hello.';
    console.log(
      `[TTS] Speaches warmup start team=${teamId || 'default'} lang=${language} voice=${voice}`,
    );
    const result = await this.speakWithSpeaches(
      warmText,
      baseUrl,
      ttsConfig.apiKey || process.env.SPEACHES_API_KEY || '',
      voice,
    );
    console.log(
      `[TTS] Speaches warmup done team=${teamId || 'default'} lang=${language} voice=${voice} elapsed=${Date.now() - startedAt}ms bytes=${result.audioData?.length || 0} error=${result.error || 'none'}`,
    );
  }

  /**
   * Detect dominant language in text: 'es' (Spanish) or 'en' (English) or 'other'.
   * Uses simple character frequency heuristics — no external API.
   */
  private detectLanguage(text: string): 'es' | 'en' | 'other' {
    if (!text || text.length < 2) return 'en';
    const lower = text.toLowerCase().trim();

    // Spanish-specific character patterns
    const spanishChars = (lower.match(/[áéíóúñü¿¡]/g) || []).length;

    // Common Spanish function words (high frequency)
    const spanishWords = [
      'el',
      'la',
      'los',
      'las',
      'de',
      'del',
      'en',
      'un',
      'una',
      'que',
      'es',
      'por',
      'para',
      'con',
      'su',
      'al',
      'lo',
      'como',
      'más',
      'pero',
      'sus',
      'le',
      'ya',
      'este',
      'esta',
      'entre',
      'pero',
      'todo',
      'también',
      'porque',
      'bien',
      'muy',
      'sin',
      'sobre',
      'tiene',
      'ser',
      'hay',
      'esa',
      'ese',
      'eso',
      'era',
      'han',
      'ella',
      'ello',
      'ellos',
      'está',
      'están',
      'estoy',
      'estamos',
      'estáis',
      'están',
      'hola',
      'gracias',
      'bueno',
      'buena',
      'adiós',
      'sí',
      'no',
      'cómo',
      'cuándo',
      'dónde',
      'qué',
      'quién',
      'cuál',
      'me',
      'te',
      'se',
      'nos',
      'os',
      'lo',
      'la',
      'le',
      'pero',
      'sino',
      'cuando',
      'donde',
      'como',
      'quien',
    ];
    const words = lower.split(/\s+/);
    const spanishWordCount = words.filter((w) =>
      spanishWords.includes(w),
    ).length;
    const totalWords = words.length || 1;
    const spanishRatio = (spanishChars + spanishWordCount) / totalWords;

    // English-specific common words (high frequency, low chance of Spanish overlap)
    const englishWords = [
      'the',
      'and',
      'you',
      'for',
      'are',
      'all',
      'but',
      'not',
      'have',
      'has',
      'had',
      'was',
      'were',
      'been',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'shall',
      'can',
      'does',
      'did',
      'with',
      'this',
      'that',
      'from',
      'they',
      'them',
      'their',
      'what',
      'when',
      'where',
      'which',
      'who',
      'whom',
      'why',
      'how',
      'than',
      'then',
      'just',
      'about',
      'also',
      'very',
      'too',
      'here',
      'there',
    ];
    const englishWordCount = words.filter((w) =>
      englishWords.includes(w),
    ).length;

    // Decision: if Spanish ratio is high enough, classify as Spanish
    if (spanishRatio > 0.12) return 'es';
    // If English words dominate and Spanish ratio is very low, classify as English
    if (englishWordCount > 0 && spanishRatio < 0.05) return 'en';
    // Default to English for short/ambiguous text
    return 'en';
  }

  /**
   * Map detected language + optional configured voiceId to a Speaches Kokoro voice.
   * In voice/call mode, language wins over team default voice so Spanish replies never use an English voice.
   */
  private getSpeachesVoice(
    text: string,
    configuredVoiceId?: string | null,
    forceLanguageVoice = false,
  ): string {
    const lang = this.detectLanguage(text);
    const languageVoice = this.getSpeachesVoiceForLanguage(lang);
    if (
      forceLanguageVoice ||
      !configuredVoiceId ||
      configuredVoiceId === 'ef_dora'
    ) {
      return languageVoice;
    }
    return configuredVoiceId; // Explicit non-default user choice outside forced call mode
  }

  private getSpeachesVoiceForLanguage(lang: 'es' | 'en' | 'other'): string {
    switch (lang) {
      case 'es':
        return 'ef_dora'; // Spanish Kokoro voice; af_* voices are English/American
      case 'en':
        return 'af_sky'; // American English female
      default:
        return 'af_sky';
    }
  }

  private estimateWavDuration(audioData: Buffer): number | null {
    if (audioData.length < 44) return null;
    if (audioData.subarray(0, 4).toString('ascii') !== 'RIFF') return null;
    if (audioData.subarray(8, 12).toString('ascii') !== 'WAVE') return null;

    let pos = 12;
    let byteRate = 0;
    let dataSize = 0;
    while (pos + 8 <= audioData.length) {
      const chunkId = audioData.subarray(pos, pos + 4).toString('ascii');
      const declaredSize = audioData.readUInt32LE(pos + 4);
      const payloadStart = pos + 8;
      const payloadRemaining = Math.max(0, audioData.length - payloadStart);
      const chunkSize =
        declaredSize === 0xffffffff || declaredSize > payloadRemaining
          ? payloadRemaining
          : declaredSize;
      if (
        chunkId === 'fmt ' &&
        chunkSize >= 16 &&
        payloadStart + 12 <= audioData.length
      ) {
        byteRate = audioData.readUInt32LE(payloadStart + 8);
      }
      if (chunkId === 'data') {
        dataSize = chunkSize;
        break;
      }
      pos = payloadStart + chunkSize + (chunkSize % 2);
    }

    return byteRate > 0 && dataSize > 0 ? dataSize / byteRate : null;
  }

  private finalizeWavHeader(audioData: Buffer): Buffer {
    if (audioData.length < 44) return audioData;
    if (audioData.subarray(0, 4).toString('ascii') !== 'RIFF') return audioData;
    if (audioData.subarray(8, 12).toString('ascii') !== 'WAVE')
      return audioData;

    const fixed = Buffer.from(audioData);
    let changed = false;
    const riffSize = Math.max(0, fixed.length - 8);
    if (fixed.readUInt32LE(4) !== riffSize) {
      fixed.writeUInt32LE(riffSize, 4);
      changed = true;
    }

    let pos = 12;
    while (pos + 8 <= fixed.length) {
      const chunkId = fixed.subarray(pos, pos + 4).toString('ascii');
      const declaredSize = fixed.readUInt32LE(pos + 4);
      const payloadStart = pos + 8;
      const payloadRemaining = Math.max(0, fixed.length - payloadStart);
      if (chunkId === 'data') {
        if (declaredSize !== payloadRemaining) {
          fixed.writeUInt32LE(payloadRemaining, pos + 4);
          changed = true;
        }
        break;
      }
      const chunkSize =
        declaredSize === 0xffffffff || declaredSize > payloadRemaining
          ? payloadRemaining
          : declaredSize;
      pos = payloadStart + chunkSize + (chunkSize % 2);
    }

    return changed ? fixed : audioData;
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
