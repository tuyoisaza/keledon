/**
 * Media Layer - Orchestrates all media components
 * 
 * Coordinates:
 * - Call control (WebRTC, Genesys, Avaya)
 * - Audio capture
 * - STT (Vosk, Deepgram, WebSpeech)
 * - Cloud communication (text exchange)
 * - TTS (ElevenLabs, Local)
 * - Audio output
 */

import { EventEmitter } from 'events';
import { ConfigLoader, TeamConfig } from './config-loader';
import { STTService } from './stt-service';
import { TTSService } from './tts-service';
import { VoiceActivityDetector } from './vad';
import { WebRTCAdapter } from './adapters/webrtc-adapter';
import { GenesysAdapter } from './adapters/genesys-adapter';
import { AudioCapture } from './audio-capture';

export interface MediaLayerConfig {
  deviceConfig: {
    deviceId: string;
    organizationId?: string;
    cloudUrl: string;
    authToken: string;
  };
}

export interface CallContext {
  sessionId: string;
  teamConfig: TeamConfig;
  startTime: number;
}

export type VendorAdapter = 'webrtc' | 'genesys' | 'avaya';

export class MediaLayer extends EventEmitter {
  private configLoader: ConfigLoader;
  private sttService: STTService;
  private ttsService: TTSService;
  private vad: VoiceActivityDetector;
  private webRTCAdapter: WebRTCAdapter;
  private genesysAdapter: GenesysAdapter;
  private audioCapture: AudioCapture;
  
  private currentVendor: VendorAdapter = 'webrtc';
  private currentCall: CallContext | null = null;
  private isInitialized = false;
  private useVAD = true;

  constructor() {
    super();
    this.configLoader = new ConfigLoader();
    this.sttService = new STTService();
    this.ttsService = new TTSService();
    this.vad = new VoiceActivityDetector();
    this.webRTCAdapter = new WebRTCAdapter();
    this.genesysAdapter = new GenesysAdapter();
    this.audioCapture = new AudioCapture();
  }

  /**
   * Initialize media layer with device configuration
   */
  async initialize(config: MediaLayerConfig): Promise<void> {
    console.log('[MediaLayer] Initializing...');

    const teamConfig = await this.configLoader.loadFromCloud(config.deviceConfig);
    this.currentVendor = teamConfig.vendorAdapter as VendorAdapter;

    await this.initializeStt(teamConfig);
    await this.initializeTts(teamConfig);

    this.setupEventHandlers();

    this.isInitialized = true;
    this.emit('initialized', { vendor: this.currentVendor, teamConfig });
    console.log('[MediaLayer] Initialized with vendor:', this.currentVendor);
  }

  private async initializeStt(config: TeamConfig): Promise<void> {
    const sttConfig = {
      provider: config.sttProvider as 'vosk' | 'deepgram' | 'webspeech',
      language: 'en-US',
      sampleRate: 16000,
      ...(config.voskConfig || {})
    };

    await this.sttService.initialize(sttConfig);
    console.log('[MediaLayer] STT initialized:', config.sttProvider);
  }

  private async initializeTts(config: TeamConfig): Promise<void> {
    const ttsConfig = {
      provider: config.ttsProvider as 'elevenlabs' | 'local',
      ...(config.elevenlabsConfig || {})
    };

    await this.ttsService.initialize(ttsConfig);
    console.log('[MediaLayer] TTS initialized:', config.ttsProvider);
  }

  private setupEventHandlers(): void {
    this.sttService.on('transcript', (result) => {
      if (this.currentCall) {
        this.emit('media:transcript', {
          sessionId: this.currentCall.sessionId,
          text: result.text,
          isFinal: result.is_final,
          confidence: result.confidence,
          timestamp: result.timestamp
        });
      }
    });

    this.sttService.on('error', (error) => {
      this.emit('media:error', { component: 'stt', error });
    });

    this.ttsService.on('spoke', (result) => {
      this.emit('media:spoken', result);
    });
  }

  /**
   * Start a call - initialize call context and start STT listening
   */
  async startCall(sessionId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('MediaLayer not initialized');
    }

    this.currentCall = {
      sessionId,
      teamConfig: this.configLoader.getConfig()!,
      startTime: Date.now()
    };

    console.log('[MediaLayer] Starting call:', sessionId);

    if (this.currentVendor === 'webrtc') {
      await this.startWebRTCCall();
    } else if (this.currentVendor === 'genesys') {
      await this.startGenesysCall();
    }

    await this.startListening();

