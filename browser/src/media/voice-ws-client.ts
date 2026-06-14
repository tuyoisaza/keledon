import { EventEmitter } from 'events';
import { io, Socket } from 'socket.io-client';
import log from 'electron-log';
import { runtimeStatus } from '../runtime-state';
import * as cmdlog from '../cmdlog';

export interface VoiceClientOptions {
  cloudUrl: string;
  authToken: string;
  deviceId: string;
  teamId?: string;
  language?: string;
}

export interface VoiceClientStatus {
  connected: boolean;
  deviceId: string;
  sessionId?: string;
}

/**
 * Voice Gateway WebSocket client for cloud TTS/STT.
 *
 * Connects to the Voice Gateway (/ws/voice) and provides:
 * - speak(): send text to cloud TTS (respecting team's ttsProvider config)
 * - Audio playback via AudioContext (not speechSynthesis)
 * - Automatic reconnection
 */
export class VoiceWSClient extends EventEmitter {
  private socket: Socket | null = null;
  private options: VoiceClientOptions;
  private audioContext: AudioContext | null = null;
  private isSpeaking = false;
  private reconnectAttempt = 0;
  private maxReconnectDelay = 30000;

  constructor(options: VoiceClientOptions) {
    super();
    this.options = options;
  }

  /**
   * Connect to the Voice Gateway WebSocket.
   */
  async connect(): Promise<void> {
    if (this.socket?.connected) return;

    const wsUrl = this.deriveWsUrl(this.options.cloudUrl);
    const ctx = cmdlog.truncate(this.options.deviceId, 8, 4);

    this.socket = io(`${wsUrl}/ws/voice`, {
      auth: {
        token: this.options.authToken,
        device_id: this.options.deviceId,
        team_id: this.options.teamId || '',
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: this.maxReconnectDelay,
      reconnectionAttempts: Infinity,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      this.reconnectAttempt = 0;
      cmdlog.log('VOICE', `← Connected to Voice Gateway | device: ${ctx}`);
      log.info('[VoiceWS] Connected to Voice Gateway');
      this.emit('connected');

      // Start a voice session
      this.socket?.emit('call:start', {
        session_id: runtimeStatus.sessionId || undefined,
        context: {
          companyName: 'Unspecified Company',
          brandName: 'Unspecified Brand',
          teamName: runtimeStatus.teamName || 'Unspecified Team',
          teamId: this.options.teamId,
          language: this.options.language || runtimeStatus.language || 'en-US',
        },
      });
    });

    this.socket.on('disconnect', (reason) => {
      cmdlog.log('VOICE', `← Disconnected from Voice Gateway | reason: ${reason} | device: ${ctx}`);
      log.warn('[VoiceWS] Disconnected:', reason);
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempt++;
      cmdlog.log('VOICE', `← Connection error: ${error.message} (attempt ${this.reconnectAttempt}) | device: ${ctx}`);
      log.warn('[VoiceWS] Connection error:', error.message);
    });

    // Handle TTS audio chunks
    this.socket.on('voice:audio', (data: {
      audio: string;   // base64
      sequence: 'chunk' | 'end' | 'single';
      format?: string;
      duration?: number;
    }) => {
      if (data.sequence === 'chunk' || data.sequence === 'single') {
        this.playAudioChunk(data.audio, data.format || 'mp3');
      }
      if (data.sequence === 'end' || data.sequence === 'single') {
        this.isSpeaking = false;
        this.emit('speak:end', { duration: data.duration });
      }
    });

    // Handle errors
    this.socket.on('voice:error', (data: { error: string }) => {
      log.error('[VoiceWS] Server error:', data.error);
      this.emit('error', new Error(data.error));
    });

    // Handle brain replies (text display)
    this.socket.on('voice:brain:reply', (data: { text: string; source?: string }) => {
      this.emit('brain:reply', data.text, data.source);
    });

    this.socket.on('voice:brain:thinking', () => {
      this.emit('brain:thinking');
    });

    this.socket.on('voice:interrupted', () => {
      this.isSpeaking = false;
      this.emit('speak:interrupted');
    });

    this.socket.on('voice:rpa:steps', (data: { steps: unknown[] }) => {
      this.emit('rpa:steps', data.steps);
    });
  }

  /**
   * Send text to the Voice Gateway for TTS.
   * The cloud uses the team's configured TTS provider (Kokoro, ElevenLabs, etc.).
   */
  async speak(text: string, interruptible = true): Promise<void> {
    if (!this.socket?.connected) {
      throw new Error('Voice Gateway not connected');
    }

    this.isSpeaking = true;
    this.socket.emit('voice:speak', { text, interruptible });
  }

  /**
   * Interrupt current TTS playback.
   */
  interrupt(): void {
    if (this.socket?.connected) {
      this.socket.emit('voice:interrupt');
    }
    this.stopAudio();
    this.isSpeaking = false;
  }

  /**
   * Check if the client is currently speaking.
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Get connection status.
   */
  getStatus(): VoiceClientStatus {
    return {
      connected: this.socket?.connected ?? false,
      deviceId: this.options.deviceId,
      sessionId: runtimeStatus.sessionId,
    };
  }

  /**
   * Disconnect and clean up.
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.emit('call:end', {});
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.stopAudio();
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.isSpeaking = false;
  }

  // ===================== Private Methods =====================

  /**
   * Play a base64-encoded audio chunk using AudioContext.
   */
  private async playAudioChunk(base64Data: string, format: string): Promise<void> {
    try {
      // Lazy-init AudioContext (must be after user gesture)
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      // Resume if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Decode base64 → ArrayBuffer → AudioBuffer
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const audioBuffer = await this.audioContext.decodeAudioData(bytes.buffer);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);
    } catch (error) {
      log.error('[VoiceWS] Audio playback error:', error);
      this.emit('error', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Stop all currently playing audio.
   */
  private stopAudio(): void {
    // AudioContext doesn't support per-source stop via simple API,
    // but closing and reopening is the nuclear option.
    // For now, we just mark not-speaking and let the chunks finish.
    // A future enhancement could use a GainNode for quick mute.
  }

  /**
   * Derive WebSocket URL from cloud HTTP URL.
   */
  private deriveWsUrl(httpUrl: string): string {
    // Default to the configured voice gateway URL or derive from cloudUrl
    const voiceWsUrl = process.env.VOICE_WS_URL || '';
    if (voiceWsUrl) return voiceWsUrl;

    // Derive from cloudUrl: https:// → wss://, http:// → ws://
    if (httpUrl.startsWith('https://')) return httpUrl.replace('https://', 'wss://');
    if (httpUrl.startsWith('http://')) return httpUrl.replace('http://', 'ws://');
    return `wss://${httpUrl}`;
  }
}

/**
 * Singleton voice client instance.
 */
export let voiceClient: VoiceWSClient | null = null;

/**
 * Initialize the voice client singleton.
 */
export function initVoiceClient(options: VoiceClientOptions): VoiceWSClient {
  if (voiceClient) {
    voiceClient.disconnect();
  }
  voiceClient = new VoiceWSClient(options);
  return voiceClient;
}

/**
 * Get the current voice client instance.
 */
export function getVoiceClient(): VoiceWSClient | null {
  return voiceClient;
}
