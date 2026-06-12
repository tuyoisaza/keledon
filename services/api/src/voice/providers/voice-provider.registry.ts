import { Injectable } from '@nestjs/common';
import {
  VoiceProvider,
  VoiceProviderConfig,
  VoicePipelineStatus,
  ProviderStatus,
  ProviderHealth,
} from './voice-provider.interface';

/**
 * Registry of VoiceProvider instances.
 *
 * Responsibilities:
 * - Resolve provider config for a team
 * - Instantiate and cache provider instances
 * - Expose aggregate pipeline status
 * - Handle cleanup on session end
 *
 * This is the Fase 1 skeleton — providers are resolved from team config
 * but actual audio/STT/TTS routing still happens through the existing
 * BrainPage / voice.gateway.ts / tts.service.ts until Fase 2.
 */
@Injectable()
export class VoiceProviderRegistry {
  private readonly sessions = new Map<string, { provider: VoiceProvider; config: VoiceProviderConfig }>();

  /**
   * Create or retrieve a provider instance for the given session.
   */
  async getOrCreateProvider(
    sessionId: string,
    config: VoiceProviderConfig,
  ): Promise<VoiceProvider> {
    const existing = this.sessions.get(sessionId);
    if (existing) return existing.provider;

    // For now we return a status provider that reports the resolved config.
    // In Fase 2 this will instantiate the actual realtime-pipeline provider.
    const statusProvider = this.createStatusProvider(config);
    await statusProvider.initialize(config);
    this.sessions.set(sessionId, { provider: statusProvider, config });
    return statusProvider;
  }

  /**
   * Get aggregate pipeline status for a session.
   */
  getPipelineStatus(sessionId: string): VoicePipelineStatus | null {
    const entry = this.sessions.get(sessionId);
    if (!entry) return null;
    const { provider, config } = entry;
    return {
      sessionId,
      stt: this.makeStatus(config.sttProvider, 'stt', config.sttApiKey.length > 0),
      tts: this.makeStatus(config.ttsProvider, 'tts', config.ttsApiKey.length > 0 || config.ttsProvider !== 'speaches'),
      llm: this.makeStatus(config.llmProvider, 'llm', config.llmApiKey.length > 0),
      vadEnabled: config.vadEnabled,
      bargeInEnabled: config.bargeInEnabled,
    };
  }

  /**
   * Clean up session resources.
   */
  async endSession(sessionId: string): Promise<void> {
    const entry = this.sessions.get(sessionId);
    if (entry) {
      await entry.provider.destroy().catch(() => {});
      this.sessions.delete(sessionId);
    }
  }

  private createStatusProvider(config: VoiceProviderConfig): VoiceProvider {
    const providerId = `${config.sttProvider}/${config.ttsProvider}/${config.llmProvider}`;
    let storedConfig: VoiceProviderConfig = config;
    return {
      id: providerId,
      async initialize(cfg: VoiceProviderConfig) { storedConfig = cfg; },
      async startSession(sid: string) {},
      async stopSession(sid: string) {},
      async onAudioInput(audio: { data: string; format: string }) {},
      async speak(text: string, interruptible: boolean) {},
      async interrupt(reason: string) {},
      getStatus(): ProviderStatus {
        return { id: providerId, name: providerId, kind: 'stt', health: 'unknown', keyConfigured: false };
      },
      async destroy() {},
    };
  }

  private makeStatus(id: string, kind: 'stt' | 'tts' | 'llm', keyConfigured: boolean): ProviderStatus {
    const names: Record<string, string> = {
      speaches: 'Speaches',
      openai: 'OpenAI',
      google: 'Google Gemini',
      anthropic: 'Anthropic Claude',
      vosk: 'Vosk',
      deepgram: 'Deepgram',
      webspeech: 'Web Speech',
      kokoro: 'Kokoro',
      elevenlabs: 'ElevenLabs',
      mock: 'Mock',
    };
    return {
      id,
      name: names[id] || id,
      kind,
      health: id && id !== 'none' && id !== 'mock' ? 'ready' : 'unknown',
      keyConfigured,
      lastChecked: new Date().toISOString(),
    };
  }
}
