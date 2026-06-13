import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Speaches')
@Controller('api/teams/:teamId/speaches')
export class SpeachesController {
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

  private normalizeTranscriptionLanguage(
    language?: string,
  ): 'es' | 'en' | 'auto' {
    const normalized = (language || '').toLowerCase();
    if (normalized.startsWith('es')) return 'es';
    if (normalized.startsWith('en')) return 'en';
    return 'auto';
  }

  private resolveSpeachesTranscriptionModel(
    requestedModel?: string,
    language?: string,
  ): string {
    const normalizedLanguage = this.normalizeTranscriptionLanguage(language);
    const model = requestedModel || 'whisper-1';
    const englishOnlyModel = 'Systran/faster-distil-whisper-small.en';
    const multilingualModel = 'Systran/faster-whisper-large-v3';

    // Legacy clients used whisper-1 or the English-only model for every turn.
    // Keep the fast English model for English, but route Spanish/auto final STT
    // to the installed multilingual model so Spanish speech is not decoded as English.
    if (model === 'whisper-1') {
      return normalizedLanguage === 'en' ? englishOnlyModel : multilingualModel;
    }
    if (model === englishOnlyModel && normalizedLanguage === 'es') {
      return multilingualModel;
    }
    return model;
  }

  @Post('transcriptions')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async transcribe(
    @Param('teamId') teamId: string,
    @UploadedFile() file: any,
    @Body() body: Record<string, string>,
    @Req() req: any,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Audio file is required');
    }

    const scope = await this.getActorScope(req);
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        ...this.teamScopeWhere(scope),
      },
      select: {
        id: true,
        name: true,
        sttProvider: true,
        speachesApiUrl: true,
        speachesApiKey: true,
      },
    });

    if (!team) {
      throw new ForbiddenException('Team access denied');
    }

    const apiUrl = (
      team.speachesApiUrl || 'https://speaches-production-c63f.up.railway.app'
    ).replace(/\/+$/, '');
    const apiKey =
      team.speachesApiKey ||
      process.env.SPEACHES_API_KEY ||
      process.env.API_KEY ||
      '';

    const form = new FormData();
    form.append(
      'file',
      new Blob([file.buffer], { type: file.mimetype || 'audio/webm' }),
      file.originalname || 'recording.webm',
    );
    const requestedModel = body.model || 'whisper-1';
    const speachesLanguage = this.normalizeTranscriptionLanguage(body.language);
    const speachesModel = this.resolveSpeachesTranscriptionModel(
      requestedModel,
      body.language,
    );
    console.log(
      `[STT] Speaches transcription proxy model=${speachesModel} requested=${requestedModel} language=${speachesLanguage} bytes=${file.buffer.length}`,
    );
    form.append('model', speachesModel);
    form.append('response_format', body.response_format || 'json');
    if (body.language)
      form.append(
        'language',
        speachesLanguage === 'auto' ? body.language : speachesLanguage,
      );

    const headers: Record<string, string> = {};
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const upstream = await fetch(`${apiUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      headers,
      body: form as any,
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      throw new BadRequestException({
        message: `Speaches transcription failed with HTTP ${upstream.status}`,
        detail: text.slice(0, 1000),
      });
    }

    try {
      return JSON.parse(text);
    } catch {
      return { text };
    }
  }
}
