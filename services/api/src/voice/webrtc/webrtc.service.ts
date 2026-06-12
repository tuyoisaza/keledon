import { Logger, Injectable } from '@nestjs/common';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
} from '@roamhq/wrtc';

export interface WebRtcPeer {
  pc: RTCPeerConnection;
  sessionId: string;
  createdAt: Date;
}

/**
 * WebRtcService — manages browser-to-server RTCPeerConnections.
 *
 * Each connected browser gets a peer connection that carries:
 *  - Incoming audio track (browser mic → server)
 *  - Outgoing audio track (server TTS → browser)
 *
 * Signaling is done via WS events (webrtc:offer/answer/ice-candidate).
 */
@Injectable()
export class WebRtcService {
  private readonly logger = new Logger(WebRtcService.name);
  private peers = new Map<string, WebRtcPeer>();

  private readonly iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  /**
   * Create a new peer connection for a session.
   * Called when the browser's 'webrtc:offer' is received.
   */
  async createPeer(
    sessionId: string,
    offerSdp: string,
    onTrack?: (track: RTCRtpReceiver, streams: MediaStream[]) => void,
    onDataChannel?: (dc: RTCDataChannel) => void,
  ): Promise<{ sdp: string }> {
    // Destroy existing peer if any
    await this.destroyPeer(sessionId);

    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const peer: WebRtcPeer = { pc, sessionId, createdAt: new Date() };
    this.peers.set(sessionId, peer);

    // ICE candidate logging
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.logger.debug(
          `[WebRTC/${sessionId}] ICE candidate: ${ev.candidate.candidate.slice(0, 80)}`,
        );
      }
    };

    pc.onconnectionstatechange = () => {
      this.logger.log(`[WebRTC/${sessionId}] state: ${pc.connectionState}`);
      if (
        pc.connectionState === 'failed' ||
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'closed'
      ) {
        this.destroyPeer(sessionId).catch(() => {});
      }
    };

    // Incoming audio track from browser mic
    if (onTrack) {
      pc.ontrack = (ev: RTCTrackEvent) => {
        this.logger.log(
          `[WebRTC/${sessionId}] track received: kind=${ev.track.kind} id=${ev.track.id}`,
        );
        onTrack(ev.receiver, Array.from(ev.streams));
      };
    }

    // Data channel (for control messages)
    pc.ondatachannel = (ev) => {
      this.logger.log(
        `[WebRTC/${sessionId}] data channel: ${ev.channel.label}`,
      );
      if (onDataChannel) onDataChannel(ev.channel);
    };

    // Set remote description (browser's offer)
    await pc.setRemoteDescription(
      new RTCSessionDescription({ type: 'offer', sdp: offerSdp }),
    );

    // Create answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.logger.log(`[WebRTC/${sessionId}] connection established`);
    return { sdp: answer.sdp };
  }

  /**
   * Add an ICE candidate from the browser.
   */
  async addIceCandidate(
    sessionId: string,
    candidate: RTCIceCandidateInit,
  ): Promise<void> {
    const peer = this.peers.get(sessionId);
    if (!peer) {
      this.logger.warn(`[WebRTC/${sessionId}] no peer for ICE candidate`);
      return;
    }
    try {
      await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      this.logger.warn(`[WebRTC/${sessionId}] ICE candidate rejected: ${err}`);
    }
  }

  /**
   * Create a data channel on an existing peer connection.
   */
  createDataChannel(sessionId: string, label: string): RTCDataChannel | null {
    const peer = this.peers.get(sessionId);
    if (!peer) return null;
    const dc = peer.pc.createDataChannel(label);
    return dc;
  }

  /**
   * Destroy and clean up a peer connection.
   */
  async destroyPeer(sessionId: string): Promise<void> {
    const peer = this.peers.get(sessionId);
    if (!peer) return;
    try {
      peer.pc.close();
    } catch {
      /* ignore */
    }
    this.peers.delete(sessionId);
    this.logger.log(`[WebRTC/${sessionId}] peer destroyed`);
  }

  /**
   * Check if a session has an active peer connection.
   */
  hasPeer(sessionId: string): boolean {
    return this.peers.has(sessionId);
  }

  /**
   * Get peer connection state.
   */
  getPeerState(sessionId: string): string | null {
    const peer = this.peers.get(sessionId);
    return peer ? peer.pc.connectionState : null;
  }
}
