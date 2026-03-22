export interface VoskTranscript {
  text: string;
  confidence: number;
  is_final: boolean;
}

export interface VoskConfig {
  serverUrl: string;
  language?: string;
  sampleRate?: number;
}

export type VoskCallback = (transcript: VoskTranscript) => void;

export class VoskSttAdapter {
  private ws: WebSocket | null = null;
  private config: VoskConfig;
  private onTranscriptCallback: VoskCallback | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private onReadyCallback: (() => void) | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;

  constructor(config: VoskConfig) {
    this.config = {
      serverUrl: config.serverUrl,
      language: config.language || 'en',
      sampleRate: config.sampleRate || 16000,
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[VOSK] Connecting to ${this.config.serverUrl}`);

        this.ws = new WebSocket(this.config.serverUrl);

        this.ws.onopen = () => {
          console.log('[VOSK] WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;

          this.ws?.send(JSON.stringify({
            type: 'config',
            language: this.config.language,
            sampleRate: this.config.sampleRate,
          }));

          if (this.onReadyCallback) {
            this.onReadyCallback();
          }
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('[VOSK] WebSocket error:', error);
          if (this.onErrorCallback) {
            this.onErrorCallback(new Error('WebSocket connection error'));
          }
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log(`[VOSK] WebSocket closed: ${event.code} ${event.reason}`);
          this.isConnected = false;

          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[VOSK] Reconnecting... attempt ${this.reconnectAttempts}`);
            setTimeout(() => this.connect().catch(console.error), this.reconnectDelay);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(data: string | ArrayBuffer | Blob) {
    if (typeof data !== 'string') {
      return;
    }

    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'ready':
          console.log('[VOSK] Server ready, model loaded');
          break;

        case 'partial':
          if (this.onTranscriptCallback) {
            this.onTranscriptCallback({
              text: message.text || '',
              confidence: 0.5,
              is_final: false,
            });
          }
          break;

        case 'result':
          if (this.onTranscriptCallback && message.text) {
            this.onTranscriptCallback({
              text: message.text,
              confidence: message.confidence || 0.9,
              is_final: true,
            });
          }
          break;

        case 'error':
          console.error('[VOSK] Server error:', message.error);
          if (this.onErrorCallback) {
            this.onErrorCallback(new Error(message.error));
          }
          break;

        case 'reset':
          console.log('[VOSK] Recognizer reset');
          break;

        default:
          console.log('[VOSK] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[VOSK] Failed to parse message:', error);
    }
  }

  sendAudioChunk(audioData: ArrayBuffer | Int16Array | Float32Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[VOSK] Cannot send audio: WebSocket not connected');
      return;
    }

    let buffer: ArrayBuffer;

    if (audioData instanceof Int16Array) {
      buffer = audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength);
    } else if (audioData instanceof Float32Array) {
      const int16 = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        int16[i] = Math.max(-1, Math.min(1, audioData[i])) * 0x7FFF;
      }
      buffer = int16.buffer;
    } else {
      buffer = audioData;
    }

    this.ws.send(buffer);
  }

  reset(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'reset' }));
    }
  }

  onTranscript(callback: VoskCallback): void {
    this.onTranscriptCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  onReady(callback: () => void): void {
    this.onReadyCallback = callback;
  }

  disconnect(): void {
    this.maxReconnectAttempts = 0;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  isReady(): boolean {
    return this.isConnected;
  }
}
