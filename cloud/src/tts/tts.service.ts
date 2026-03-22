import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { Readable } from 'stream';

export interface TTSResult {
  audioData?: Buffer;
  duration?: number;
  error?: string;
}

@Injectable()
export class TTSService {
  private eventEmitter = new EventEmitter();
  private currentStream: Readable | null = null;
  private voiceId = process.env.ELEVENLABS_VOICE_ID || 'pFZP5JQG7iQjIQuC4Bku';

  constructor() {
    console.log('[TTS] TTSService initialized with voice:', this.voiceId);
  }

  async speak(text: string, options: { interruptible?: boolean } = {}): Promise<TTSResult> {
    const provider = process.env.TTS_PROVIDER || 'elevenlabs';
    
    console.log(`[TTS] Speaking with ${provider}: "${text.substring(0, 50)}..."`);
    
    try {
      if (provider === 'elevenlabs') {
        return await this.speakWithElevenLabs(text, options);
      } else {
        console.log('[TTS] Mock TTS mode');
        return { audioData: Buffer.from(''), duration: 0 };
      }
    } finally {
      this.eventEmitter.emit('speak:completed');
    }
  }

  async speakWithElevenLabs(text: string, options: { interruptible?: boolean }): Promise<TTSResult> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      console.log('[TTS] ElevenLabs API key not configured, using mock');
      return { error: 'ELEVENLABS_API_KEY not configured' };
    }

    try {
      const { ElevenLabsClient } = await import('elevenlabs');
      const client = new ElevenLabsClient({ apiKey });
      
      const audio = await client.textToSpeech.convertAsStream(this.voiceId, {
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true,
        },
      });

      const chunks: Buffer[] = [];
      for await (const chunk of audio) {
        if (options.interruptible && this.eventEmitter.listenerCount('stop') > 0) {
          console.log('[TTS] Interrupted');
          break;
        }
        chunks.push(Buffer.from(chunk));
      }

      const audioData = Buffer.concat(chunks);
      const duration = this.estimateDuration(audioData.length);
      
      console.log(`[TTS] Generated ${audioData.length} bytes, ~${duration.toFixed(1)}s audio`);
      
      return { audioData, duration };
    } catch (error: any) {
      console.error('[TTS] ElevenLabs error:', error.message);
      return { error: error.message };
    }
  }

  private estimateDuration(bytes: number): number {
    const bitrate = 128000;
    return (bytes * 8) / bitrate;
  }

  async stop(): Promise<void> {
    console.log('[TTS] Stop requested');
    this.eventEmitter.emit('stop');
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }
}
