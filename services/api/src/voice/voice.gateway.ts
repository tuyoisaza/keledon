import { PrismaService } from '../prisma/prisma.service';
import {
  resolveRuntimeIdentity,
  ownsRuntimeSession,
} from '../gateways/runtime-identity';
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
import { Logger, Inject } from '@nestjs/common';
import { TTSService } from '../tts/tts.service';
import { LLMService } from '../llm/llm.service';
import { getApiVersion } from '../version';
import { ProviderConfigResolver } from './providers/provider-config.resolver';
import { VoiceProviderRegistry } from './providers/voice-provider.registry';
import { WebRtcService } from './webrtc/webrtc.service';
import {
  voiceCorsOrigins,
  type CallContext,
  type VoiceSession,
} from './voice.types';
import { buildCallGreeting } from './voice-helpers';
import { VoiceBrainProcessor } from './voice-brain.processor';
import {
  getAuthorizedVoiceSession,
  listVoiceSessionSummaries,
} from './voice-session-access';
import { VoiceWebRtcHandlers } from './voice-webrtc.handlers';

@WebSocketGateway({
  cors: {
    origin: voiceCorsOrigins,
    credentials: true,
  },
  namespace: '/ws/voice',
  pingInterval: 10000,
  pingTimeout: 5000,
})
export class VoiceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(VoiceGateway.name);

  private activeSessions: Map<string, VoiceSession> = new Map();
  private readonly brainProcessor: VoiceBrainProcessor;
  private readonly webRtcHandlers: VoiceWebRtcHandlers;

  constructor(
    @Inject(TTSService)
    private ttsService?: TTSService,
    private llmService?: LLMService,
    private readonly configResolver?: ProviderConfigResolver,
    private readonly registry?: VoiceProviderRegistry,
    private readonly webrtcService?: WebRtcService,
    private readonly prisma?: PrismaService,
  ) {
    this.brainProcessor = new VoiceBrainProcessor(
      this.ttsService,
      this.llmService,
      this.logger,
      (client) =>
        getAuthorizedVoiceSession(this.prisma, this.activeSessions, client),
    );
    this.webRtcHandlers = new VoiceWebRtcHandlers(
      this.prisma,
      this.activeSessions,
      this.logger,
      this.configResolver,
      this.webrtcService,
      this.handleTranscript.bind(this),
    );
  }

  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token;
    const deviceId = client.handshake.auth?.device_id;
    const sessionId = client.handshake.auth?.session_id;

    const identity = this.prisma
      ? await resolveRuntimeIdentity(this.prisma, token, deviceId)
      : null;
    if (
      !identity ||
      (sessionId &&
        !(await ownsRuntimeSession(this.prisma, identity, sessionId)))
    ) {
      this.logger.warn(`Voice connection rejected: missing token or device_id`);
      client.disconnect();
      return;
    }

    this.logger.log(
      `[v${getApiVersion()}] Voice connection: device=${deviceId}, session=${sessionId || 'none'}`,
    );

    const session: VoiceSession = {
      deviceId,
      sessionId: sessionId || `voice_${client.id}`,
      startedAt: new Date(),
      transcript: [],
      history: [],
      isSpeaking: false,
      abortTTS: () => {},
      latencyTimestamps: {},
    };

    client.data.runtimeIdentity = identity;
    this.activeSessions.set(client.id, session);
    client.data.session = session;

    // Resolve team provider config from auth context if available
    const ctx: CallContext = {
      companyId: identity.companyId,
      companyName: identity.companyName,
      brandId: identity.brandId,
      brandName: identity.brandName,
      teamId: identity.teamId,
      teamName: identity.teamName,
    };
    session.context = ctx;
    if (ctx?.teamId && this.configResolver && this.registry) {
      try {
        const config = await this.configResolver.resolveTeamConfig(ctx.teamId);
        config.authToken = token;
        session.context = ctx;
        await this.registry.getOrCreateProvider(session.sessionId, config);
        if (config.ttsProvider === 'speaches') {
          const warmupLang = (ctx.language || 'en').startsWith('es')
            ? 'es'
            : 'en';
          void this.ttsService
            ?.warmSpeachesForTeam(ctx.teamId, warmupLang)
            .catch((err) => {
              this.logger.warn(
                `Speaches warmup failed: ${err instanceof Error ? err.message : String(err)}`,
              );
            });
        }
        this.logger.log(
          `Provider configured for team ${ctx.teamId}: STT=${config.sttProvider} TTS=${config.ttsProvider}`,
        );
      } catch (err) {
        this.logger.warn(
          `Could not resolve provider config: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    client.emit('voice:connected', {
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

      client.emit('voice:disconnected', {
        device_id: session.deviceId,
        session_id: session.sessionId,
        transcript: session.transcript,
      });

      await this.webrtcService?.destroyPeer(session.sessionId);
      this.activeSessions.delete(client.id);

      // Clean up provider session
      if (this.registry) {
        this.registry.endSession(session.sessionId).catch(() => {});
      }
    }
  }

  /**
   * WebRTC Signaling: Handle incoming offer from browser
   * Creates a real peer connection via WebRtcService.
   */
  @SubscribeMessage('webrtc:offer')
  async handleWebRTCOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { sdp: RTCSessionDescriptionInit; session_id?: string },
  ) {
    return this.webRtcHandlers.handleOffer(client, data);
  }

  /**
   * WebRTC Signaling: Handle ICE candidates from browser
   */
  @SubscribeMessage('webrtc:ice-candidate')
  async handleICECandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { candidate: RTCIceCandidateInit },
  ) {
    return this.webRtcHandlers.handleIceCandidate(client, data);
  }

  /**
   * Audio stream from browser (when using non-WebRTC audio)
   */
  @SubscribeMessage('audio:stream')
  async handleAudioStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { audio: Buffer; format: string },
  ) {
    return this.webRtcHandlers.handleAudioStream(client, data);
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
    const session = await getAuthorizedVoiceSession(
      this.prisma,
      this.activeSessions,
      client,
    );
    if (!session) {
      return { error: 'No active voice session' };
    }

    if (
      !data ||
      typeof data.text !== 'string' ||
      !data.text.trim() ||
      data.text.length > 8000
    )
      return { error: 'Invalid transcript' };
    if (process.env.KELEDON_VOICE_DISABLED === 'true')
      return { error: 'Voice disabled' };
    if (!data.is_final) {
      // Interim result — broadcast to dashboard if needed
      return { received: true };
    }

    if ((session.turnCount || 0) >= 120)
      return { error: 'Voice call turn limit reached' };
    session.turnCount = (session.turnCount || 0) + 1;
    // Final transcript
    session.transcript.push(data.text);
    session.history.push({ role: 'user', content: data.text });

    this.logger.log('Final transcript accepted');

    // Broadcast transcript to the session room
    this.server.to(`voice:${session.sessionId}`).emit('transcript', {
      text: data.text,
      confidence: data.confidence,
      is_final: true,
      timestamp: new Date().toISOString(),
    });

    // Process through Brain LLM + TTS
    await this.brainProcessor.processBrainReply(client, session, data.text);

    return { received: true };
  }

  @SubscribeMessage('voice:speak')
  async handleSpeak(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string; interruptible?: boolean },
  ) {
    const session = await getAuthorizedVoiceSession(
      this.prisma,
      this.activeSessions,
      client,
    );
    if (!session) {
      return { error: 'No active voice session' };
    }

    if (
      !data ||
      typeof data.text !== 'string' ||
      !data.text.trim() ||
      data.text.length > 8000 ||
      process.env.KELEDON_VOICE_DISABLED === 'true'
    )
      return { error: 'Invalid or disabled speech request' };
    this.logger.log(
      `[v${getApiVersion()}] TTS request from ${session.deviceId} (${data.text.length} characters) team=${session.context?.teamId || 'none'}`,
    );

    if (this.ttsService) {
      try {
        const result = await this.ttsService.speak(data.text, {
          interruptible: data.interruptible ?? true,
          teamId: session.context?.teamId,
          forceLanguageVoice: true,
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
      } catch {
        this.logger.error('TTS provider request failed');
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
    return this.webRtcHandlers.interrupt(client);
  }

  @SubscribeMessage('voice:rpa:execute')
  async handleRpaExecute(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      steps: Array<{
        action: string;
        selector?: string;
        value?: string;
        url?: string;
        attribute?: string;
        ms?: number;
      }>;
    },
  ) {
    const session = await getAuthorizedVoiceSession(
      this.prisma,
      this.activeSessions,
      client,
    );
    if (!session) {
      return { error: 'No active voice session' };
    }

    this.logger.log(
      `[v${getApiVersion()}] RPA execute: ${data.steps.length} steps for ${session.deviceId}`,
    );

    // Only Cloud-issued commands may authorize browser actions. Caller-supplied relay is rejected.
    return { error: 'Cloud-issued RPA command required' };
  }

  /**
   * Receive RPA execution result from the browser.
   */
  @SubscribeMessage('voice:rpa:result')
  async handleRpaResult(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      success: boolean;
      results: Array<{
        step_index: number;
        action: string;
        success: boolean;
        data?: unknown;
        error?: string;
      }>;
    },
  ) {
    const session = await getAuthorizedVoiceSession(
      this.prisma,
      this.activeSessions,
      client,
    );
    if (!session) {
      return { error: 'No active voice session' };
    }

    const successCount = data.results.filter((r) => r.success).length;
    this.logger.log(
      `[v${getApiVersion()}] RPA result: ${successCount}/${data.results.length} steps OK for ${session.deviceId}`,
    );

    // Store in session for context
    if (!session.transcript) session.transcript = [];
    session.transcript.push(
      `[RPA] ${data.results.length} steps, ${successCount} succeeded`,
    );

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
    const session = await getAuthorizedVoiceSession(
      this.prisma,
      this.activeSessions,
      client,
    );
    if (!session) {
      return { error: 'No session' };
    }

    const identity = client.data.runtimeIdentity;
    if (
      !identity ||
      (data?.session_id &&
        !(await ownsRuntimeSession(this.prisma, identity, data.session_id)))
    )
      return { error: 'Invalid call session' };
    client.leave(`voice:${session.sessionId}`);
    const previousSessionId = session.sessionId;
    if (data.session_id && data.session_id !== previousSessionId) {
      await this.registry?.endSession(previousSessionId);
      await this.webrtcService?.destroyPeer(previousSessionId);
    }
    session.callGeneration = (session.callGeneration || 0) + 1;
    session.sessionId = data.session_id || session.sessionId;
    session.context = {
      companyId: identity.companyId,
      companyName: identity.companyName,
      brandId: identity.brandId,
      brandName: identity.brandName,
      teamId: identity.teamId,
      teamName: identity.teamName,
      language:
        typeof data.context?.language === 'string'
          ? data.context.language
          : undefined,
    };
    session.history = []; // Reset history for new call
    session.turnCount = 0;

    this.logger.log(
      `Call started: ${session.deviceId}, session: ${session.sessionId}, context: ${session.context?.companyName}/${session.context?.brandName}`,
    );

    // Create provider for this session if not already created and config is available
    const ctx = session.context;
    if (ctx?.teamId && this.configResolver && this.registry) {
      try {
        const config = await this.configResolver.resolveTeamConfig(ctx.teamId);
        config.authToken =
          (client.handshake.auth?.token as string) || undefined;
        await this.registry.getOrCreateProvider(session.sessionId, config);
        if (config.ttsProvider === 'speaches') {
          const warmupLang = (ctx.language || 'en').startsWith('es')
            ? 'es'
            : 'en';
          void this.ttsService
            ?.warmSpeachesForTeam(ctx.teamId, warmupLang)
            .catch((err) => {
              this.logger.warn(
                `Speaches warmup failed: ${err instanceof Error ? err.message : String(err)}`,
              );
            });
        }
        this.logger.log(
          `Provider configured for team ${ctx.teamId}: STT=${config.sttProvider} TTS=${config.ttsProvider}`,
        );
      } catch (err) {
        this.logger.warn(
          `Could not resolve provider config: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    client.join(`voice:${session.sessionId}`);

    client.emit('voice:call_started', {
      device_id: session.deviceId,
      session_id: session.sessionId,
      call_type: data.call_type || 'voice',
      context: session.context,
      timestamp: new Date().toISOString(),
    });

    const greeting = buildCallGreeting(session.context);
    session.history.push({ role: 'assistant', content: greeting });
    this.logger.log(
      `[v${getApiVersion()}] Call greeting queued session=${session.sessionId} text="${greeting}"`,
    );
    void this.brainProcessor
      .speakVoiceText(client, session, greeting, 'greeting')
      .catch((err) => {
        this.logger.warn(
          `Call greeting failed: ${err instanceof Error ? err.message : String(err)}`,
        );
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
    const session = await getAuthorizedVoiceSession(
      this.prisma,
      this.activeSessions,
      client,
    );
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

    session.callGeneration = (session.callGeneration || 0) + 1;
    const transcript = [...session.transcript];

    client.leave(`voice:${session.sessionId}`);
    await this.webrtcService?.destroyPeer(session.sessionId);

    client.emit('voice:call_ended', {
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
  handleGetSessions(@ConnectedSocket() client: Socket) {
    return {
      sessions: listVoiceSessionSummaries(this.activeSessions, client.id),
    };
  }
}

export default VoiceGateway;
