/**
 * Audio Capture Service - Manages microphone access and audio streams
 * Provides audio streams for STT processing
 */

import { EventEmitter } from '../core/event-router.js';

export class AudioCaptureService extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      sampleRate: 16000,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...config
    };
    
    this.mediaStream = null;
    this.audioContext = null;
    this.isActive = false;
    this.constraints = null;
  }

  /**
   * Initialize audio capture
   */
  async initialize() {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Setup microphone constraints
      this.constraints = {
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount,
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl
        }
      };

      this.emit('initialized', { config: this.config });
      console.log('AudioCaptureService: Initialized');
      
    } catch (error) {
      console.error('AudioCaptureService: Failed to initialize:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start audio capture
   * @returns {MediaStream} Audio stream
   */
  async start() {
    if (this.isActive) {
      console.warn('AudioCaptureService: Already active');
      return this.mediaStream;
    }

    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia(this.constraints);
      
      this.isActive = true;
      
      this.emit('started', { 
        streamId: this.mediaStream.id,
        sampleRate: this.config.sampleRate,
        channelCount: this.config.channelCount
      });
      
      console.log('AudioCaptureService: Started audio capture');
      return this.mediaStream;
      
    } catch (error) {
      console.error('AudioCaptureService: Failed to start audio capture:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop audio capture
   */
  stop() {
    if (!this.isActive || !this.mediaStream) return;

    try {
      // Stop all tracks
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
      });
      
      this.mediaStream = null;
      this.isActive = false;
      
      this.emit('stopped', {});
      console.log('AudioCaptureService: Stopped audio capture');
      
    } catch (error) {
      console.error('AudioCaptureService: Failed to stop audio capture:', error);
      this.emit('error', error);
    }
  }

  /**
   * Get current audio stream
   * @returns {MediaStream|null} Current audio stream
   */
  getStream() {
    return this.mediaStream;
  }

  /**
   * Check if audio capture is active
   * @returns {boolean} Active status
   */
  isRecording() {
    return this.isActive && this.mediaStream && this.mediaStream.active;
  }

  /**
   * Get audio constraints
   * @returns {Object} Current constraints
   */
  getConstraints() {
    return { ...this.constraints };
  }

  /**
   * Update audio configuration
   * @param {Object} newConfig - New configuration
   */
  async updateConfig(newConfig) {
    const wasActive = this.isActive;
    const oldConfig = { ...this.config };
    
    // Update configuration
    this.config = { ...this.config, ...newConfig };
    
    // Restart audio capture if active and config changed significantly
    const needsRestart = [
      'sampleRate', 'channelCount', 'echoCancellation', 
      'noiseSuppression', 'autoGainControl'
    ].some(key => oldConfig[key] !== this.config[key]);

    if (needsRestart && wasActive) {
      await this.stop();
      await this.start();
    }

    this.emit('config_updated', { oldConfig, newConfig: this.config });
  }

  /**
   * Check microphone permissions
   * @returns {Promise<string>} Permission state
   */
  async checkPermissions() {
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' });
      return permission.state;
    } catch (error) {
      console.warn('AudioCaptureService: Cannot check microphone permissions:', error);
      return 'prompt';
    }
  }

  /**
   * Request microphone permissions
   * @returns {Promise<boolean>} Permission granted
   */
  async requestPermissions() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop the test stream immediately
      stream.getTracks().forEach(track => track.stop());
      
      this.emit('permissions_granted', {});
      return true;
      
    } catch (error) {
      this.emit('permissions_denied', { error: error.message });
      return false;
    }
  }

  /**
   * Get available audio input devices
   * @returns {Promise<MediaDeviceInfo[]>} List of devices
   */
  async getAudioDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('AudioCaptureService: Failed to get audio devices:', error);
      return [];
    }
  }

  /**
   * Set specific audio input device
   * @param {string} deviceId - Device ID
   */
  async setAudioDevice(deviceId) {
    try {
      const wasActive = this.isActive;
      
      if (wasActive) {
        await this.stop();
      }

      // Update constraints to use specific device
      this.constraints.audio.deviceId = { exact: deviceId };

      if (wasActive) {
        await this.start();
      }

      this.emit('device_changed', { deviceId });
      
    } catch (error) {
      console.error('AudioCaptureService: Failed to set audio device:', error);
      this.emit('error', error);
    }
  }

  /**
   * Get audio stream statistics
   * @returns {Object} Stream statistics
   */
  getStreamStats() {
    if (!this.mediaStream) {
      return { active: false, tracks: [] };
    }

    const tracks = this.mediaStream.getTracks().map(track => ({
      id: track.id,
      kind: track.kind,
      label: track.label,
      enabled: track.enabled,
      muted: track.muted,
      readyState: track.readyState,
      settings: track.getSettings ? track.getSettings() : {}
    }));

    return {
      active: this.mediaStream.active,
      streamId: this.mediaStream.id,
      tracks: tracks,
      constraints: this.constraints
    };
  }

  /**
   * Create audio analyzer for visual feedback
   * @returns {AnalyserNode} Audio analyzer
   */
  createAudioAnalyzer() {
    if (!this.audioContext || !this.mediaStream) {
      throw new Error('Audio capture not active');
    }

    const source = this.audioContext.createMediaStreamSource(this.mediaStream);
    const analyzer = this.audioContext.createAnalyser();
    
    analyzer.fftSize = 2048;
    source.connect(analyzer);
    
    return analyzer;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    try {
      this.stop();
      
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
      
      this.removeAllListeners();
      
      console.log('AudioCaptureService: Cleaned up');
      
    } catch (error) {
      console.error('AudioCaptureService: Error during cleanup:', error);
    }
  }
}