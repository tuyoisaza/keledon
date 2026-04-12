/**
 * Audio Capture - Captures audio from various sources
 * 
 * Sources:
 * - Microphone (getUserMedia)
 * - System audio (via CDP for Electron)
 * - Tab audio (via CDP for Electron)
 */

import { EventEmitter } from 'events';

export interface AudioCaptureConfig {
  source: 'microphone' | 'tab' | 'system';
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export interface AudioChunk {
  data: Float32Array;
  timestamp: number;
  duration: number;
}

export class AudioCapture extends EventEmitter {
  private config: AudioCaptureConfig;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isCapturing = false;

  constructor(config?: Partial<AudioCaptureConfig>) {
    super();
    this.config = {
      source: config?.source || 'microphone',
      sampleRate: config?.sampleRate || 16000,
      channelCount: config?.channelCount || 1,
      echoCancellation: config?.echoCancellation ?? true,
      noiseSuppression: config?.noiseSuppression ?? true,
      autoGainControl: config?.autoGainControl ?? true
    };
  }

  /**
   * Start capturing audio from microphone
   */
  async startMicrophoneCapture(): Promise<void> {
    if (this.isCapturing) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: { ideal: this.config.sampleRate },
          channelCount: this.config.channelCount,
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl
        }
      });

      await this.setupAudioPipeline();
      this.isCapturing = true;
      this.emit('capture:started');
      console.log('[AudioCapture] Microphone capture started');

    } catch (error) {
      this.emit('capture:error', error);
      throw error;
    }
  }

  /**
   * Start capturing from Electron BrowserWindow tab via CDP
   * This requires CDP connection to Electron's browser window
   */
  async startTabCapture(cdpUrl: string): Promise<void> {
    if (this.isCapturing) return;

    try {
      const { chromium } = await import('playwright-core');
      
      const browser = await chromium.connectOverCDP(cdpUrl);
      const contexts = browser.contexts();
      
      if (contexts.length === 0) {
        throw new Error('No browser contexts found');
      }

      const page = await contexts[0].newPage();
      await page.goto('about:blank');

      const stream = await page.evaluate(() => {
        return (navigator as any).mediaDevices.getUserMedia({ audio: true });
      });

      this.stream = new MediaStream(stream);
      await this.setupAudioPipeline();
      
      this.isCapturing = true;
      this.emit('capture:started');
      console.log('[AudioCapture] Tab capture started via CDP');

    } catch (error) {
      this.emit('capture:error', error);
      throw error;
    }
  }

  /**
   * Setup audio processing pipeline
   */
  private async setupAudioPipeline(): Promise<void> {
    if (!this.stream) {
      throw new Error('No stream available');
    }

    this.audioContext = new AudioContext({
      sampleRate: this.config.sampleRate
    });

    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
    
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    this.processorNode.onaudioprocess = (event) => {
      if (!this.isCapturing) return;

      const inputBuffer = event.inputBuffer;
      const channelData = inputBuffer.getChannelData(0);
      
      const chunk: AudioChunk = {
        data: Float32Array.from(channelData),
        timestamp: Date.now(),
        duration: inputBuffer.duration * 1000
      };

      this.emit('audio:chunk', chunk);
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);
  }

  /**
   * Stop capturing
   */
  async stop(): Promise<void> {
    this.isCapturing = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.emit('capture:stopped');
    console.log('[AudioCapture] Stopped');
  }

  /**
   * Get current stream (for WebRTC or other use)
   */
  getStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * Check if capturing
   */
  isActive(): boolean {
    return this.isCapturing;
  }

  /**
   * Set volume level (0-1)
   */
  setVolume(level: number): void {
    if (this.sourceNode) {
      this.sourceNode.gain.value = Math.max(0, Math.min(1, level));
    }
  }

  /**
   * Mute audio
   */
  mute(): void {
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
    }
  }

  /**
   * Unmute audio
   */
  unmute(): void {
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
    }
  }
}

export const audioCapture = new AudioCapture();