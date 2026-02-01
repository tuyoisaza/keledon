import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { LocalTTSService } from '../tts/local-tts.service';
import { LocalSTTService } from '../stt/local-stt.service';

@Controller('api/tts')
export class TTSController {
  constructor(private readonly localTTSService: LocalTTSService) {}

  @Post('qwen3-tts')
  async generateSpeech(@Body() body: { text: string; voice?: string }) {
    try {
      console.log('[TTS Controller] Generate speech request:', { text: body.text, hasVoice: !!body.voice });
      
      const result = await this.localTTSService.generateText(body.text, body.voice);
      
      return {
        success: true,
        message: 'TTS generated successfully',
        audioData: result.audioData,
        duration: result.duration,
        
      };
    } catch (error) {
      console.error('[TTS Controller] Error generating speech:', error);
      return {
        success: false,
        error: error.message,
        message: `TTS generation failed: ${error.message}`
      };
    }
  }

  @Post('elevenlabs')
  async generateElevenLabsSpeech(@Body() body: { text: string; voice_id?: string }) {
    try {
      console.log('[TTS Controller] ElevenLabs request:', { text: body.text, voiceId: body.voice_id });
      
      // For now, use local TTS as fallback
      const result = await this.localTTSService.generateText(body.text, body.voice_id);
      
      return {
        success: true,
        message: 'TTS generated successfully (fallback to local)',
        audioData: result.audioData,
        duration: result.duration,
        provider: 'elevenlabs-fallback',
        voice: body.voice_id
      };
    } catch (error) {
      console.error('[TTS Controller] ElevenLabs error:', error);
      return {
        success: false,
        error: error.message,
        message: `ElevenLabs generation failed: ${error.message}`
      };
    }
  }
}