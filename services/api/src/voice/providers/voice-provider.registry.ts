import { Injectable, Logger } from '@nestjs/common';
import {
  VoiceProvider,
  VoiceProviderConfig,
  VoicePipelineStatus,
  ProviderHealth,
} from './voice-provider.interface';
import { KeledonRealtimePipelineProvider } from './keledon-realtime-pipeline.provider';
import { TTSService } from '../../tts/tts.service';
import { LLMService } from '../../llm/llm.service';

/**
 * Registry of VoiceProvider instances.
 *
 * Resolves provider config for a team/tenant, instantiates the appropriate
 * provider, and exposes aggregate pipeline status.
 *
 * Fase 2: now supports keledon-realtime-pipeline as the primary provider.
 */
@Injectable()
export class VoiceProviderRegistry {
  private readonly logger = new Logger(VoiceProviderRegistry.name);
  private readonly sessions = new Map<string, { provider: VoiceProvider; config: VoiceProviderConfig }>();

  constructor(
    private readonly ttsService: TTSService,
    private readonly llmService?: LLMService,
  ) {}

  /**
   * Create or retrieve a provider instance for the given session.
   * Uses the keledon-realtime-pipeline provider when configured.
   */
  async getOrCreateProvider(
    sessionId: string,
    config: VoiceProviderConfig,
  ): Promise<VoiceProvider> {
    const existing = this.sessions.get(sessionId);
    if (existing) return existing.provider;

    const provider = await this.createProvider(config);
    await provider.startSession(sessionId);
    this.sessions.set(sessionId, { provider, config });
    this.logger.log(`Provider ${provider.id} assigned to session ${sessionId}`);
    return provider;
  }

  /**
   * Get aggregate pipeline status for a session.
   */
  getPipelineStatus(sessionId: string): VoicePipelineStatus | null {
    const entry = this.sessions.get(sessionId);
    if (!entry) return null;
    return entry.provider.getStatus();
  }

  /**
   * Clean up session resources.
   */
  async endSession(sessionId: string): Promise<void> {
    const entry = this.sessions.get(sessionId);
    if (entry) {
      await entry.provider.stopSession(sessionId);
      await entry.provider.destroy().catch(() => {});
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Instantiate the correct provider based on config.
   * Currently returns keledon-realtime-pipeline for all sessions.
   */
  private async createProvider(config: VoiceProviderConfig): Promise<VoiceProvider> {
    const provider = new KeledonRealtimePipelineProvider(
      this.ttsService,
      this.llmService,
    );
    await provider.initialize(config);
    return provider;
  }
}
