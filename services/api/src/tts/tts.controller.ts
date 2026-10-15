import { ResourceScopeGuard } from '../guards/resource-scope.guard';
import { RuntimeActorGuard } from '../gateways/runtime-identity';
import { Public } from '../guards/public.decorator';
import { Controller, Post, Body, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { TTSService } from './tts.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('TTS')
@Controller('tts')
@Public()
@UseGuards(RuntimeActorGuard, ResourceScopeGuard)
export class TTSController {
  constructor(private readonly ttsService: TTSService) {}

  @Post('speak')
  async speak(
    @Req() request: any,
    @Body() body: { text: string; teamId?: string },
    @Res() res: Response,
  ) {
    const result = await this.ttsService.speak(body.text, {
      teamId: body.teamId,
      correlationId: request.correlationId,
    });

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    const isWav = result.audioData?.subarray(0, 4).toString('ascii') === 'RIFF';
    res.set({
      'Content-Type': isWav ? 'audio/wav' : 'audio/mpeg',
      'Content-Length': result.audioData?.length || 0,
      'X-Duration': result.duration?.toString() || '0',
      'X-Keledon-TTS-Team': body.teamId || 'none',
    });

    res.end(result.audioData);
  }
}
