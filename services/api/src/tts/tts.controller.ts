import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { TTSService } from './tts.service';

@Controller('tts')
export class TTSController {
  constructor(private readonly ttsService: TTSService) {}

  @Post('speak')
  async speak(@Body() body: { text: string }, @Res() res: Response) {
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
