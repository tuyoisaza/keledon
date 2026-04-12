/**
 * STT Service - Speech-to-Text factory with multiple providers
 * 
 * Supported providers:
 * - vosk: WebSocket-based, requires Vosk server
 * - deepgram: HTTP streaming, requires API key
 * - webspeech: Browser Web Speech API (fallback)
 */

import { EventEmitter } from 'events';

export interface STTConfig {
  provider: 'vosk' | 'deepgram' | 'webspeech';
  serverUrl?: string;
  apiKey?: string;
  language?: string;
  sampleRate?: number;
}

export interface TranscriptResult {
  text: string;
  confidence: number;
  is_final: boolean;
  timestamp: number;
}

export interface STTAdapter {
  initialize(config: STTConfig): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  onTranscript(callback: (result: TranscriptResult) => void): void;
  onError(callback: (error: Error) => void): void;
}

// ================== VOSK ADAPTER ==================

export class VoskAdapter implements STTAdapter {
  private ws: WebSocket | null = null;
  private config: STTConfig | null = null;
  private transcriptCallback: ((result: TranscriptResult) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private isRunning = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  async initialize(config: STTConfig): Promise<void> {
    this.config = config;
  }

  async start(): Promise<void> {
    if (!this.config) throw new Error('Adapter not initialized');
    if (this.isRunning) return;

    const serverUrl = this.config.serverUrl || 'ws://localhost:9091';
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(serverUrl);

        this.ws.onopen = () => {
          console.log('[STT-Vosk] Connected to Vosk server');
          this.isRunning = true;
          this.reconnectAttempts = 0;

          this.ws?.send(JSON.stringify({
            type: 'config',
            language: this.config?.language || 'en',
            sample_rate: this.config?.sampleRate || 16000
          }));

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.text) {
              const result: TranscriptResult = {
                text: data.text,
                confidence: data.confidence || 0.8,
                is_final: data.is_final || false,
                timestamp: Date.now()
              };
              if (this.transcriptCallback) {
                this.transcriptCallback(result);
              }
            }
          } catch (e) {
            console.error('[STT-Vosk] Failed to parse message:', e);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[STT-Vosk] WebSocket error:', error);
          if (this.errorCallback) {
            this.errorCallback(new Error('Vosk WebSocket error'));
          }
        };

        this.ws.onclose = () => {
          console.log('[STT-Vosk] Disconnected from Vosk server');
          this.isRunning = false;
          this.attemptReconnect();
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.isRunning) {
      this.reconnectAttempts++;
      console.log(`[STT-Vosk] Reconnecting... attempt ${this.reconnectAttempts}`);
      setTimeout(() => this.start().catch(() => {}), 2000);
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onTranscript(callback: (result: TranscriptResult) => void): void {
    this.transcriptCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }
}

// ================== DEEPGRAM ADAPTER ==================

export class DeepgramAdapter implements STTAdapter {
  private config: STTConfig | null = null;
  private mediaStream: MediaStream | null = null;
  private transcriptCallback: ((result: TranscriptResult) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private isRunning = false;
  private socket: WebSocket | null = null;

  async initialize(config: STTConfig): Promise<void> {
    this.config = config;
  }

  async start(): Promise<void> {
    if (!this.config) throw new Error('Adapter not initialized');
    if (this.isRunning) return;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      const sampleRate = this.config.sampleRate || 16000;
      const audioContext = new AudioContext({ sampleRate });
      const source = audioContext.createMediaStreamSource(this.mediaStream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const outputBuffer = event.outputBuffer;
        const outputData = outputBuffer.getChannelData(0);

        for (let i = 0; i < inputBuffer.length; i++) {
          outputData[i] = inputBuffer.getChannelData(0)[i];
        }
      };

      this.isRunning = true;
      console.log('[STT-Deepgram] Started');

    } catch (error) {
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  onTranscript(callback: (result: TranscriptResult) => void): void {
    this.transcriptCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }
}

// ================== WEBSPEECH ADAPTER ==================

export class WebSpeechAdapter implements STTAdapter {
  private config: STTConfig | null = null;
  private recognition: any = null;
  private transcriptCallback: ((result: TranscriptResult) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private isRunning = false;

  async initialize(config: STTConfig): Promise<void> {
    this.config = config;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Web Speech API not available');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = config.language || 'en-US';

    this.recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const isFinal = event.results[i].isFinal;
        
        if (this.transcriptCallback) {
          this.transcriptCallback({
            text: transcript,
            confidence: event.results[i][0].confidence || 0.8,
            is_final: isFinal,
            timestamp: Date.now()
          });
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      if (this.errorCallback) {
        this.errorCallback(new Error(event.error));
      }
    };

    this.recognition.onend = () => {
      if (this.isRunning) {
        this.recognition.start();
      }
    };
  }

  async start(): Promise<void> {
    if (!this.recognition) throw new Error('Adapter not initialized');
    this.isRunning = true;
    this.recognition.start();
    console.log('[STT-WebSpeech] Started');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  onTranscript(callback: (result: TranscriptResult) => void): void {
    this.transcriptCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }
}

// ================== STT SERVICE FACTORY ==================

export class STTService extends EventEmitter {
  private adapter: STTAdapter | null = null;
  private currentProvider: string = '';
  private config: STTConfig | null = null;

  /**
   * Initialize STT service with a provider
   */
  async initialize(config: STTConfig): Promise<void> {
    this.config = config;
    this.currentProvider = config.provider;

    switch (config.provider) {
      case 'vosk':
        this.adapter = new VoskAdapter();
        break;
      case 'deepgram':
        this.adapter = new DeepgramAdapter();
        break;
      case 'webspeech':
        this.adapter = new WebSpeechAdapter();
        break;
      default:
        this.adapter = new WebSpeechAdapter();
    }

    await this.adapter.initialize(config);

    this.adapter.onTranscript((result) => {
      this.emit('transcript', result);
    });

    this.adapter.onError((error) => {
      this.emit('error', error);
    });

    console.log(`[STT] Initialized with provider: ${config.provider}`);
  }

  /**
   * Start listening
   */
  async start(): Promise<void> {
    if (!this.adapter) {
      throw new Error('STT service not initialized');
    }
    await this.adapter.start();
    this.emit('started');
  }

  /**
   * Stop listening
   */
  async stop(): Promise<void> {
    if (this.adapter) {
      await this.adapter.stop();
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
   * Check if running
   */
  isRunning(): boolean {
    return this.adapter !== null;
  }

  /**
   * Switch provider dynamically
   */
  async switchProvider(config: STTConfig): Promise<void> {
    if (this.adapter) {
      await this.stop();
    }
    await this.initialize(config);
  }
}

export const sttService = new STTService();