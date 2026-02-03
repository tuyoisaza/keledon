/**
 * WebRTC Manager - Real-time audio/video capture and signaling
 * Integrates STT → text_input → Cloud processing → TTS/ui_steps → RPA execution
 */

export class WebRTCManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.localStream = null;
    this.remoteConnection = null;
    this.isCallActive = false;
    this.audioContext = null;
    this.mediaRecorder = null;
    this.callStartTime = null;
    
    // WebRTC configuration
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ],
      audioConstraints: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000
      },
      videoConstraints: {
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 }
      }
    };
    
    this.setupEventHandlers();
    console.log('WebRTCManager: Initialized for real-time audio/video capture');
  }

  setupEventHandlers() {
    // Handle incoming WebRTC calls
    this.eventBus.on('webrtc:incoming-call', (callData) => {
      this.handleIncomingCall(callData);
    });

    // Handle audio capture for STT
    this.eventBus.on('webrtc:start-capture', () => {
      this.startAudioCapture();
    });

    // Handle call control
    this.eventBus.on('webrtc:end-call', () => {
      this.endCall();
    });
  }

  /**
   * Initialize WebRTC for production call
   */
  async initializeWebRTC() {
    try {
      console.log('WebRTCManager: Initializing WebRTC for production call');
      
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: this.config.audioConstraints,
        video: this.config.videoConstraints
      });

      console.log('WebRTCManager: Local media stream obtained');
      
      // Setup audio processing for STT
      this.setupAudioProcessing();
      
      this.callStartTime = new Date();
      this.isCallActive = true;
      
      // Emit call start event
      this.eventBus.emit('webrtc:call-started', {
        startTime: this.callStartTime.toISOString(),
        hasAudio: !!this.localStream.getAudioTracks().length,
        hasVideo: !!this.localStream.getVideoTracks().length
      });

      return true;
    } catch (error) {
      console.error('WebRTCManager: Failed to initialize WebRTC', error);
      this.eventBus.emit('webrtc:error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Setup audio processing for STT integration
   */
  setupAudioProcessing() {
    if (!this.localStream) return;

    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    // Create audio context for real-time processing
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = this.audioContext.createMediaStreamSource(this.localStream);
    const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(this.audioContext.destination);

    // Setup media recorder for STT
    this.setupMediaRecorder();

    // Process audio chunks for STT
    processor.onaudioprocess = (event) => {
      this.processAudioChunk(event.inputBuffer);
    };

    console.log('WebRTCManager: Audio processing pipeline configured');
  }

  /**
   * Setup media recorder for real-time audio capture
   */
  setupMediaRecorder() {
    if (!this.localStream) return;

    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      // Try MediaRecorder for real-time capture
      if (typeof MediaRecorder !== 'undefined') {
        this.mediaRecorder = new MediaRecorder(this.localStream, {
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: 128000
        });

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.processAudioData(event.data);
          }
        };

        this.mediaRecorder.start(100); // 100ms chunks
        console.log('WebRTCManager: MediaRecorder configured for real-time capture');
      } else {
        console.warn('WebRTCManager: MediaRecorder not available, falling back to Web Audio API');
      }
    } catch (error) {
      console.error('WebRTCManager: Failed to setup MediaRecorder', error);
    }
  }

  /**
   * Process audio chunk for STT
   */
  processAudioChunk(audioBuffer) {
    try {
      // Convert audio buffer to format expected by STT
      const audioData = this.audioBufferToPCM(audioBuffer);
      
      // Emit audio data for STT processing
      this.eventBus.emit('stt:audio-data', {
        audioData: audioData,
        timestamp: new Date().toISOString(),
        sampleRate: this.config.audioConstraints.sampleRate
      });

    } catch (error) {
      console.error('WebRTCManager: Failed to process audio chunk', error);
    }
  }

  /**
   * Process audio data from MediaRecorder
   */
  processAudioData(audioBlob) {
    try {
      // Convert blob to PCM for STT
      const reader = new FileReader();
      reader.onload = () => {
        const audioData = new Uint8Array(reader.result);
        
        this.eventBus.emit('stt:audio-data', {
          audioData: audioData,
          timestamp: new Date().toISOString(),
          sampleRate: this.config.audioConstraints.sampleRate
        });
      };
      reader.readAsArrayBuffer(audioBlob);
    } catch (error) {
      console.error('WebRTCManager: Failed to process audio data', error);
    }
  }

  /**
   * Convert audio buffer to PCM format
   */
  audioBufferToPCM(audioBuffer) {
    const channelData = audioBuffer.getChannelData(0);
    const pcmData = new Int16Array(channelData.length);
    
    for (let i = 0; i < channelData.length; i++) {
      pcmData[i] = Math.max(-1, Math.min(1, channelData[i]) * 32767);
    }
    
    return pcmData;
  }

  /**
   * Handle incoming WebRTC call
   */
  async handleIncomingCall(callData) {
    try {
      console.log('WebRTCManager: Handling incoming call', callData);
      
      // Initialize WebRTC connection
      this.remoteConnection = new RTCPeerConnection(this.config.iceServers);
      
      // Setup connection handlers
      this.remoteConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.eventBus.emit('webrtc:ice-candidate', {
            candidate: event.candidate
          });
        }
      };

      this.remoteConnection.onaddstream = (event) => {
        console.log('WebRTCManager: Remote stream added');
        this.eventBus.emit('webrtc:remote-stream', {
          stream: event.stream
        });
      };

      // Add local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.remoteConnection.addTrack(track, this.localStream);
        });
      }

      this.isCallActive = true;
      this.callStartTime = new Date();

    } catch (error) {
      console.error('WebRTCManager: Failed to handle incoming call', error);
      this.eventBus.emit('webrtc:error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Start audio capture for STT
   */
  async startAudioCapture() {
    if (this.localStream) {
      this.setupAudioProcessing();
      console.log('WebRTCManager: Audio capture started for STT');
    }
  }

  /**
   * End current call
   */
  async endCall() {
    try {
      console.log('WebRTCManager: Ending call');
      
      // Stop media recorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }

      // Stop all tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          track.stop();
        });
      }

      // Close connection
      if (this.remoteConnection) {
        this.remoteConnection.close();
      }

      // Cleanup audio context
      if (this.audioContext) {
        await this.audioContext.close();
      }

      const callDuration = this.callStartTime ? 
        Date.now() - this.callStartTime.getTime() : 0;

      this.isCallActive = false;
      this.callStartTime = null;

      this.eventBus.emit('webrtc:call-ended', {
        duration: callDuration,
        timestamp: new Date().toISOString()
      });

      console.log(`WebRTCManager: Call ended after ${callDuration}ms`);

    } catch (error) {
      console.error('WebRTCManager: Failed to end call properly', error);
    }
  }

  /**
   * Get call status
   */
  getCallStatus() {
    return {
      isActive: this.isCallActive,
      hasLocalAudio: !!this.localStream?.getAudioTracks().length,
      hasLocalVideo: !!this.localStream?.getVideoTracks().length,
      hasRemoteAudio: !!this.remoteConnection?.getReceivers().length,
      callStartTime: this.callStartTime?.toISOString() || null,
      duration: this.callStartTime ? Date.now() - this.callStartTime.getTime() : 0,
      config: this.config
    };
  }

  /**
   * Restart call
   */
  async restartCall() {
    await this.endCall();
    await this.initializeWebRTC();
  }

  /**
   * Update WebRTC configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('WebRTCManager: Configuration updated', this.config);
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('WebRTCManager: Cleaning up resources');
    
    await this.endCall();
    
    this.localStream = null;
    this.remoteConnection = null;
    this.audioContext = null;
    this.mediaRecorder = null;
    
    console.log('WebRTCManager: Cleanup complete');
  }
}