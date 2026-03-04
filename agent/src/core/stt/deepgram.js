/**
 * Deepgram STT Provider - Real-time Speech-to-Text
 * Implements WebSocket-based streaming transcription
 */

export class DeepgramSTT {
  constructor(config = {}) {
    this.apiKey = config.apiKey || '';
    this.language = config.language || 'en-US';
    this.model = config.model || 'nova-2';
    this.endpoint = config.endpoint || 'wss://api.deepgram.com/v1/listen';
    
    this.socket = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.isConnected = false;
    this.isStreaming = false;
    this.eventHandlers = new Map();
    
    this.config = {
      interim_results: true,
      punctuate: true,
      language: this.language,
      model: this.model,
      version: 'latest'
    };
  }

  /**
   * Initialize Deepgram provider
   */
  async initialize() {
    if (!this.apiKey) {
      throw new Error('Deepgram API key is required');
    }

    if (!this.validateAPIKey(this.apiKey)) {
      throw new Error('Invalid Deepgram API key format');
    }

    console.log('Deepgram STT initialized with model:', this.model);
    this.emit('initialized', { provider: 'deepgram', config: this.config });
  }

  /**
   * Validate API key format
   */
  validateAPIKey(apiKey) {
    return typeof apiKey === 'string' && apiKey.length >= 20;
  }

  /**
   * Start streaming transcription
   */
  async start(mediaStream) {
    if (this.isStreaming) {
      console.warn('Deepgram STT already streaming');
      return;
    }

    this.mediaStream = mediaStream;

    try {
      // Create WebSocket connection
      await this.connect();

      // Set up audio processing
      await this.setupAudioProcessing(mediaStream);

      this.isStreaming = true;
      this.emit('connection:opened', {});

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Connect to Deepgram WebSocket
   */
  connect() {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams(this.config);
      const url = `${this.endpoint}?${params.toString()}`;

      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        console.log('Deepgram WebSocket connected');
        this.isConnected = true;
        resolve();
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.socket.onerror = (error) => {
        console.error('Deepgram WebSocket error:', error);
        this.emit('error', error);
        reject(error);
      };

      this.socket.onclose = (event) => {
        console.log('Deepgram WebSocket closed:', event.code, event.reason);
        this.isConnected = false;
        this.emit('connection:closed', { code: event.code, reason: event.reason });
      };
    });
  }

  /**
   * Set up audio processing pipeline
   */
  async setupAudioProcessing(mediaStream) {
    // Create audio context
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000
    });

    // Create source from media stream
    const source = this.audioContext.createMediaStreamSource(mediaStream);

    // Create script processor for audio data
    const bufferSize = 4096;
    this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.processor.onaudioprocess = (event) => {
      if (!this.isConnected || !this.socket) return;

      const inputBuffer = event.inputBuffer;
      const inputData = inputBuffer.getChannelData(0);

      // Convert to 16-bit PCM
      const pcmData = this.convertTo16BitPCM(inputData);

      // Send to Deepgram
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(pcmData);
      }
    };

    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    console.log('Deepgram audio processing started');
  }

  /**
   * Convert float32 to 16-bit PCM
   */
  convertTo16BitPCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    
    return int16Array;
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      if (data.channel?.alternatives?.[0]) {
        const transcript = data.channel.alternatives[0].transcript;
        const confidence = data.channel.alternatives[0].confidence || 0;
        const isFinal = data.is_final;
        
        if (transcript && transcript.trim().length > 0) {
          const result = {
            text: transcript.trim(),
            confidence,
            provider: 'deepgram',
            language: this.language,
            model: this.model,
            metadata: {
              words: data.channel.alternatives[0].words,
              start: data.start,
              duration: data.duration
            }
          };

          if (isFinal) {
            this.emit('result:final', result);
          } else {
            this.emit('result:interim', result);
          }
        }
      }

      // Handle transcription events
      if (data.type === 'Transcript' && data.channel?.alternatives) {
        const alt = data.channel.alternatives[0];
        if (alt.transcript) {
          const result = {
            text: alt.transcript.trim(),
            confidence: alt.confidence || 0,
            provider: 'deepgram',
            language: this.language,
            model: this.model
          };

          if (data.is_final) {
            this.emit('result:final', result);
          } else {
            this.emit('result:interim', result);
          }
        }
      }

      // Handle error messages
      if (data.type === 'Error') {
        this.emit('error', new Error(data.error || 'Deepgram error'));
      }

    } catch (error) {
      console.error('Deepgram message parse error:', error);
    }
  }

  /**
   * Stop streaming transcription
   */
  async stop() {
    if (!this.isStreaming) {
      return;
    }

    try {
      // Disconnect audio processor
      if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
      }

      // Close audio context
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }

      // Close WebSocket
      if (this.socket) {
        this.socket.close(1000, 'Client stopped');
        this.socket = null;
      }

      this.isConnected = false;
      this.isStreaming = false;
      this.mediaStream = null;

      this.emit('connection:closed', { reason: 'Client stopped' });

    } catch (error) {
      console.error('Error stopping Deepgram STT:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Test API connectivity
   */
  async test() {
    try {
      const response = await fetch('https://api.deepgram.com/v1/projects', {
        method: 'GET',
        headers: {
          'Authorization': `Token ${this.apiKey}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Deepgram connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Get provider info
   */
  getProviderInfo() {
    return {
      name: 'Deepgram',
      version: '1.0.0',
      capabilities: ['streaming', 'interim-results', 'punctuation', 'capitalization'],
      models: ['nova-2', 'nova-2-ea', 'base', 'enhanced', 'conversationalai'],
      languages: ['en-US', 'en-GB', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ja', 'ko', 'zh', 'ar']
    };
  }

  /**
   * Event handling
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  emit(event, data) {
    if (!this.eventHandlers.has(event)) return;
    
    this.eventHandlers.get(event).forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in Deepgram event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.stop();
    
    if (this.eventHandlers) {
      this.eventHandlers.clear();
    }

    console.log('Deepgram STT cleanup complete');
  }
}
