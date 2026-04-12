/**
 * WebRTC Adapter - Handles WebRTC calls
 * 
 * Manages:
 * - RTCPeerConnection
 * - Audio capture from microphone
 * - Audio output to remote
 * - Call state (ringing, connected, ended)
 */

import { EventEmitter } from 'events';

export interface WebRTCConfig {
  iceServers?: RTCIceServer[];
  audioOnly?: boolean;
}

export interface CallState {
  status: 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'failed';
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  duration: number;
  peerConnection: RTCPeerConnection | null;
}

export class WebRTCAdapter extends EventEmitter {
  private config: WebRTCConfig;
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  
  private state: CallState = {
    status: 'idle',
    localStream: null,
    remoteStream: null,
    duration: 0,
    peerConnection: null
  };

  private durationInterval: NodeJS.Timeout | null = null;
  private startTime: number = 0;

  constructor(config?: WebRTCConfig) {
    super();
    this.config = {
      iceServers: config?.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ],
      audioOnly: config?.audioOnly ?? true
    };
  }

  /**
   * Initialize call - get local media
   */
  async initializeCall(): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: !this.config.audioOnly
      });

      this.state.localStream = this.localStream;
      this.state.status = 'ringing';

      this.emit('call:initialized', { hasAudio: true, hasVideo: !this.config.audioOnly });
      
      return this.localStream;

    } catch (error) {
      this.state.status = 'failed';
      this.emit('call:error', { error: String(error) });
      throw error;
    }
  }

  /**
   * Create peer connection and handle signaling
   */
  async createConnection(): Promise<RTCPeerConnection> {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers
    });

    this.state.peerConnection = this.peerConnection;

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Remote track received');
      this.remoteStream = event.streams[0];
      this.state.remoteStream = this.remoteStream;
      this.emit('call:remote-stream', this.remoteStream);
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.emit('call:ice-candidate', event.candidate);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', this.peerConnection?.connectionState);
      
      switch (this.peerConnection?.connectionState) {
        case 'connected':
          this.onConnected();
          break;
        case 'disconnected':
        case 'failed':
          this.onEnded();
          break;
      }
    };

    this.state.status = 'connecting';
    this.emit('call:connecting');

    return this.peerConnection;
  }

  /**
   * Handle offer (incoming call)
   */
  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      await this.createConnection();
    }

    await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection!.createAnswer();
    await this.peerConnection!.setLocalDescription(answer);

    return answer;
  }

  /**
   * Set remote description (outgoing call)
   */
  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) {
      await this.createConnection();
    }

    await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(description));
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  /**
   * Create offer for outgoing call
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      await this.createConnection();
    }

    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);

    return offer;
  }

  /**
   * Mute local audio
   */
  muteAudio(): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      this.emit('call:muted', { audio: true });
    }
  }

  /**
   * Unmute local audio
   */
  unmuteAudio(): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
      this.emit('call:unmuted', { audio: true });
    }
  }

  /**
   * Put call on hold
   */
  async hold(): Promise<void> {
    if (this.peerConnection) {
      const senders = this.peerConnection.getSenders();
      senders.forEach(sender => {
        if (sender.track?.kind === 'audio') {
          sender.track.enabled = false;
        }
      });
      this.emit('call:hold');
    }
  }

  /**
   * Resume from hold
   */
  async resume(): Promise<void> {
    if (this.peerConnection) {
      const senders = this.peerConnection.getSenders();
      senders.forEach(sender => {
        if (sender.track?.kind === 'audio') {
          sender.track.enabled = true;
        }
      });
      this.emit('call:resume');
    }
  }

  /**
   * End call
   */
  async endCall(): Promise<void> {
    this.onEnded();

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.state = {
      status: 'ended',
      localStream: null,
      remoteStream: null,
      duration: this.state.duration,
      peerConnection: null
    };

    this.emit('call:ended', { duration: this.state.duration });
  }

  /**
   * Get current state
   */
  getState(): CallState {
    return { ...this.state };
  }

  /**
   * Get remote stream (for output)
   */
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  private onConnected(): void {
    this.state.status = 'connected';
    this.startTime = Date.now();
    
    this.durationInterval = setInterval(() => {
      this.state.duration = Date.now() - this.startTime;
    }, 1000);

    this.emit('call:connected');
    console.log('[WebRTC] Call connected');
  }

  private onEnded(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }

    if (this.state.status === 'connected' || this.state.status === 'connecting') {
      this.state.status = 'ended';
    }

    this.emit('call:ended', { duration: this.state.duration });
  }
}

export const webRTCAdapter = new WebRTCAdapter();