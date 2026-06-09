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
import { LLMService } from '../llm/llm.service';
import { getApiVersion } from '../version';

const voiceCorsOrigins =
  process.env.KELEDON_ALLOW_ALL_CORS === 'true'
    ? true
    : process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];

export interface CallContext {
  companyName: string;
  brandName: string;
  teamName: string;
  companyId?: string;
  brandId?: string;
  teamId?: string;
}

export interface VoiceSession {
  deviceId: string;
  sessionId: string;
  startedAt: Date;
  transcript: string[];
  context?: CallContext;
  /** Conversation history for brain context */
  history: { role: 'user' | 'assistant'; content: string }[];
  /** Whether the brain is currently speaking */
  isSpeaking: boolean;
  /** Abort controller for current TTS stream */
  abortTTS: () => void;
}

export interface VoiceCallEvents {
  'call:start': (session: VoiceSession) => void;
  'call:end': (session: VoiceSession, transcript: string[]) => void;
  transcript: (text: string, isFinal: boolean) => void;
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
export class VoiceGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(VoiceGateway.name);

  private activeSessions: Map<string, VoiceSession> = new Map();

  constructor(
    @Inject(TTSService)
    private ttsService?: TTSService,
    private llmService?: LLMService,
  ) {}

  onModuleInit() {
    this.logger.log('VoiceGateway initialized (Brain-integrated)');
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

    this.logger.log(
      `[v${getApiVersion()}] Voice connection: device=${deviceId}, session=${sessionId || 'none'}`,
    );

    const session: VoiceSession = {
      deviceId,
      sessionId: sessionId || `voice_${Date.now()}`,
      startedAt: new Date(),
      transcript: [],
      history: [],
      isSpeaking: false,
      abortTTS: () => {},
    };

    this.activeSessions.set(client.id, session);
    client.data.session = session;

    this.server.emit('voice:connected', {
      device_id: deviceId,
      session_id: session.sessionId,
      api_version: getApiVersion(),
    });
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const session = this.activeSessions.get(client.id);
    if (session) {
      this.logger.log(
        `[v${getApiVersion()}] Voice disconnected: ${session.deviceId}, transcript length: ${session.transcript.length}`,
      );

      this.server.emit('voice:disconnected', {
        device_id: session.deviceId,
        session_id: session.sessionId,
        transcript: session.transcript,
      });

      this.activeSessions.delete(client.id);
    }
  }

