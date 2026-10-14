import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common';
import { TTSService } from './tts.service';
import { ResourceScopeGuard } from '../guards/resource-scope.guard';

interface TTSResponse {
  status(code: number): TTSResponse;
  json(body: { error: string }): unknown;
  set(headers: Record<string, string | number>): TTSResponse;
  end(data?: Buffer): void;
}

@Controller('tts')
@UseGuards(ResourceScopeGuard)
export class TTSController {
  constructor(private readonly ttsService: TTSService) {}

  @Post('speak')
  async speak(@Body() body: { text: string }, @Res() res: TTSResponse) {
    const result = await this.ttsService.speak(body.text);

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': result.audioData?.length || 0,
      'X-Duration': result.duration?.toString() || '0',
    });

    res.end(result.audioData);
  }
}
