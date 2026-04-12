"use strict";
/**
 * WebRTC Adapter - Handles WebRTC calls
 *
 * Manages:
 * - RTCPeerConnection
 * - Audio capture from microphone
 * - Audio output to remote
 * - Call state (ringing, connected, ended)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.webRTCAdapter = exports.WebRTCAdapter = void 0;
const events_1 = require("events");
class WebRTCAdapter extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.state = {
            status: 'idle',
            localStream: null,
            remoteStream: null,
            duration: 0,
            peerConnection: null
        };
        this.durationInterval = null;
        this.startTime = 0;
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
    async initializeCall() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: !this.config.audioOnly
            });
            this.state.localStream = this.localStream;
            this.state.status = 'ringing';
            this.emit('call:initialized', { hasAudio: true, hasVideo: !this.config.audioOnly });
            return this.localStream;
        }
        catch (error) {
            this.state.status = 'failed';
            this.emit('call:error', { error: String(error) });
            throw error;
        }
    }
    /**
     * Create peer connection and handle signaling
     */
    async createConnection() {
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        this.peerConnection = new RTCPeerConnection({
            iceServers: this.config.iceServers
        });
        this.state.peerConnection = this.peerConnection;
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
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
    async handleOffer(offer) {
        if (!this.peerConnection) {
            await this.createConnection();
        }
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        return answer;
    }
    /**
     * Set remote description (outgoing call)
     */
    async setRemoteDescription(description) {
        if (!this.peerConnection) {
            await this.createConnection();
        }
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(description));
    }
    /**
     * Add ICE candidate
     */
    async addIceCandidate(candidate) {
        if (this.peerConnection) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }
    /**
     * Create offer for outgoing call
     */
    async createOffer() {
        if (!this.peerConnection) {
            await this.createConnection();
        }
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        return offer;
    }
    /**
     * Mute local audio
     */
    muteAudio() {
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
    unmuteAudio() {
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
    async hold() {
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
    async resume() {
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
    async endCall() {
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
    getState() {
        return { ...this.state };
    }
    /**
     * Get remote stream (for output)
     */
    getRemoteStream() {
        return this.remoteStream;
    }
    /**
     * Get local stream
     */
    getLocalStream() {
        return this.localStream;
    }
    onConnected() {
        this.state.status = 'connected';
        this.startTime = Date.now();
        this.durationInterval = setInterval(() => {
            this.state.duration = Date.now() - this.startTime;
        }, 1000);
        this.emit('call:connected');
        console.log('[WebRTC] Call connected');
    }
    onEnded() {
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
exports.WebRTCAdapter = WebRTCAdapter;
exports.webRTCAdapter = new WebRTCAdapter();
//# sourceMappingURL=webrtc-adapter.js.map