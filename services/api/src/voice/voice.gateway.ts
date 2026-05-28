import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, OnModuleInit } from '@nestjs/common';
import { TTSService } from '../tts/tts.service';

const voiceCorsOrigins = process.env.KELEDON_ALLOW_ALL_CORS === 'true'
  ? true
  : process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];

export interface VoiceSession {
  deviceId: string;
  sessionId: string;
  startedAt: Date;
  transcript: string[];
}

export interface VoiceCallEvents {
  'call:start': (session: VoiceSession) => void;
  'call:end': (session: VoiceSession, transcript: string[]) => void;
  'transcript': (text: string, isFinal: boolean) => void;
}

@WebSocketGateway({
  cors: {
    origin: voiceCorsOrigins,
    credentials: true,
  },
  namespace: '/ws/voice',
  pingInterval: 10000,
  pingTimeout: 5000,
})
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  private readonly logger = new Logger(VoiceGateway.name);
  
  private activeSessions: Map<string, VoiceSession> = new Map();
  
  constructor(
    @Inject(TTSService)
    private ttsService?: TTSService,
  ) {}

  onModuleInit() {
    this.logger.log('VoiceGateway initialized');
  }

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token;
    const deviceId = client.handshake.auth?.device_id;
    const sessionId = client.handshake.auth?.session_id;

    if (!token || !deviceId) {
      this.logger.warn(`Voice connection rejected: missing token or device_id`);
      client.disconnect();
      return;
    }

    this.logger.log(`Voice connection from device: ${deviceId}, session: ${sessionId || 'none'}`);
    
    const session: VoiceSession = {
      deviceId,
      sessionId: sessionId || `voice_${Date.now()}`,
      startedAt: new Date(),
      transcript: []
    };
    
    this.activeSessions.set(client.id, session);
    client.data.session = session;

    // Notify other parts of the system
    this.server.emit('voice:connected', {
      device_id: deviceId,
      session_id: session.sessionId
    });
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const session = this.activeSessions.get(client.id);
    if (session) {
      this.logger.log(`Voice disconnected: ${session.deviceId}, transcript length: ${session.transcript.length}`);
      
      // End the call properly
      this.server.emit('voice:disconnected', {
        device_id: session.deviceId,
        session_id: session.sessionId,
        transcript: session.transcript
      });
      
      this.activeSessions.delete(client.id);
    }
  }

  /**
   * WebRTC Signaling: Handle incoming offer from browser
   * The browser creates an RTCPeerConnection and sends us the offer
   */
  @SubscribeMessage('webrtc:offer')
  async handleWebRTCOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sdp: RTCSessionDescriptionInit; session_id?: string }
  ) {
    const session = client.data.session;
    this.logger.log(`WebRTC offer from ${session?.deviceId}`);

    // In a full implementation, we would:
    // 1. Create an RTCPeerConnection on the server side (or use a media server)
    // 2. Set the remote description (the offer)
    // 3. Create an answer
    // 4. Send the answer back
    
    // For now, we log and return a placeholder
    // In production, this would connect to a media server like mediasoup or Jitsi
    this.logger.log('WebRTC signaling - awaiting media server integration');

    return {
      type: 'answer',
      sdp: {
        type: 'answer',
        sdp: 'placeholder_sdp_for_development'
      }
    };
  }

  /**
   * WebRTC Signaling: Handle ICE candidates from browser
   */
  @SubscribeMessage('webrtc:ice-candidate')
  async handleICECandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { candidate: RTCIceCandidateInit }
  ) {
    const session = client.data.session;
    this.logger.debug(`ICE candidate from ${session?.deviceId}`);
    
    // In production, relay to TURN/STUN server
    return { received: true };
  }

  /**
   * Audio stream from browser (when using non-WebRTC audio)
   */
  @SubscribeMessage('audio:stream')
  async handleAudioStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { audio: Buffer; format: string }
  ) {
    const session = this.activeSessions.get(client.id);
    if (!session) {
      return { error: 'No active voice session' };
    }

    // In production, stream this audio to Deepgram or another STT service
    this.logger.debug(`Audio stream from ${session.deviceId}: ${data.audio.length} bytes`);

    return { received: true };
  }

  /**
   * Text input (transcript) from browser's STT
   */
  @SubscribeMessage('voice:transcript')
  async handleTranscript(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string; is_final: boolean; confidence?: number }
  ) {
    const session = this.activeSessions.get(client.id);
    if (!session) {
      return { error: 'No active voice session' };
    }

    if (data.is_final) {
      session.transcript.push(data.text);
      this.logger.log(`Transcript (final) from ${session.deviceId}: ${data.text.substring(0, 50)}...`);
      
      // Broadcast to session room
      this.server.to(`voice:${session.sessionId}`).emit('transcript', {
        text: data.text,
        confidence: data.confidence,
        is_final: true,
        timestamp: new Date().toISOString()
      });
    } else {
      // Interim result
      this.server.to(`voice:${session.sessionId}`).emit('transcript', {
        text: data.text,
        confidence: data.confidence,
        is_final: false,
        timestamp: new Date().toISOString()
      });
    }

    return { received: true };
  }

  /**
   * Request TTS from cloud (browser requests cloud to speak)
   */
  @SubscribeMessage('voice:speak')
  async handleSpeak(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string; interruptible?: boolean }
  ) {
    const session = this.activeSessions.get(client.id);
    if (!session) {
      return { error: 'No active voice session' };
    }

    this.logger.log(`TTS request from ${session.deviceId}: ${data.text.substring(0, 50)}...`);

    if (this.ttsService) {
      try {
        const result = await this.ttsService.speak(data.text, { 
          interruptible: data.interruptible ?? true 
        });
        
        if (result.audioData) {
          // Send audio back to browser
          client.emit('voice:audio', {
            audio: result.audioData.toString('base64'),
            duration: result.duration,
            format: 'mp3'
          });
          
          return { success: true, duration: result.duration };
        }
        
        return { error: result.error || 'TTS failed' };
      } catch (error) {
        this.logger.error('TTS error:', error);
        return { error: 'TTS error' };
      }
    }

    return { error: 'TTS service not available' };
  }

  /**
   * Start a voice call
   */
  @SubscribeMessage('call:start')
  async handleCallStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { session_id?: string; call_type?: string }
  ) {
    const session = client.data.session;
    if (!session) {
      return { error: 'No session' };
    }

    session.sessionId = data.session_id || session.sessionId;
    
    this.logger.log(`Call started: ${session.deviceId}, session: ${session.sessionId}`);
    
    client.join(`voice:${session.sessionId}`);
    
    // Notify dashboard
    this.server.emit('voice:call_started', {
      device_id: session.deviceId,
      session_id: session.sessionId,
      call_type: data.call_type || 'voice',
      timestamp: new Date().toISOString()
    });

    return { 
      success: true, 
      session_id: session.sessionId 
    };
  }

  /**
   * End a voice call
   */
  @SubscribeMessage('call:end')
  async handleCallEnd(@ConnectedSocket() client: Socket) {
    const session = this.activeSessions.get(client.id);
    if (!session) {
      return { error: 'No active session' };
    }

    this.logger.log(`Call ended: ${session.deviceId}, session: ${session.sessionId}`);
    
    const transcript = [...session.transcript];
    
    // Leave the room
    client.leave(`voice:${session.sessionId}`);
    
    // Notify dashboard
    this.server.emit('voice:call_ended', {
      device_id: session.deviceId,
      session_id: session.sessionId,
      transcript_length: transcript.length,
      duration: Date.now() - session.startedAt.getTime(),
      timestamp: new Date().toISOString()
    });

    // Clear session but keep connection for next call
    session.transcript = [];

    return { success: true };
  }

  /**
   * Get active voice sessions (for dashboard)
   */
  @SubscribeMessage('voice:sessions')
  handleGetSessions() {
    const sessions = Array.from(this.activeSessions.values()).map(s => ({
      device_id: s.deviceId,
      session_id: s.sessionId,
      started_at: s.startedAt.toISOString(),
      transcript_length: s.transcript.length
    }));
    
    return { sessions };
  }
}

export default VoiceGateway;