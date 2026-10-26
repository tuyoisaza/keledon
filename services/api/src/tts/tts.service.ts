import { voiceSettings, VoiceSettings, elevenVoiceSettings, profileMatches, configuredSpeachesVoice } from './voice-settings';
import { runtimeAiBudget } from '../llm/runtime-ai-budget';
import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import { MvpStoreService } from '../mvp/mvp-store.service';
import { PrismaService } from '../prisma/prisma.service';
import { getApiVersion } from '../version';
import type { TTSResult } from './tts.types';
import {
  detectLanguage,
  getSpeachesVoice,
  getSpeachesVoiceForLanguage,
} from './tts-language';
import { estimateDuration } from './tts-utils';
import {
  speakWithKokoro as requestKokoroAudio,
  speakWithSpeaches as requestSpeachesAudio,
} from './tts-http-providers';

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

  private trackProviderResult(
    provider: string,
    correlationId: string | undefined,
    operation: () => Promise<TTSResult>,
  ): Promise<TTSResult> {
    return runtimeAiBudget.trackProviderCall(
      provider,
      correlationId,
      operation,
      (result) => !result.error,
    );
  }

  private async resolveTTSConfig(teamId?: string): Promise<{
    providerId: string;
    apiKey: string;
    voiceId: string;
    apiUrl?: string;
    settings?: VoiceSettings;
  }> {
    // Try DB first if teamId provided
    if (teamId) {
      try {
        const team = await this.prisma.team.findUnique({
          where: { id: teamId },
          select: {
            ttsProvider: true,
            ttsVoiceProfileId: true, ttsVoiceSettings:true, brand:{select:{companyId:true}},
            ttsApiKey: true,
            elevenlabsApiKey: true,
            ttsVoiceId: true,
            ttsEndpointUrl: true,
            speachesApiUrl: true,
            speachesApiKey: true,
          },
        });
        if (team?.ttsProvider) {
          let settings=voiceSettings(team.ttsVoiceSettings,team.ttsProvider);
          if(team.ttsVoiceProfileId){const profile=await this.prisma.tenantVoiceProfile.findUnique({where:{id:team.ttsVoiceProfileId},include:{providerCatalog:true}});if(!profile || !profile.isEnabled || profile.companyId!==team.brand.companyId || !profileMatches(profile,team.ttsProvider)) throw Error('Voice profile unavailable');settings=voiceSettings({...voiceSettings({locale:profile.language,...(profile.config?JSON.parse(profile.config):{})},team.ttsProvider),...(team.ttsVoiceSettings?JSON.parse(team.ttsVoiceSettings):{})},team.ttsProvider);}
          return { settings:team.ttsVoiceSettings || team.ttsVoiceProfileId ? settings:undefined,
            providerId: team.ttsProvider,
            apiKey:
              team.ttsProvider === 'speaches'
                ? team.speachesApiKey || team.ttsApiKey || ''
                : team.ttsApiKey ||
                  (team.ttsProvider === 'elevenlabs'
                    ? team.elevenlabsApiKey
                    : '') ||
                  '',
            voiceId: settings.voiceId || team.ttsVoiceId || '',
            apiUrl:
              team.ttsProvider === 'speaches'
                ? team.speachesApiUrl || team.ttsEndpointUrl || undefined
                : team.ttsEndpointUrl || undefined,
          };
        }
      } catch {
        throw new Error('Configured team TTS unavailable');
      }
      throw new Error('Configured team TTS required');
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
      correlationId?: string;
    } = {},
  ): Promise<TTSResult> {
    if (
      typeof text !== 'string' ||
      !text.trim() ||
      text.length > 8000 ||
      process.env.KELEDON_VOICE_DISABLED === 'true'
    )
      return { error: 'Invalid or disabled speech request' };
    await runtimeAiBudget.run(
      `tts:${options.teamId || 'system'}`,
      undefined,
      () => Promise.resolve(),
    );
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
    if (options.teamId) {
      provider = providerId;
    } else if (providerId !== 'webspeech' && providerId !== 'auto') {
      provider = providerId;
    } else if (hasElevenLabs) {
      provider = 'elevenlabs';
    } else if (hasOpenAI) {
      provider = 'openai';
    } else {
      provider = 'mock';
    }

    console.log(
      `[v${getApiVersion()}] [TTS] Speaking with ${provider} (config providerId=${providerId}): chars=${text.length}`,
    );

    try {
      if (provider === 'kokoro') {
        const baseUrl =
          (ttsConfig as any).apiUrl ||
          (!options.teamId ? process.env.KOKORO_API_URL : undefined);
        if (!baseUrl) return { error: 'Configured TTS endpoint required' };
        const voice = ttsConfig.settings ? configuredSpeachesVoice(ttsConfig,text,options.forceLanguageVoice) : ttsConfig.voiceId || 'ef_dora';
        return await this.trackProviderResult(
          provider,
          options.correlationId,
          () => this.speakWithKokoro(text, baseUrl, voice, (ttsConfig as any).settings),
        );
      } else if (provider === 'speaches') {
        const speachesApiUrl = (ttsConfig as any).apiUrl as string | undefined;
        const baseUrl =
          speachesApiUrl ||
          (!options.teamId ? process.env.SPEACHES_API_URL : undefined);
        if (!baseUrl) return { error: 'Configured TTS endpoint required' };
        const voice = configuredSpeachesVoice(ttsConfig,text,options.forceLanguageVoice);
        return await this.trackProviderResult(
          provider,
          options.correlationId,
          () =>
            this.speakWithSpeaches(
              text,
              baseUrl,
              apiKeyFromStore ||
                (!options.teamId ? process.env.SPEACHES_API_KEY : '') ||
                '',
              voice, (ttsConfig as any).settings,
            ),
        );
      } else if (provider === 'elevenlabs') {
        return await this.trackProviderResult(
          provider,
          options.correlationId,
          () => this.speakWithElevenLabs(text, options),
        );
      } else if (provider === 'openai') {
        return await this.trackProviderResult(
          provider,
          options.correlationId,
          () => this.speakWithOpenAI(text, options),
        );
      } else {
        console.log('[TTS] Mock TTS mode (no provider configured)');
        return {
          error:
            'Configured provider requires browser-side TTS or explicit server provider',
        };
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
      correlationId?: string;
    } = {},
  ): Promise<TTSResult> {
    if (
      typeof text !== 'string' ||
      !text.trim() ||
      text.length > 8000 ||
      process.env.KELEDON_VOICE_DISABLED === 'true'
    )
      return { error: 'Invalid or disabled speech request' };
    await runtimeAiBudget.run(
      `tts:${options.teamId || 'system'}`,
      undefined,
      () => Promise.resolve(),
    );
    const teamConfig = options.teamId
      ? await this.resolveTTSConfig(options.teamId)
      : null;
    const ttsConfig = teamConfig || this.mvpStore.getTTSConfig();
    const providerId = ttsConfig.providerId || 'webspeech';
    const apiKeyFromStore = ttsConfig.apiKey;

    const hasElevenLabs = !!(apiKeyFromStore || process.env.ELEVENLABS_API_KEY);
    const hasOpenAI = !!(apiKeyFromStore || process.env.OPENAI_API_KEY);

    let provider: string;
    if (options.teamId) {
      provider = providerId;
    } else if (providerId !== 'webspeech' && providerId !== 'auto') {
      provider = providerId;
    } else if (hasElevenLabs) {
      provider = 'elevenlabs';
    } else if (hasOpenAI) {
      provider = 'openai';
    } else {
      provider = 'mock';
    }

    console.log(
      `[v${getApiVersion()}] [TTS] Streaming with ${provider}: chars=${text.length}`,
    );

    if (provider === 'kokoro') {
      const baseUrl =
        (ttsConfig as any).apiUrl ||
        (!options.teamId ? process.env.KOKORO_API_URL : undefined);
      if (!baseUrl) return { error: 'Configured TTS endpoint required' };
      const voice = ttsConfig.settings ? configuredSpeachesVoice(ttsConfig,text,options.forceLanguageVoice) : ttsConfig.voiceId || 'ef_dora';
      const result = await this.trackProviderResult(
        provider,
        options.correlationId,
        () => this.speakWithKokoro(text, baseUrl, voice, (ttsConfig as any).settings),
      );
      if (result.audioData && result.audioData.length > 0) {
        // Kokoro returns a complete WAV file. Do not split WAV bytes into arbitrary
        // chunks: each browser Audio() playback needs the RIFF header.
        onChunk(result.audioData.toString('base64'));
      }
      return result;
    } else if (provider === 'speaches') {
      const speachesApiUrl = (ttsConfig as any).apiUrl as string | undefined;
      const baseUrl =
        speachesApiUrl ||
        (!options.teamId ? process.env.SPEACHES_API_URL : undefined);
      if (!baseUrl) return { error: 'Configured TTS endpoint required' };
      const voice = configuredSpeachesVoice(ttsConfig,text,options.forceLanguageVoice);
      const result = await this.trackProviderResult(
        provider,
        options.correlationId,
        () =>
          this.speakWithSpeaches(
            text,
            baseUrl,
            apiKeyFromStore ||
              (!options.teamId ? process.env.SPEACHES_API_KEY : '') ||
              '',
            voice, (ttsConfig as any).settings,
          ),
      );
      if (result.audioData && result.audioData.length > 0) {
        console.log(
          `[TTS] Speaches encoded MP3 ${result.audioData.length} bytes (voice: ${voice}, lang: ${detectLanguage(text)})`,
        );
        onChunk(result.audioData.toString('base64'));
      }
      return result;
    } else if (provider === 'elevenlabs') {
      return await this.trackProviderResult(
        provider,
        options.correlationId,
        () => this.streamWithElevenLabs(text, onChunk, options),
      );
    } else if (provider === 'openai') {
      // OpenAI's TTS isn't streaming, so generate full audio then chunk it
      const result = await this.trackProviderResult(
        provider,
        options.correlationId,
        () => this.speakWithOpenAI(text, options),
      );
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
      return {
        error:
          'Configured provider requires browser-side TTS or explicit server provider',
      };
    }
  }

  async streamWithElevenLabs(
    text: string,
    onChunk: (base64: string) => void,
    options: { interruptible?: boolean; teamId?: string },
  ): Promise<TTSResult> {
    const ttsConfig = options.teamId
      ? await this.resolveTTSConfig(options.teamId)
      : this.mvpStore.getTTSConfig();
    const apiKey =
      ttsConfig.apiKey ||
      (!options.teamId ? process.env.ELEVENLABS_API_KEY : undefined);

    if (!apiKey) {
      return { error: 'ELEVENLABS_API_KEY not configured' };
    }

    try {
      const { ElevenLabsClient } = await import('elevenlabs');
      const client = new ElevenLabsClient({ apiKey });

      const audio = await client.textToSpeech.convertAsStream(
        ttsConfig.voiceId || this.voiceId,
        {
          text,
          model_id: 'eleven_turbo_v2_5',
          ...((ttsConfig as any).settings?.locale?{language_code:(ttsConfig as any).settings.locale.split('-')[0]}:{}),
          voice_settings: {
            ...elevenVoiceSettings(ttsConfig),
          },
        },
        {
          timeoutInSeconds: 30,
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(30000),
        },
      );

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
      const duration = estimateDuration(audioData.length);

      console.log(
        `[TTS] Streamed ${chunks.length} chunks, ${audioData.length} bytes, ~${duration.toFixed(1)}s audio`,
      );

      return { audioData, duration };
    } catch {
      console.error('[TTS] ElevenLabs streaming request failed');
      return { error: 'ElevenLabs provider request failed' };
    }
  }

  async speakWithElevenLabs(
    text: string,
    options: { interruptible?: boolean; teamId?: string },
  ): Promise<TTSResult> {
    const ttsConfig = options.teamId
      ? await this.resolveTTSConfig(options.teamId)
      : this.mvpStore.getTTSConfig();
    const apiKey =
      ttsConfig.apiKey ||
      (!options.teamId ? process.env.ELEVENLABS_API_KEY : undefined);

    if (!apiKey) {
      console.log('[TTS] ElevenLabs API key not configured, using mock');
      return { error: 'ELEVENLABS_API_KEY not configured' };
    }

    try {
      const { ElevenLabsClient } = await import('elevenlabs');
      const client = new ElevenLabsClient({ apiKey });

      const audio = await client.textToSpeech.convertAsStream(
        ttsConfig.voiceId || this.voiceId,
        {
          text,
          model_id: 'eleven_turbo_v2_5',
          ...((ttsConfig as any).settings?.locale?{language_code:(ttsConfig as any).settings.locale.split('-')[0]}:{}),
          voice_settings: {
            ...elevenVoiceSettings(ttsConfig),
          },
        },
        {
          timeoutInSeconds: 30,
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(30000),
        },
      );

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
      const duration = estimateDuration(audioData.length);

      console.log(
        `[TTS] Generated ${audioData.length} bytes, ~${duration.toFixed(1)}s audio`,
      );

      return { audioData, duration };
    } catch {
      console.error('[TTS] ElevenLabs provider request failed');
      return { error: 'ElevenLabs provider request failed' };
    }
  }

  async speakWithOpenAI(
    text: string,
    _options: { interruptible?: boolean; teamId?: string },
  ): Promise<TTSResult> {
    const ttsConfig = _options.teamId
      ? await this.resolveTTSConfig(_options.teamId)
      : this.mvpStore.getTTSConfig();
    const apiKey =
      ttsConfig.apiKey ||
      (!_options.teamId ? process.env.OPENAI_API_KEY : undefined);
    if (!apiKey) {
      return { error: 'OPENAI_API_KEY not configured' };
    }

    try {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey, timeout: 30000, maxRetries: 0 });

      const voice = (ttsConfig.voiceId || process.env.OPENAI_TTS_VOICE || 'nova') as
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
        'tts-1' | 'tts-1-hd' | 'gpt-4o-mini-tts';

      const response = await openai.audio.speech.create({
        model,
        voice,
        input: text,
        speed: (ttsConfig as any).settings?.speed || 1,
        response_format: 'mp3',
      });

      const arrayBuffer = await response.arrayBuffer();
      const audioData = Buffer.from(arrayBuffer);
      const duration = estimateDuration(audioData.length);

      console.log(
        `[TTS] OpenAI generated ${audioData.length} bytes, ~${duration.toFixed(1)}s audio (voice: ${voice})`,
      );
      return { audioData, duration };
    } catch {
      console.error('[TTS] OpenAI TTS provider request failed');
      return { error: 'OpenAI TTS provider request failed' };
    }
  }

  async speakWithKokoro(
    text: string,
    baseUrl: string,
    voice: string,
    settings?: VoiceSettings,
  ): Promise<TTSResult> {
    return requestKokoroAudio(text, baseUrl, voice, settings);
  }

  async speakWithSpeaches(
    text: string,
    baseUrl: string,
    apiKey: string,
    voice: string,
    settings?: VoiceSettings,
  ): Promise<TTSResult> {
    return requestSpeachesAudio(text, baseUrl, apiKey, voice, settings);
  }

  async warmSpeachesForTeam(
    teamId?: string,
    language: 'es' | 'en' = 'es',
  ): Promise<void> {
    const warmupKey = `${teamId || 'default'}:${language}`;
    if (this.speachesWarmups.has(warmupKey)) return;
    if (this.speachesWarmups.size >= 5000)
      throw new Error('Voice warmup identity limit reached');
    await runtimeAiBudget.run(`tts:${teamId || 'system'}`, undefined, () =>
      Promise.resolve(),
    );
    this.speachesWarmups.add(warmupKey);
    const startedAt = Date.now();
    const ttsConfig = teamId
      ? await this.resolveTTSConfig(teamId)
      : this.mvpStore.getTTSConfig();
    if ((ttsConfig.providerId || '').toLowerCase() !== 'speaches') return;
    const speachesApiUrl = (ttsConfig as any).apiUrl as string | undefined;
    const baseUrl =
      speachesApiUrl || (!teamId ? process.env.SPEACHES_API_URL : undefined);
    if (!baseUrl) throw new Error('Configured TTS endpoint required');
    const voice = getSpeachesVoiceForLanguage(language);
    const warmText = language === 'es' ? 'Hola.' : 'Hello.';
    console.log(
      `[TTS] Speaches warmup start team=${teamId || 'default'} lang=${language} voice=${voice}`,
    );
    const result = await this.speakWithSpeaches(
      warmText,
      baseUrl,
      ttsConfig.apiKey || (!teamId ? process.env.SPEACHES_API_KEY : '') || '',
      voice,
    );
    console.log(
      `[TTS] Speaches warmup done team=${teamId || 'default'} lang=${language} voice=${voice} elapsed=${Date.now() - startedAt}ms bytes=${result.audioData?.length || 0} error=${result.error || 'none'}`,
    );
  }

  stop(): Promise<void> {
    console.log('[TTS] Stop requested');
    this.eventEmitter.emit('stop');
    return Promise.resolve();
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}
