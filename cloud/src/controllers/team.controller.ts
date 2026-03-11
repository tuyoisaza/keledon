import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class TeamConfigDto {
  sttProvider?: string;
  ttsProvider?: string;
  voskServerUrl?: string;
  voskModel?: string;
  deepgramApiKey?: string;
  elevenlabsApiKey?: string;
}

@Controller('api/teams')
export class TeamController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id/config')
  async getTeamConfig(@Param('id') teamId: string) {
    try {
      const team = await this.prisma.team.findUnique({
        where: { id: teamId },
        select: {
          id: true,
          name: true,
          sttProvider: true,
          ttsProvider: true,
          voskServerUrl: true,
          voskModel: true,
        }
      });

      if (!team) {
        return { error: 'Team not found', status: 404 };
      }

      return {
        teamId: team.id,
        teamName: team.name,
        sttProvider: team.sttProvider || 'vosk',
        ttsProvider: team.ttsProvider || 'elevenlabs',
        voskServerUrl: team.voskServerUrl,
        voskModel: team.voskModel,
      };
    } catch (error) {
      console.error('[TeamController] Error getting config:', error);
      return { error: error.message, status: 500 };
    }
  }

  @Get(':id')
  async getTeam(@Param('id') teamId: string) {
    try {
      const team = await this.prisma.team.findUnique({
        where: { id: teamId },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            }
          }
        }
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
          createdAt: true,
          _count: {
            select: {
              users: true,
              sessions: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return teams;
    } catch (error) {
      console.error('[TeamController] Error getting teams:', error);
      return { error: error.message, status: 500 };
    }
  }

  @Put(':id/config')
  async updateTeamConfig(
    @Param('id') teamId: string,
    @Body() config: TeamConfigDto
  ) {
    try {
      const allowedSttProviders = ['vosk', 'deepgram', 'webspeech'];
      const allowedTtsProviders = ['elevenlabs', 'webspeech'];

      const updateData: any = {};

      if (config.sttProvider && allowedSttProviders.includes(config.sttProvider)) {
        updateData.sttProvider = config.sttProvider;
      }

      if (config.ttsProvider && allowedTtsProviders.includes(config.ttsProvider)) {
        updateData.ttsProvider = config.ttsProvider;
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

      if (config.elevenlabsApiKey !== undefined) {
        updateData.elevenlabsApiKey = config.elevenlabsApiKey;
      }

      const team = await this.prisma.team.update({
        where: { id: teamId },
        data: updateData,
        select: {
          id: true,
          name: true,
          sttProvider: true,
          ttsProvider: true,
          voskServerUrl: true,
          voskModel: true,
        }
      });

      return {
        success: true,
        teamId: team.id,
        teamName: team.name,
        sttProvider: team.sttProvider,
        ttsProvider: team.ttsProvider,
        voskServerUrl: team.voskServerUrl,
        voskModel: team.voskModel,
      };
    } catch (error) {
      console.error('[TeamController] Error updating config:', error);
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
        }
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
