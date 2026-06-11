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
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Speaches')
@Controller('api/teams/:teamId/speaches')
export class SpeachesController {
  constructor(private readonly prisma: PrismaService) {}

  private async getActorScope(req: any) {
    const requestUser = req?.user;
    if (!requestUser?.userId) {
      return { role: 'anonymous', companyId: null as string | null, teamId: null as string | null };
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

  private teamScopeWhere(scope: { role: string; companyId: string | null; teamId: string | null }) {
    if (scope.role === 'superadmin') return {};
    if (scope.companyId) return { brand: { companyId: scope.companyId } };
    if (scope.teamId) return { id: scope.teamId };
    return { id: '__NO_TEAM_ACCESS__' };
  }

  @Post('transcriptions')
  @UseInterceptors(FileInterceptor('file'))
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

    const apiUrl = (team.speachesApiUrl || 'https://speaches-production-c63f.up.railway.app').replace(/\/+$/, '');
    const apiKey = team.speachesApiKey || process.env.SPEACHES_API_KEY || process.env.API_KEY || '';

    const form = new FormData();
    form.append('file', new Blob([file.buffer], { type: file.mimetype || 'audio/webm' }), file.originalname || 'recording.webm');
    form.append('model', body.model || 'whisper-1');
    form.append('response_format', body.response_format || 'json');
    if (body.language) form.append('language', body.language);

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