    this.emit('call:started', { sessionId, vendor: this.currentVendor });
  }

  /**
   * Start WebRTC call
   */
  private async startWebRTCCall(): Promise<void> {
    await this.webRTCAdapter.initializeCall();
    await this.webRTCAdapter.createConnection();
    
    const stream = this.webRTCAdapter.getLocalStream();
    if (stream) {
      await this.audioCapture.startMicrophoneCapture();
    }
  }

  /**
   * Start Genesys call
   */
  private async startGenesysCall(): Promise<void> {
    const vendorConfig = this.configLoader.getVendorConfig();
    this.genesysAdapter.initialize(vendorConfig as any);
    await this.genesysAdapter.authenticate();
    await this.audioCapture.startMicrophoneCapture();
  }

  /**
   * Start STT listening
   */
  private async startListening(): Promise<void> {
    if (this.useVAD) {
      const stream = this.audioCapture.getStream();
      if (stream) {
        await this.vad.initialize(stream);
        this.vad.start();
      }
    }

    await this.sttService.start();
    this.emit('listening:started');
  }

  /**
   * Stop call
   */
  async stopCall(): Promise<void> {
    if (!this.currentCall) return;

    const sessionId = this.currentCall.sessionId;
    const duration = Date.now() - this.currentCall.startTime;

    console.log('[MediaLayer] Stopping call:', sessionId, 'duration:', duration);

    await this.sttService.stop();
    await this.ttsService.stop();
    await this.audioCapture.stop();
    await this.vad.stop();

    if (this.currentVendor === 'webrtc') {
      await this.webRTCAdapter.endCall();
    } else if (this.currentVendor === 'genesys') {
      this.genesysAdapter.disconnect();
    }

    this.currentCall = null;

    this.emit('call:ended', { sessionId, duration });
  }

  /**
   * Speak text response from Cloud
   */
  async speak(text: string, options?: {
    voice?: string;
    speed?: number;
    interruptible?: boolean;
  }): Promise<void> {
    await this.ttsService.speak(text, {
      voiceId: options?.voice,
      speed: options?.speed
    });
  }

  /**
   * Stop current speech
   */
  async stopSpeaking(): Promise<void> {
    await this.ttsService.stop();
  }

  /**
   * Get call status
   */
  getCallStatus(): { active: boolean; sessionId?: string; duration?: number; vendor: string } {
    return {
      active: this.currentCall !== null,
      sessionId: this.currentCall?.sessionId,
      duration: this.currentCall ? Date.now() - this.currentCall.startTime : undefined,
      vendor: this.currentVendor
    };
  }

  /**
   * Mute/unmute
   */
  mute(): void {
    this.audioCapture.mute();
    this.emit('call:muted');
  }

  unmute(): void {
    this.audioCapture.unmute();
    this.emit('call:unmuted');
  }

  /**
   * Hold/resume
   */
  async hold(): Promise<void> {
    if (this.currentVendor === 'webrtc') {
      await this.webRTCAdapter.hold();
    } else if (this.currentVendor === 'genesys' && this.currentCall) {
      const callState = this.genesysAdapter.getCurrentCallState();
      if (callState) {
        await this.genesysAdapter.holdCall(callState.id);
      }
    }
  }

  async resume(): Promise<void> {
    if (this.currentVendor === 'webrtc') {
      await this.webRTCAdapter.resume();
    } else if (this.currentVendor === 'genesys' && this.currentCall) {
      const callState = this.genesysAdapter.getCurrentCallState();
      if (callState) {
        await this.genesysAdapter.resumeCall(callState.id);
      }
    }
  }

  /**
   * Switch vendor dynamically
   */
  async switchVendor(vendor: VendorAdapter, config?: any): Promise<void> {
    this.currentVendor = vendor;
    
    if (vendor === 'genesys' && config) {
      await this.genesysAdapter.initialize(config);
    }

    this.emit('vendor:switched', { vendor });
  }

  /**
   * Get vendor adapter for external control
   */
  getVendorAdapter(): WebRTCAdapter | GenesysAdapter {
    if (this.currentVendor === 'webrtc') {
      return this.webRTCAdapter;
    }
    return this.genesysAdapter;
  }

  /**
   * Get STT service for direct control
   */
  getSTTService(): STTService {
    return this.sttService;
  }

  /**
   * Get TTS service for direct control
   */
  getTTSService(): TTSService {
    return this.ttsService;
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    if (this.currentCall) {
      await this.stopCall();
    }
    this.emit('cleanup');
    console.log('[MediaLayer] Cleaned up');
  }
}

export const mediaLayer = new MediaLayer();