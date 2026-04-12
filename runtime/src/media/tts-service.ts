/**
 * TTS Service - Text-to-Speech factory with multiple providers
 * 
 * Supported providers:
 * - elevenlabs: Cloud TTS API
 * - local: Browser Web Speech API
 */

import { EventEmitter } from 'events';

export interface TTSConfig {
  provider: 'elevenlabs' | 'local';
  apiKey?: string;
  voiceId?: string;
  language?: string;
  speed?: number;
  pitch?: number;
}

export interface TTSResult {
  audioUrl?: string;
  duration?: number;
  provider: string;
}

export interface TTSAdapter {
  initialize(config: TTSConfig): Promise<void>;
  speak(text: string, options?: Partial<TTSConfig>): Promise<TTSResult>;
  stop(): Promise<void>;
  isPlaying(): boolean;
}

// ================== ELEVENLABS ADAPTER ==================

export class ElevenLabsAdapter implements TTSAdapter {
  private config: TTSConfig | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private playing = false;

  async initialize(config: TTSConfig): Promise<void> {
    this.config = config;
    console.log('[TTS-ElevenLabs] Initialized');
  }

  async speak(text: string, options?: Partial<TTSConfig>): Promise<TTSResult> {
    if (!this.config) throw new Error('Adapter not initialized');

    const voiceId = options?.voiceId || this.config.voiceId || 'rachel';
    const apiKey = this.config.apiKey || '';

    if (!apiKey) {
      console.warn('[TTS-ElevenLabs] No API key, falling back to local');
      return { provider: 'elevenlabs-fallback' };
    }

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (this.currentAudio) {
        this.currentAudio.pause();
        URL.revokeObjectURL(this.currentAudio.src);
      }

      this.currentAudio = new Audio(audioUrl);
      this.playing = true;

      await new Promise<void>((resolve, reject) => {
        this.currentAudio!.onended = () => {
          this.playing = false;
          resolve();
        };
        this.currentAudio!.onerror = (e) => {
          this.playing = false;
          reject(e);
        };
        this.currentAudio!.play().catch(reject);
      });

      return {
        audioUrl,
        duration: this.currentAudio.duration * 1000,
        provider: 'elevenlabs'
      };

    } catch (error) {
      console.error('[TTS-ElevenLabs] Failed:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.playing = false;
    }
  }

  isPlaying(): boolean {
    return this.playing;
  }
}

// ================== LOCAL TTS ADAPTER ==================

export class LocalTTSAdapter implements TTSAdapter {
  private config: TTSConfig | null = null;
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private playing = false;

  async initialize(config: TTSConfig): Promise<void> {
    this.config = config;
    this.synth = window.speechSynthesis;
    console.log('[TTS-Local] Initialized');
  }

  async speak(text: string, options?: Partial<TTSConfig>): Promise<TTSResult> {
    if (!this.synth) throw new Error('Adapter not initialized');

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.lang = options?.language || this.config?.language || 'en-US';
      utterance.rate = options?.speed || this.config?.speed || 1.0;
      utterance.pitch = options?.pitch || this.config?.pitch || 1.0;
      utterance.volume = 1.0;

      const voices = this.synth.getVoices();
      const voice = voices.find(v => 
        v.name.includes('Google') || v.name.includes('Samantha')
      ) || voices[0];
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        this.playing = true;
      };

      utterance.onend = () => {
        this.playing = false;
        resolve({ provider: 'local' });
      };

      utterance.onerror = (event) => {
        this.playing = false;
        reject(new Error(event.error));
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
  }

  async stop(): Promise<void> {
    if (this.synth) {
      this.synth.cancel();
      this.playing = false;
    }
  }

  isPlaying(): boolean {
    return this.playing;
  }
}

// ================== TTS SERVICE FACTORY ==================

export class TTSService extends EventEmitter {
  private adapter: TTSAdapter | null = null;
  private currentProvider: string = '';
  private config: TTSConfig | null = null;
  private audioQueue: string[] = [];
  private isProcessingQueue = false;

  /**
   * Initialize TTS service with a provider
   */
  async initialize(config: TTSConfig): Promise<void> {
    this.config = config;
    this.currentProvider = config.provider;

    switch (config.provider) {
      case 'elevenlabs':
        this.adapter = new ElevenLabsAdapter();
        break;
      case 'local':
        this.adapter = new LocalTTSAdapter();
        break;
      default:
        this.adapter = new LocalTTSAdapter();
    }

    await this.adapter.initialize(config);
    console.log(`[TTS] Initialized with provider: ${config.provider}`);
  }

  /**
   * Speak text immediately
   */
  async speak(text: string, options?: Partial<TTSConfig>): Promise<TTSResult> {
    if (!this.adapter) {
      throw new Error('TTS service not initialized');
    }

    try {
      const result = await this.adapter.speak(text, options);
      this.emit('spoke', result);
      return result;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Queue text to speak (for sequential responses)
   */
  async queue(text: string): Promise<void> {
    this.audioQueue.push(text);
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }

    this.isProcessingQueue = true;
    const text = this.audioQueue.shift();
    
    try {
      await this.speak(text!);
    } catch (error) {
      console.error('[TTS] Queue item failed:', error);
    }

    this.processQueue();
  }

  /**
   * Stop current speech
   */
  async stop(): Promise<void> {
    if (this.adapter) {
      await this.adapter.stop();
      this.audioQueue = [];
      this.isProcessingQueue = false;
      this.emit('stopped');
    }
  }

  /**
   * Get current provider
   */
  getProvider(): string {
    return this.currentProvider;
  }

  /**
   * Check if playing
   */
  isPlaying(): boolean {
    return this.adapter?.isPlaying() || false;
  }

  /**
   * Switch provider dynamically
   */
  async switchProvider(config: TTSConfig): Promise<void> {
    if (this.adapter) {
      await this.stop();
    }
    await this.initialize(config);
  }
}

export const ttsService = new TTSService();