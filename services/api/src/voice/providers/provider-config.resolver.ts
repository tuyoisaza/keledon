import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VoiceProviderConfig } from './voice-provider.interface';

@Injectable()
export class ProviderConfigResolver {
  private readonly logger = new Logger(ProviderConfigResolver.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve voice provider configuration for a team.
   * Reads from the Team model in the database and returns a VoiceProviderConfig
   * with the configured provider names and credentials.
   */
  async resolveTeamConfig(teamId: string): Promise<VoiceProviderConfig> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      this.logger.warn(`Team ${teamId} not found, using defaults`);
      return this.defaultConfig(teamId);
    }

    // Determine which STT provider to use.
    // "vosk" and "webspeech" are browser-side; "speaches" runs server-side.
    const sttProvider = team.sttProvider || 'speaches';

    // TTS provider
    const ttsProvider = team.ttsProvider || 'speaches';

    // LLM provider (for Cloud Brain)
    const llmProvider = team.llmProvider || 'openai';

    // Voice provider — the unified pipeline provider
    const voiceProvider = (team as any).voiceProvider || 'keledon-realtime-pipeline';

    const config: VoiceProviderConfig = {
      teamId,
      voiceProvider,
      sttProvider,
      ttsProvider,
      llmProvider,
      sttApiKey: team.speachesApiKey || '',
      ttsApiKey: team.ttsApiKey || team.elevenlabsApiKey || '',
      llmApiKey: this.resolveLlmApiKey(team, llmProvider),
      voiceId: team.ttsVoiceId || undefined,
      speachesApiUrl: team.speachesApiUrl || undefined,
      vadEnabled: true,
      bargeInEnabled: true,
      // Pass through raw team data for adapter-specific fields
      teamRaw: team,
    };

    this.logger.debug(`Team ${teamId} config: STT=${sttProvider} TTS=${ttsProvider} LLM=${llmProvider}`);

    return config;
  }

  private resolveLlmApiKey(team: any, provider: string): string {
    switch (provider) {
      case 'openai': return team.openaiApiKey || '';
      case 'google': return team.googleAiApiKey || '';
      case 'anthropic': return team.anthropicApiKey || '';
      default: return '';
    }
  }

  private defaultConfig(teamId: string): VoiceProviderConfig {
    return {
      teamId,
      voiceProvider: 'keledon-realtime-pipeline',
      sttProvider: 'speaches',
      ttsProvider: 'speaches',
      llmProvider: 'openai',
      sttApiKey: '',
      ttsApiKey: '',
      llmApiKey: '',
      vadEnabled: true,
      bargeInEnabled: true,
    };
  }
}
