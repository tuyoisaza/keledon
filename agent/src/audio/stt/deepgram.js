/**
 * Deepgram STT Adapter - Cloud-based Speech Recognition
 * Implements STT adapter using Deepgram API
 */

import { STTAdapter } from './adapter.js';

export class DeepgramSTT extends STTAdapter {
  constructor(config = {}) {
    super({
      provider: 'deepgram',
      apiKey: '',
      language: 'en-US',
      model: 'nova-2',
      sampleRate: 16000,
      channels: 1,
      endpoint: 'wss://api.deepgram.com/v1/listen',
      ...config
    });

    this.socket = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.scriptProcessor = null;
    this.source = null;
  }

  /**
   * Initialize Deepgram connection
   */
  async onInitialize() {
    if (!this.config.apiKey) {
      throw new Error('Deepgram API key is required');
    }

    // Create audio context for processing
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    this.emit('ready', { provider: 'deepgram' });
  }

  /**
   * Start speech recognition with Deepgram
   */
  async onStart(audioStream) {
    this.mediaStream = audioStream;

    // Create WebSocket connection to Deepgram
    const url = `${this.config.endpoint}?encoding=linear16&sample_rate=${this.config.sampleRate}&channels=${this.config.channels}&language=${this.config.language}&model=${this.config.model}`;
    
    this.socket = new WebSocket(url, ['token', this.config.apiKey]);

    this.socket.onopen = () => {
      this.emit('connection:opened', {});
      this.startAudioProcessing();
    };

    this.socket.onmessage = (event) => {
      this.handleMessage(event);
    };

    this.socket.onerror = (error) => {
      this.emit('error', new Error('Deepgram WebSocket error: ' + error.message));
    };

    this.socket.onclose = (event) => {
      this.emit('connection:closed', { code: event.code, reason: event.reason });
    };
  }

  /**
   * Stop speech recognition
   */
  async onStop() {
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.emit('stopped', {});
  }

  /**
   * Process audio chunk (not used directly with Deepgram WebSocket)
   */
  async onProcessAudio(audioData) {
    // Audio is processed through WebSocket stream
    // This method is kept for interface compatibility
    return audioData;
  }

  /**
   * Start audio processing pipeline
   */
  startAudioProcessing() {
    if (!this.audioContext || !this.mediaStream) return;

    // Create audio source from microphone stream
    this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
    
    // Create script processor for audio data
    this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (event) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        const inputData = event.inputBuffer.getChannelData(0);
        const pcmData = this.convertToPCM(inputData);
        this.socket.send(pcmData);
      }
    };

    // Connect audio processing chain
    this.source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.audioContext.destination);

    this.emit('processing:started', {});
  }

  /**
   * Convert Float32Array to PCM format
   */
  convertToPCM(float32Array) {
    const pcmData = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Convert float32 to int16
      const val = Math.max(-1, Math.min(1, float32Array[i]));
      pcmData[i] = val < 0 ? val * 32768 : val * 32767;
    }
    return pcmData.buffer;
  }

  /**
   * Handle WebSocket message from Deepgram
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'TranscriptResponse':
          this.handleTranscriptResponse(data);
          break;
        case 'MetadataResponse':
          this.handleMetadataResponse(data);
          break;
        case 'ErrorResponse':
          this.handleError(data);
          break;
        default:
          console.warn('Unknown Deepgram message type:', data.type);
      }
    } catch (error) {
      this.emit('error', new Error('Failed to parse Deepgram message: ' + error.message));
    }
  }

  /**
   * Handle transcript response from Deepgram
   */
  handleTranscriptResponse(data) {
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    const isFinal = data.is_final;
    const confidence = data.channel?.alternatives?.[0]?.confidence || 0;

    if (transcript && transcript.trim()) {
      const result = {
        text: transcript.trim(),
        confidence: confidence,
        provider: 'deepgram',
        isFinal: isFinal,
        timestamp: new Date().toISOString(),
        words: data.channel?.alternatives?.[0]?.words || [],
        language: this.config.language,
        model: this.config.model,
        metadata: {
          deepgram: {
            request_id: data.request_id,
            channel: data.channel
          }
        }
      };

      if (isFinal) {
        this.emit('result:final', result);
      } else {
        this.emit('result:interim', result);
      }
    }
  }

  /**
   * Handle metadata response from Deepgram
   */
  handleMetadataResponse(data) {
    this.emit('metadata', {
      provider: 'deepgram',
      type: data.type,
      metadata: data.metadata
    });
  }

  /**
   * Handle error response from Deepgram
   */
  handleError(data) {
    const error = new Error(data.description || 'Deepgram processing error');
    error.code = data.error_code;
    error.provider = 'deepgram';
    
    this.emit('error', error);
  }

  /**
   * Update Deepgram-specific configuration
   */
  async onConfigUpdate(oldConfig, newConfig) {
    // If API key changed, we need to reconnect
    if (oldConfig.apiKey !== newConfig.apiKey) {
      if (this.isActive) {
        await this.stop();
        await this.start(this.mediaStream);
      }
    }

    // If other settings changed, we might need to restart
    const settingsChanged = [
      'language', 'model', 'sampleRate', 'channels'
    ].some(key => oldConfig[key] !== newConfig[key]);

    if (settingsChanged && this.isActive) {
      await this.stop();
      await this.start(this.mediaStream);
    }
  }

  /**
   * Get Deepgram statistics
   */
  getStats() {
    return {
      provider: 'deepgram',
      isActive: this.isActive,
      config: this.getConfig(),
      connectionState: this.socket ? this.socket.readyState : 'disconnected'
    };
  }

  /**
   * Cleanup Deepgram resources
   */
  async onCleanup() {
    await this.onStop();
    
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Validate Deepgram API key format
   */
  validateAPIKey(apiKey) {
    return typeof apiKey === 'string' && apiKey.length > 0;
  }

  /**
   * Test Deepgram connection
   */
  async testConnection() {
    try {
      const response = await fetch('https://api.deepgram.com/v1/projects', {
        headers: {
          'Authorization': `Token ${this.config.apiKey}`
        }
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}