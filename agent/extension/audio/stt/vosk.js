/**
 * VOSK STT Adapter - Connects to VOSK Server
 * Speech-to-text using local VOSK server (cost-saving)
 */

import { STTAdapter } from './adapter.js';

export class VOSKSTT extends STTAdapter {
  constructor(config = {}) {
    super({
      provider: 'vosk',
      serverUrl: config.serverUrl || 'ws://localhost:9091',
      language: config.language || 'en-US',
      sampleRate: config.sampleRate || 16000,
      ...config
    });

    this.socket = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.isStreaming = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  async onInitialize() {
    console.log('[VOSK] Initializing VOSK STT adapter');
    console.log('[VOSK] Server URL:', this.config.serverUrl);

    // Test connection to VOSK server
    try {
      const response = await fetch(this.config.serverUrl.replace('ws:', 'http:').replace('9091', '9090') + '/health');
      if (response.ok) {
        const health = await response.json();
        console.log('[VOSK] Server ready:', health);
        this.emit('ready', { provider: 'vosk', status: health.status });
      } else {
        throw new Error('VOSK server not ready');
      }
    } catch (error) {
      console.warn('[VOSK] Server not reachable:', error.message);
      this.emit('ready', { provider: 'vosk', status: 'offline' });
    }
  }

  async onStart(audioStream) {
    this.mediaStream = audioStream;
    this.isStreaming = true;
    this.reconnectAttempts = 0;

    await this.connect();
    await this.setupAudioProcessing(audioStream);

    this.emit('started', { provider: 'vosk' });
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.serverUrl;
      console.log('[VOSK] Connecting to:', wsUrl);

      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[VOSK] Connected');
        this.reconnectAttempts = 0;
        this.emit('connected', {});
        resolve();
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.socket.onerror = (error) => {
        console.error('[VOSK] Socket error:', error);
        this.emit('error', error);
      };

      this.socket.onclose = (event) => {
        console.log('[VOSK] Connection closed:', event.code);
        this.emit('disconnected', { code: event.code });
        
        // Auto-reconnect
        if (this.isStreaming && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`[VOSK] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => this.connect().catch(() => {}), 1000);
        }
      };
    });
  }

  async setupAudioProcessing(mediaStream) {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: this.config.sampleRate
    });

    const source = this.audioContext.createMediaStreamSource(mediaStream);
    
    // Create ScriptProcessor for audio chunking
    const bufferSize = 4096;
    this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.processor.onaudioprocess = (event) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

      const inputData = event.inputBuffer.getChannelData(0);
      
      // Convert to 16-bit PCM
      const pcmData = this.convertTo16BitPCM(inputData);
      
      // Send to VOSK server
      this.socket.send(pcmData);
    };

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    console.log('[VOSK] Audio processing started');
  }

  convertTo16BitPCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    return int16Array;
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'ready':
          console.log('[VOSK] Server ready');
          break;
          
        case 'result':
          if (data.text) {
            const result = {
              text: data.text,
              confidence: data.confidence || 1.0,
              provider: 'vosk',
              isFinal: true,
              timestamp: new Date().toISOString()
            };
            this.emit('result:final', result);
          }
          break;
          
        case 'partial':
          if (data.partial) {
            const result = {
              text: data.partial,
              confidence: 0.5,
              provider: 'vosk',
              isFinal: false,
              timestamp: new Date().toISOString()
            };
            this.emit('result:interim', result);
          }
          break;
          
        case 'error':
          this.emit('error', new Error(data.error));
          break;
      }
    } catch (error) {
      console.error('[VOSK] Message parse error:', error);
    }
  }

  async onStop() {
    this.isStreaming = false;

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    if (this.socket) {
      this.socket.close(1000, 'Client stopped');
      this.socket = null;
    }

    this.emit('stopped', {});
  }

  async onProcessAudio(audioData) {
    // Audio is processed through WebSocket stream
    return audioData;
  }

  getStats() {
    return {
      provider: 'vosk',
      isActive: this.isStreaming,
      serverUrl: this.config.serverUrl,
      config: this.getConfig()
    };
  }

  async testConnection() {
    try {
      const url = this.config.serverUrl.replace('ws:', 'http:').replace('9091', '9090');
      const response = await fetch(url + '/health');
      return response.ok;
    } catch {
      return false;
    }
  }

  async onCleanup() {
    await this.onStop();
  }
}