  /**
   * WebRTC Signaling: Handle incoming offer from browser
   */
  @SubscribeMessage('webrtc:offer')
  async handleWebRTCOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { sdp: RTCSessionDescriptionInit; session_id?: string },
  ) {
    const session = client.data.session as VoiceSession | undefined;
    this.logger.log(`WebRTC offer from ${session?.deviceId}`);

    // Phase 2: In production, this would connect to a media server like LiveKit or mediasoup
    return {
      type: 'answer',
      sdp: {
        type: 'answer',
        sdp: 'placeholder_sdp_for_development',
      },
    };
  }

  /**
   * WebRTC Signaling: Handle ICE candidates from browser
   */
  @SubscribeMessage('webrtc:ice-candidate')
  async handleICECandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { candidate: RTCIceCandidateInit },
  ) {
    const session = client.data.session as VoiceSession | undefined;
    this.logger.debug(`ICE candidate from ${session?.deviceId}`);
    return { received: true };
  }

  /**
   * Audio stream from browser (when using non-WebRTC audio)
   */
  @SubscribeMessage('audio:stream')
  async handleAudioStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { audio: Buffer; format: string },
  ) {
    const session = this.activeSessions.get(client.id);
    if (!session) {
      return { error: 'No active voice session' };
    }

    // Phase 2: stream audio to Deepgram STT for real-time transcription
    this.logger.debug(
      `Audio stream from ${session.deviceId}: ${data.audio.length} bytes`,
    );

    return { received: true };
  }

  /**
   * Text transcript from browser's STT
   * When final: call Brain API, stream TTS audio back
   */
  @SubscribeMessage('voice:transcript')
  async handleTranscript(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { text: string; is_final: boolean; confidence?: number },
  ) {
    const session = this.activeSessions.get(client.id);
    if (!session) {
      return { error: 'No active voice session' };
    }

    if (!data.is_final) {
      // Interim result — broadcast to dashboard if needed
      return { received: true };
    }

    // Final transcript
    session.transcript.push(data.text);
    session.history.push({ role: 'user', content: data.text });

    this.logger.log(
      `Transcript (final) from ${session.deviceId}: ${data.text.substring(0, 50)}...`,
    );

    // Broadcast transcript to the session room
    this.server.to(`voice:${session.sessionId}`).emit('transcript', {
      text: data.text,
      confidence: data.confidence,
      is_final: true,
      timestamp: new Date().toISOString(),
    });

    // Process through Brain LLM + TTS
    await this.processBrainReply(client, session, data.text);

    return { received: true };
  }

  /**
   * Process a user message through the Brain LLM and stream TTS audio back
   */
  private async processBrainReply(
    client: Socket,
    session: VoiceSession,
    userMessage: string,
  ): Promise<void> {
    if (!this.llmService || !this.ttsService) {
      client.emit('voice:error', { error: 'Brain services not available' });
      return;
    }

    try {
      // 1. Tell the client the brain is thinking
      client.emit('voice:brain:thinking', { text: userMessage });

      // 2. Call the Brain chat API (same endpoint the web chat uses)
      //    This uses the same LLM config as the BrainController — fallback, provider, etc.
      const apiPort = process.env.PORT || 3001;
      const brainApiUrl = `http://localhost:${apiPort}/api/brain/chat`;
      const context = session.context;
      const authToken = client.handshake.auth?.token;
      const brainPayload = {
        message: userMessage,
        companyName: context?.companyName || 'Unspecified Company',
        brandName: context?.brandName || 'Unspecified Brand',
        teamName: context?.teamName || 'Unspecified Team',
        history: session.history.slice(-10).map((h) => ({
          role: h.role,
          content: h.content,
        })),
      };

      const brainResponse = await fetch(brainApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(brainPayload),
      });

      if (!brainResponse.ok) {
        throw new Error(`Brain API returned ${brainResponse.status}`);
      }

      const brainData: any = await brainResponse.json();
      const replyText = brainData.reply?.trim() || '';

      session.history.push({ role: 'assistant', content: replyText });

      // 4. Tell client the brain's reply text (so UI can show it)
      client.emit('voice:brain:reply', {
        text: replyText,
        usage: brainData.usage,
        apiVersion: getApiVersion(),
      });

      this.logger.log(
        `[v${getApiVersion()}] Brain reply: "${replyText.substring(0, 50)}..."`,
      );

      // 5. Stream TTS audio back
      session.isSpeaking = true;

      // Set up abort handler
      let aborted = false;
      session.abortTTS = () => {
        aborted = true;
        this.ttsService?.stop();
      };

      // Send audio chunks as they arrive
      const streamResult = await this.ttsService.speakStreaming(
        replyText,
        (chunkBase64) => {
          if (aborted) return;
          client.emit('voice:audio', {
            audio: chunkBase64,
            sequence: 'chunk',
            format: 'mp3',
          });
        },
        { interruptible: true, teamId: session.context?.teamId },
      );

      // 6. Signal end of audio stream
      session.isSpeaking = false;
      session.abortTTS = () => {};

      client.emit('voice:audio', {
        sequence: 'end',
        format: 'mp3',
        duration: streamResult.duration,
        apiVersion: getApiVersion(),
      });

      this.logger.log(
        `[v${getApiVersion()}] Brain reply streamed: ${replyText.substring(0, 50)}... (${streamResult.audioData?.length || 0} bytes)`,
      );
    } catch (error) {
      this.logger.error('Brain reply error:', error);
      session.isSpeaking = false;
      session.abortTTS = () => {};
      client.emit('voice:error', { error: 'Failed to generate brain reply' });
    }
  }

  /**
   * Request TTS from cloud
   */
  @SubscribeMessage('voice:speak')
  async handleSpeak(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string; interruptible?: boolean },
  ) {
    const session = this.activeSessions.get(client.id);
    if (!session) {
      return { error: 'No active voice session' };
    }

    this.logger.log(
      `TTS request from ${session.deviceId}: ${data.text.substring(0, 50)}...`,
    );

    if (this.ttsService) {
      try {
        const result = await this.ttsService.speak(data.text, {
          interruptible: data.interruptible ?? true,
        });

        if (result.audioData) {
          client.emit('voice:audio', {
            audio: result.audioData.toString('base64'),
            duration: result.duration,
            format: 'mp3',
            sequence: 'single',
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
   * Interrupt current brain speech
   */
  @SubscribeMessage('voice:interrupt')
  async handleInterrupt(@ConnectedSocket() client: Socket) {
    const session = this.activeSessions.get(client.id);
    if (!session) {
      return { error: 'No active voice session' };
    }

    if (session.isSpeaking) {
      this.logger.log(`Interrupting TTS for ${session.deviceId}`);
      session.abortTTS();
      session.isSpeaking = false;
      client.emit('voice:interrupted', {});
    }

    return { success: true };
  }

  /**
   * Start a voice call with brain context
   */
  @SubscribeMessage('call:start')
  async handleCallStart(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      session_id?: string;
      call_type?: string;
      context?: CallContext;
    },
  ) {
    const session = this.activeSessions.get(client.id);
    if (!session) {
      return { error: 'No session' };
    }

    session.sessionId = data.session_id || session.sessionId;
    session.context = data.context || {
      companyName: 'Unspecified Company',
      brandName: 'Unspecified Brand',
      teamName: 'Unspecified Team',
    };
    session.history = []; // Reset history for new call

    this.logger.log(
      `Call started: ${session.deviceId}, session: ${session.sessionId}, context: ${session.context?.companyName}/${session.context?.brandName}`,
    );

    client.join(`voice:${session.sessionId}`);

    this.server.emit('voice:call_started', {
      device_id: session.deviceId,
      session_id: session.sessionId,
      call_type: data.call_type || 'voice',
      context: session.context,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      session_id: session.sessionId,
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

    this.logger.log(
      `Call ended: ${session.deviceId}, session: ${session.sessionId}`,
    );

    // Abort any ongoing TTS
    if (session.isSpeaking) {
      session.abortTTS();
      session.isSpeaking = false;
    }

    const transcript = [...session.transcript];

    client.leave(`voice:${session.sessionId}`);

    this.server.emit('voice:call_ended', {
      device_id: session.deviceId,
      session_id: session.sessionId,
      transcript_length: transcript.length,
      duration: Date.now() - session.startedAt.getTime(),
      timestamp: new Date().toISOString(),
    });

    // Reset session for next call
    session.transcript = [];
    session.history = [];
    session.startedAt = new Date();

    return { success: true };
  }

  /**
   * Get active voice sessions
   */
  @SubscribeMessage('voice:sessions')
  handleGetSessions() {
    const sessions = Array.from(this.activeSessions.values()).map((s) => ({
      device_id: s.deviceId,
      session_id: s.sessionId,
      started_at: s.startedAt.toISOString(),
      transcript_length: s.transcript.length,
    }));

    return { sessions };
  }
}

export default VoiceGateway;
