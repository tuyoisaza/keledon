import { Injectable } from '@nestjs/common';
import { TTSFactory } from '../audio/tts/index.js';
import { EventEmitter } from 'events';

@Injectable()
export class TTSService {
  private ttsAdapter: any = null;
  private eventEmitter = new EventEmitter();
  private audioQueue: any[] = [];
  private isPlaying = false;
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    console.log('TTSService: Initialized');
  }

  async initialize(provider: string, config: any = {}): Promise<void> {
    try {
      this.ttsAdapter = await TTSFactory.create(provider, config);
      
      // Setup TTS event handlers
      this.ttsAdapter.on('synthesis:started', () => {
        this.eventEmitter.emit('synthesis:started');
      });
      
      this.ttsAdapter.on('synthesis:completed', (audioData) => {
        this.eventEmitter.emit('synthesis:completed', audioData);
      });
      
      this.ttsAdapter.on('playback:started', () => {
        this.isPlaying = true;
        this.eventEmitter.emit('playback:started');
      });
      
      this.ttsAdapter.on('playback:completed', () => {
        this.isPlaying = false;
        this.eventEmitter.emit('playback:completed');
      });
      
      this.ttsAdapter.on('error', (error) => {
        this.eventEmitter.emit('error', error);
      });
      
      console.log(`TTSService: Initialized ${provider} TTS adapter`);
    } catch (error) {
      console.error(`TTSService: Failed to initialize ${provider}:`, error);
      throw error;
    }
  }

  async speak(text: string, options: any = {}): Promise<void> {
    if (!this.ttsAdapter) {
      throw new Error('TTS adapter not initialized');
    }

    try {
      this.audioQueue.push({ text, ...options });
      
      if (!this.isPlaying) {
        await this.processQueue();
      }
      
      console.log(`TTSService: Speaking "${text}"`);
    } catch (error) {
      console.error(`TTSService: Failed to speak "${text}":`, error);
      this.eventEmitter.emit('error', error);
    }
  }

  async stop(): Promise<void> {
    if (this.ttsAdapter) {
      await this.ttsAdapter.stop();
    }
    
    this.audioQueue = [];
    this.isPlaying = false;
    
    console.log('TTSService: Stopped');
  }

  async pause(): Promise<void> {
    if (this.currentAudio && this.currentAudio.pause) {
      this.currentAudio.pause();
      this.eventEmitter.emit('paused');
    }
  }

  async resume(): Promise<void> {
    if (this.currentAudio && this.currentAudio.play) {
      this.currentAudio.play();
      this.eventEmitter.emit('resumed');
    }
  }

  private async processQueue(): Promise<void> {
    if (this.audioQueue.length === 0 || this.isPlaying) {
      return;
    }

    const speakOptions = this.audioQueue.shift();
    await this.ttsAdapter.speak(speakOptions.text, speakOptions);
  }

  getPlaybackStatus() {
    return {
      isPlaying: this.isPlaying,
      queueLength: this.audioQueue.length
    };
  }

  // Event emitter methods
  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  once(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.once(event, listener);
  }

  async cleanup(): Promise<void> {
    if (this.ttsAdapter) {
      await this.ttsAdapter.cleanup();
    }
    
    this.ttsAdapter = null;
    this.audioQueue = [];
    this.isPlaying = false;
    this.currentAudio = null;
    
    console.log('TTSService: Cleaned up');
  }
}