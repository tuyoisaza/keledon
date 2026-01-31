import { Controller, Post, Body, Get } from '@nestjs/common';
import { LocalSTTService } from '../stt/local-stt.service';

@Controller('api/stt')
export class STTController {
  constructor(private readonly localSTTService: LocalSTTService) {}

  @Post('whisper')
  async transcribeAudio(@Body() audio: { audio: string }) {
    try {
      console.log('[STT Controller] Transcription request: audio size:', audio.length);
      
      // Convert base64 audio to ArrayBuffer
      const audioBuffer = this.base64ToArrayBuffer(audio);
      
      const result = await this.localSTTService.transcribeAudio(audioBuffer);
      
      return {
        success: true,
        message: 'Audio transcribed successfully',
        transcript: result.transcript,
        confidence: result.confidence,
        duration: result.duration,
        provider: result.provider
      };
    } catch (error) {
      console.error('[STT Controller] Error transcribing audio:', error);
      return {
        success: false,
        error: error.message,
        message: `Transcription failed: ${error.message}`
      };
    }
  }

  @Post('deepgram')
  async transcribeAudioWithDeepgram(@Body() audio: { audio: string }) {
    try {
      console.log('[STT Controller] Deepgram request: audio size:', audio.length);
      
      // For now, use local STT as fallback
      const audioBuffer = this.base64ToArrayBuffer(audio);
      
      const result = await this.localSTTService.transcribeAudio(audioBuffer);
      
      return {
        success: true,
        message: 'Audio transcribed successfully (fallback to local)',
        transcript: result.transcript,
        confidence: result.confidence,
        duration: result.duration,
        provider: 'deepgram-fallback'
      };
    } catch (error) {
      console.error('[STT Controller] Deepgram error:', error);
      return {
        success: false,
        error: error.message,
        message: `Deepgram transcription failed: ${error.message}`
      };
    }
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}