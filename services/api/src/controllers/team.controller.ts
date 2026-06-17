import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Req,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags } from '@nestjs/swagger';
import OpenAI from 'openai';

export class TeamConfigDto {
  sttProvider?: string;
  ttsProvider?: string;
  voskServerUrl?: string;
  voskModel?: string;
  deepgramApiKey?: string;
  elevenlabsApiKey?: string;

  // Speaches (Whisper STT) config
  speachesApiUrl?: string;
  speachesApiKey?: string;

  // LLM / AI Provider
  llmProvider?: string;
  openaiApiKey?: string;
  googleAiApiKey?: string;
  anthropicApiKey?: string;

  // TTS extended config
  ttsApiKey?: string;
  ttsVoiceId?: string;
  ttsEndpointUrl?: string;
}

@ApiTags('Teams')
@Controller('api/teams')
export class TeamController {
  constructor(private readonly prisma: PrismaService) {}

  private async getActorScope(req: any) {
    const requestUser = req?.user;
    if (!requestUser?.userId) {
      return {
        role: 'anonymous',
        companyId: null as string | null,
        teamId: null as string | null,
      };
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: requestUser.userId },
      select: { role: true, companyId: true, teamId: true },
    });

    return {
      role: dbUser?.role || requestUser.role || 'user',
      companyId: dbUser?.companyId || null,
      teamId: dbUser?.teamId || null,
    };
  }

  private teamScopeWhere(scope: {
    role: string;
    companyId: string | null;
    teamId: string | null;
  }) {
    if (scope.role === 'superadmin') return {};
    if (scope.companyId) return { brand: { companyId: scope.companyId } };
    if (scope.teamId) return { id: scope.teamId };
    return { id: '__NO_TEAM_ACCESS__' };
  }

  private async assertTeamAccess(teamId: string, req: any) {
    const scope = await this.getActorScope(req);
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        ...this.teamScopeWhere(scope),
      },
      select: { id: true },
    });
    if (!team) {
      throw new ForbiddenException('Team access denied');
    }
  }

  @Get()
  async listTeams(@Req() req: any) {
    try {
      const scope = await this.getActorScope(req);
      const teams = await this.prisma.team.findMany({
        where: this.teamScopeWhere(scope),
        include: {
          users: { select: { id: true } },
          keledons: { select: { id: true } },
          brand: {
            include: {
              company: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      return teams.map((team) => ({
        id: team.id,
        name: team.name,
        brandId: team.brandId,
        country: team.country,
        sttProvider: team.sttProvider,
        ttsProvider: team.ttsProvider,
        llmProvider: team.llmProvider,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        brand: team.brand
          ? {
              id: team.brand.id,
              name: team.brand.name,
              color: team.brand.color,
              companyId: team.brand.companyId,
              company: team.brand.company
                ? { id: team.brand.company.id, name: team.brand.company.name }
                : undefined,
            }
          : undefined,
        company: team.brand?.company
          ? { id: team.brand.company.id, name: team.brand.company.name }
          : undefined,
        _count: { users: team.users.length, keledons: team.keledons.length },
      }));
    } catch (error) {
      console.error('[TeamController] Error listing teams:', error);
      return { error: error.message, status: 500 };
    }
  }

  @Get(':id/config')
  async getTeamConfig(@Param('id') teamId: string, @Req() req: any) {
    try {
      await this.assertTeamAccess(teamId, req);
      const team = await this.prisma.team.findUnique({
        where: { id: teamId },
        select: {
          id: true,
          name: true,
          sttProvider: true,
          ttsProvider: true,
          llmProvider: true,
          voskServerUrl: true,
          voskModel: true,
          deepgramApiKey: true,
          speachesApiUrl: true,
          speachesApiKey: true,
          elevenlabsApiKey: true,
          openaiApiKey: true,
          googleAiApiKey: true,
          anthropicApiKey: true,
          ttsApiKey: true,
          ttsVoiceId: true,
          ttsEndpointUrl: true,
        },
      });

      if (!team) {
        return { error: 'Team not found', status: 404 };
      }

      return {
        teamId: team.id,
        teamName: team.name,
        sttProvider: team.sttProvider || 'vosk',
        ttsProvider: team.ttsProvider || 'elevenlabs',
        llmProvider: team.llmProvider || 'openai',
        vendorAdapter: 'web',
        voskConfig: {
          serverUrl: team.voskServerUrl || 'ws://localhost:9091',
          model: team.voskModel || 'vosk-model-small',
          sampleRate: 16000,
        },
        elevenlabsConfig: {
          apiKey: team.elevenlabsApiKey || '',
          voiceId: 'rachel',
        },
        // TTS extended config (DB-persisted)
        ttsApiKey: team.ttsApiKey || '',
        ttsVoiceId:
          team.ttsVoiceId || (team.ttsProvider === 'kokoro' ? 'ef_dora' : ''),
        ttsEndpointUrl: team.ttsEndpointUrl || '',
        deepgramConfig: {
          apiKey: team.deepgramApiKey || '',
        },
        // Speaches (Whisper-based STT) config
        speachesApiUrl:
          team.speachesApiUrl ||
          'https://speaches-production-c63f.up.railway.app',
        speachesApiKey: team.speachesApiKey || '',
        // LLM config
        openaiApiKey: team.openaiApiKey || '',
        googleAiApiKey: team.googleAiApiKey || '',
        anthropicApiKey: team.anthropicApiKey || '',
        vendorConfig: {},
      };
    } catch (error) {
      console.error('[TeamController] Error getting config:', error);
      return { error: error.message, status: 500 };
    }
  }

  private async validateOpenAiKey(apiKey: string): Promise<string | null> {
    try {
      const openai = new OpenAI({ apiKey });
      // Verify key by listing models (first page only)
      for await (const _ of openai.models.list()) break;
      return null; // valid
    } catch (err: any) {
      if (err?.status === 401) return '401: OpenAI rechazó la key (invalida o expirada)';
      if (err?.status === 429) return null; // rate limited ≠ invalid
      return `Error al validar: ${err?.message || err}`;
    }
  }

  @Get(':id/config/status')
  async getConfigStatus(@Param('id') teamId: string, @Req() req: any) {
    try {
      await this.assertTeamAccess(teamId, req);
      const team = await this.prisma.team.findUnique({
        where: { id: teamId },
        select: {
          id: true,
          name: true,
          llmProvider: true,
          sttProvider: true,
          ttsProvider: true,
          openaiApiKey: true,
          speachesApiKey: true,
        },
      });
      if (!team) return { error: 'Team not found', status: 404 };
      return {
        teamId: team.id,
        teamName: team.name,
        llmProvider: team.llmProvider || null,
        sttProvider: team.sttProvider || null,
        ttsProvider: team.ttsProvider || null,
        openaiKeySet: !!team.openaiApiKey,
        speachesKeySet: !!team.speachesApiKey,
      };
    } catch (error) {
      console.error('[TeamController] Error getting config status:', error);
      return { error: error.message, status: 500 };
    }
  }

  @Put(':id/config')
  async updateTeamConfig(
    @Param('id') teamId: string,
    @Body() config: TeamConfigDto,
    @Req() req: any,
  ) {
    try {
      await this.assertTeamAccess(teamId, req);
      const allowedSttProviders = ['vosk', 'deepgram', 'webspeech', 'speaches'];
      const allowedTtsProviders = [
        'elevenlabs',
        'webspeech',
        'kokoro',
        'openai-tts',
        'coqui',
      ];
      const allowedLlmProviders = ['openai', 'google', 'anthropic', 'ollama'];

      const updateData: any = {};

      if (
        config.sttProvider &&
        allowedSttProviders.includes(config.sttProvider)
      ) {
        updateData.sttProvider = config.sttProvider;
      }

      if (
        config.ttsProvider &&
        allowedTtsProviders.includes(config.ttsProvider)
      ) {
        updateData.ttsProvider = config.ttsProvider;
      }

      if (
        config.llmProvider &&
        allowedLlmProviders.includes(config.llmProvider)
      ) {
        updateData.llmProvider = config.llmProvider;
      }

      if (config.voskServerUrl !== undefined) {
        updateData.voskServerUrl = config.voskServerUrl;
      }

      if (config.voskModel !== undefined) {
        updateData.voskModel = config.voskModel;
      }

      if (config.deepgramApiKey !== undefined) {
        updateData.deepgramApiKey = config.deepgramApiKey;
      }

      // Speaches (Whisper STT) config
      if (config.speachesApiUrl !== undefined) {
        updateData.speachesApiUrl = config.speachesApiUrl;
      }
      if (config.speachesApiKey !== undefined) {
        updateData.speachesApiKey = config.speachesApiKey;
      }

      if (config.elevenlabsApiKey !== undefined) {
        updateData.elevenlabsApiKey = config.elevenlabsApiKey;
      }

      // LLM API keys
      if (config.openaiApiKey !== undefined) {
        if (config.openaiApiKey) {
          const validationError = await this.validateOpenAiKey(config.openaiApiKey);
          if (validationError) {
            throw new BadRequestException(`OpenAI API key invalida: ${validationError}`);
          }
        }
        updateData.openaiApiKey = config.openaiApiKey;
      }
      if (config.googleAiApiKey !== undefined) {
        updateData.googleAiApiKey = config.googleAiApiKey;
      }
      if (config.anthropicApiKey !== undefined) {
        updateData.anthropicApiKey = config.anthropicApiKey;
      }

      // TTS extended config
      if (config.ttsApiKey !== undefined) {
        updateData.ttsApiKey = config.ttsApiKey;
      }
      if (config.ttsVoiceId !== undefined) {
        updateData.ttsVoiceId = config.ttsVoiceId;
      }
      if (config.ttsEndpointUrl !== undefined) {
        updateData.ttsEndpointUrl = config.ttsEndpointUrl;
      }

      const team = await this.prisma.team.update({
        where: { id: teamId },
        data: updateData,
        select: {
          id: true,
          name: true,
          sttProvider: true,
          ttsProvider: true,
          llmProvider: true,
          voskServerUrl: true,
          voskModel: true,
          ttsApiKey: true,
          ttsVoiceId: true,
          ttsEndpointUrl: true,
        },
      });

      return {
        success: true,
        teamId: team.id,
        teamName: team.name,
        sttProvider: team.sttProvider,
        ttsProvider: team.ttsProvider,
        llmProvider: team.llmProvider,
        voskServerUrl: team.voskServerUrl,
        voskModel: team.voskModel,
        ttsApiKey: team.ttsApiKey,
        ttsVoiceId: team.ttsVoiceId,
        ttsEndpointUrl: team.ttsEndpointUrl,
      };
    } catch (error) {
      console.error('[TeamController] Error updating config:', error);
      return { error: error.message, status: 500 };
    }
  }

  @Get(':id')
  async getTeam(@Param('id') teamId: string, @Req() req: any) {
    try {
      await this.assertTeamAccess(teamId, req);
      const team = await this.prisma.team.findUnique({
        where: { id: teamId },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      });

      if (!team) {
        return { error: 'Team not found', status: 404 };
      }

      return team;
    } catch (error) {
      console.error('[TeamController] Error getting team:', error);
      return { error: error.message, status: 500 };
    }
  }

  @Get()
  async getAllTeams() {
    try {
      const teams = await this.prisma.team.findMany({
        select: {
          id: true,
          name: true,
          sttProvider: true,
          ttsProvider: true,
          llmProvider: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
              sessions: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return teams;
    } catch (error) {
      console.error('[TeamController] Error getting teams:', error);
      return { error: error.message, status: 500 };
    }
  }

  @Post()
  async createTeam(@Body() data: { name: string }) {
    try {
      const team = await this.prisma.team.create({
        data: {
          name: data.name,
          sttProvider: 'vosk',
          ttsProvider: 'elevenlabs',
          llmProvider: 'openai',
        },
      });

      return {
        success: true,
        teamId: team.id,
        teamName: team.name,
      };
    } catch (error) {
      console.error('[TeamController] Error creating team:', error);
      return { error: error.message, status: 500 };
    }
  }
}
