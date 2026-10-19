import { ResourceScopeGuard } from '../guards/resource-scope.guard';
import { TtsActorGuard } from './tts-actor.guard';
import { Public } from '../guards/public.decorator';
import { Controller, Post, Body, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { TTSService } from './tts.service';
import { ApiTags } from '@nestjs/swagger';
import type { TTSResult } from './tts.types';

@ApiTags('TTS')
@Controller('tts')
@Public()
@UseGuards(TtsActorGuard, ResourceScopeGuard)
export class TTSController {
  constructor(private readonly ttsService: TTSService) {}

  @Post('speak')
  async speak(
    @Req() request: any,
    @Body() body: { text: string; teamId?: string },
    @Res() res: Response,
  ) {
    let result: TTSResult;
    try {
      result = await this.ttsService.speak(body.text, {
        teamId: request.ttsScope.teamId,
        correlationId: request.correlationId,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (message === 'AI request budget exceeded')
        return res.status(429).json({ error: 'TTS request budget exceeded' });
      if (message === 'AI integration disabled')
        return res.status(503).json({ error: 'TTS is disabled by spending controls' });
      if (['Configured team TTS unavailable', 'Configured team TTS required'].includes(message))
        return res.status(503).json({ error: message });
      return res.status(502).json({ error: 'Selected team TTS request failed' });
    }

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    const isWav = result.audioData?.subarray(0, 4).toString('ascii') === 'RIFF';
    res.set({
      'Content-Type': isWav ? 'audio/wav' : 'audio/mpeg',
      'Content-Length': result.audioData?.length || 0,
      'X-Duration': result.duration?.toString() || '0',
      'X-Keledon-TTS-Team': request.ttsScope.teamId,
    });

    res.end(result.audioData);
  }
}
