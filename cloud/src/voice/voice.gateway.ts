import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { DefaultEventsMap, Server, Socket } from 'socket.io';
import { Logger, Inject, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TTSService } from '../tts/tts.service';
import { PrismaService } from '../prisma/prisma.service';
import { LocalAuthService } from '../auth-local/auth-local.service';
import {
  isRuntimeIdentityCurrent,
  ownsRuntimeSession,
  resolveRuntimeIdentity,
  RuntimeIdentity,
} from '../gateways/runtime-identity';

const voiceCorsOrigins =
  process.env.KELEDON_ALLOW_ALL_CORS === 'true'
    ? true
    : process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];

export interface VoiceSession {
  deviceId: string;
  userId: string;
  teamId: string;
  sessionId: string;
  roomId: string;
  startedAt: Date;
  transcript: string[];
}

export interface VoiceCallEvents {
  'call:start': (session: VoiceSession) => void;
  'call:end': (session: VoiceSession, transcript: string[]) => void;
  transcript: (text: string, isFinal: boolean) => void;
}

interface VoiceActor {
  identity: RuntimeIdentity;
  token: string;
  authentication: 'device' | 'user';
}

interface VoiceSocketData {
  actor?: VoiceActor;
  session?: VoiceSession;
}

export type VoiceSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  VoiceSocketData
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
  private readonly activeSessions = new Map<string, VoiceSession>();

  constructor(
    @Inject(TTSService) private readonly ttsService: TTSService,
    private readonly prisma: PrismaService,
    private readonly localAuth: LocalAuthService,
  ) {}

  onModuleInit(): void {
    this.logger.log('VoiceGateway initialized');
  }

  @WebSocketServer()
  server: Server<
    Record<string, never>,
    Record<string, never>,
    Record<string, never>,
    VoiceSocketData
  >;

  async handleConnection(client: VoiceSocket): Promise<void> {
    const auth: unknown = client.handshake.auth;
    const token = isRecord(auth) ? auth.token : undefined;
    const deviceId = isRecord(auth) ? auth.device_id : undefined;
    if (typeof token !== 'string' || !token) {
      client.disconnect();
      return;
    }

    const actor = await this.resolveActor(token, deviceId);
    if (!actor) {
      this.logger.warn('Voice connection rejected: invalid actor');
      client.disconnect();
      return;
    }
    client.data.actor = actor;
    const requestedSessionId = isRecord(auth) ? auth.session_id : undefined;
    const session: VoiceSession = {
      deviceId: actor.identity.deviceId || `user:${actor.identity.userId}`,
      userId: actor.identity.userId,
      teamId: actor.identity.teamId,
      sessionId:
        typeof requestedSessionId === 'string' &&
        requestedSessionId.length <= 128
          ? requestedSessionId
          : `voice_${randomUUID()}`,
      roomId: randomUUID(),
      startedAt: new Date(),
      transcript: [],
    };
    client.data.session = session;
    this.activeSessions.set(client.id, session);
    this.notifyTeam(session.teamId, 'voice:connected', {
      device_id: session.deviceId,
      session_id: session.sessionId,
    });
  }

  handleDisconnect(client: VoiceSocket): void {
    const session = this.activeSessions.get(client.id);
    if (!session) return;
    this.activeSessions.delete(client.id);
    this.notifyTeam(session.teamId, 'voice:disconnected', {
      device_id: session.deviceId,
      session_id: session.sessionId,
    });
  }

  @SubscribeMessage('webrtc:offer')
  async handleWebRTCOffer(
    @ConnectedSocket() client: VoiceSocket,
    @MessageBody() data: unknown,
  ) {
    const session = await this.currentSession(client);
    if (!session || !isRecord(data) || !isRecord(data.sdp)) {
      return { error: 'Invalid voice session or offer' };
    }
    this.logger.debug(`WebRTC offer from ${session.deviceId}`);
    return {
      type: 'answer',
      sdp: { type: 'answer', sdp: 'placeholder_sdp_for_development' },
    };
  }

  @SubscribeMessage('webrtc:ice-candidate')
  async handleICECandidate(
    @ConnectedSocket() client: VoiceSocket,
    @MessageBody() data: unknown,
  ) {
    if (
      !(await this.currentSession(client)) ||
      !isRecord(data) ||
      !isRecord(data.candidate)
    ) {
      return { error: 'Invalid voice session or candidate' };
    }
    return { received: true };
  }

  @SubscribeMessage('audio:stream')
  async handleAudioStream(
    @ConnectedSocket() client: VoiceSocket,
    @MessageBody() data: unknown,
  ) {
    const session = await this.currentSession(client);
    if (!session) return { error: 'No active voice session' };
    if (
      !isRecord(data) ||
      (!Buffer.isBuffer(data.audio) && typeof data.audio !== 'string')
    ) {
      return { error: 'Invalid audio data' };
    }
    const audioLength = Buffer.isBuffer(data.audio)
      ? data.audio.length
      : Buffer.byteLength(data.audio);
    if (audioLength > 1024 * 1024) return { error: 'Audio frame too large' };
    this.logger.debug(
      `Audio stream from ${session.deviceId}: ${audioLength} bytes`,
    );
    return { received: true };
  }

  @SubscribeMessage('voice:transcript')
  async handleTranscript(
    @ConnectedSocket() client: VoiceSocket,
    @MessageBody() data: unknown,
  ) {
    const session = await this.currentSession(client);
    if (
      !session ||
      !isRecord(data) ||
      typeof data.text !== 'string' ||
      data.text.length > 10000 ||
      typeof data.is_final !== 'boolean'
    ) {
      return { error: 'Invalid transcript or voice session' };
    }
    if (data.is_final) {
      if (session.transcript.length >= 500) session.transcript.shift();
      session.transcript.push(data.text);
    }
    const confidence =
      typeof data.confidence === 'number' && Number.isFinite(data.confidence)
        ? data.confidence
        : undefined;
    this.server.to(`voice:${session.roomId}`).emit('transcript', {
      text: data.text,
      confidence,
      is_final: data.is_final,
      timestamp: new Date().toISOString(),
    });
    return { received: true };
  }

  @SubscribeMessage('voice:speak')
  async handleSpeak(
    @ConnectedSocket() client: VoiceSocket,
    @MessageBody() data: unknown,
  ) {
    const session = await this.currentSession(client);
    if (!session) return { error: 'No active voice session' };
    if (
      !isRecord(data) ||
      typeof data.text !== 'string' ||
      data.text.length > 10000
    ) {
      return { error: 'Invalid TTS request' };
    }
    this.logger.log(
      `TTS request from ${session.deviceId} (${data.text.length} characters)`,
    );
    try {
      const result = await this.ttsService.speak(data.text, {
        interruptible:
          typeof data.interruptible === 'boolean' ? data.interruptible : true,
      });
      if (!result.audioData) return { error: 'TTS failed' };
      client.emit('voice:audio', {
        audio: result.audioData.toString('base64'),
        duration: result.duration,
        format: 'mp3',
      });
      return { success: true, duration: result.duration };
    } catch {
      this.logger.error('TTS provider request failed');
      return { error: 'TTS error' };
    }
  }

  @SubscribeMessage('call:start')
  async handleCallStart(
    @ConnectedSocket() client: VoiceSocket,
    @MessageBody() data: unknown,
  ) {
    const session = await this.currentSession(client);
    if (!session) return { error: 'No active voice session' };
    if (data !== undefined && !isRecord(data))
      return { error: 'Invalid call request' };
    const requestedId = isRecord(data) ? data.session_id : undefined;
    if (
      requestedId !== undefined &&
      (typeof requestedId !== 'string' ||
        !requestedId ||
        requestedId.length > 128)
    ) {
      return { error: 'Invalid call session' };
    }
    if (typeof requestedId === 'string') {
      const actor = client.data.actor;
      if (!actor) return { error: 'Unauthenticated voice actor' };
      const persisted = await this.prisma.session.findUnique({
        where: { id: requestedId },
        select: { id: true },
      });
      if (
        persisted &&
        !(await ownsRuntimeSession(this.prisma, actor.identity, requestedId))
      ) {
        return { error: 'Session is outside actor scope' };
      }
      session.sessionId = requestedId;
    }
    await client.join(`voice:${session.roomId}`);
    this.notifyTeam(session.teamId, 'voice:call_started', {
      device_id: session.deviceId,
      session_id: session.sessionId,
      call_type:
        isRecord(data) && typeof data.call_type === 'string'
          ? data.call_type.slice(0, 80)
          : 'voice',
      timestamp: new Date().toISOString(),
    });
    return { success: true, session_id: session.sessionId };
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(@ConnectedSocket() client: VoiceSocket) {
    const session = await this.currentSession(client);
    if (!session) return { error: 'No active session' };
    await client.leave(`voice:${session.roomId}`);
    this.notifyTeam(session.teamId, 'voice:call_ended', {
      device_id: session.deviceId,
      session_id: session.sessionId,
      transcript_length: session.transcript.length,
      duration: Date.now() - session.startedAt.getTime(),
      timestamp: new Date().toISOString(),
    });
    session.transcript = [];
    return { success: true };
  }

  @SubscribeMessage('voice:sessions')
  async handleGetSessions(@ConnectedSocket() client: VoiceSocket) {
    const session = await this.currentSession(client);
    if (!session) return { sessions: [] };
    return {
      sessions: [
        {
          device_id: session.deviceId,
          session_id: session.sessionId,
          started_at: session.startedAt.toISOString(),
          transcript_length: session.transcript.length,
        },
      ],
    };
  }

  private async resolveActor(
    token: string,
    deviceId: unknown,
  ): Promise<VoiceActor | null> {
    if (typeof deviceId === 'string' && deviceId) {
      const identity = await resolveRuntimeIdentity(
        this.prisma,
        token,
        deviceId,
      );
      if (identity) return { identity, token, authentication: 'device' };
    }
    const actor = await this.localAuth.validateToken(token);
    if (!actor?.id || !actor.team_id || !actor.company_id) return null;
    const team = await this.prisma.team.findUnique({
      where: { id: actor.team_id },
      include: { brand: { include: { company: true } } },
    });
    if (!team?.brand || team.brand.companyId !== actor.company_id) return null;
    return {
      token,
      authentication: 'user',
      identity: {
        deviceId: '',
        userId: actor.id,
        teamId: team.id,
        companyId: team.brand.companyId,
        brandId: team.brand.id,
        companyName: team.brand.company.name,
        brandName: team.brand.name,
        teamName: team.name,
      },
    };
  }

  private async currentSession(
    client: VoiceSocket,
  ): Promise<VoiceSession | null> {
    const session = this.activeSessions.get(client.id);
    const actor = client.data.actor;
    if (!session || !actor || session.userId !== actor.identity.userId) {
      return null;
    }
    if (!(await this.actorIsCurrent(actor))) return null;
    return session;
  }

  private async actorIsCurrent(actor: VoiceActor): Promise<boolean> {
    if (actor.authentication === 'device') {
      return isRuntimeIdentityCurrent(this.prisma, actor.identity);
    }
    const current = await this.localAuth.validateToken(actor.token);
    return (
      current?.id === actor.identity.userId &&
      current.team_id === actor.identity.teamId &&
      current.company_id === actor.identity.companyId
    );
  }

  private notifyTeam(teamId: string, event: string, payload: unknown): void {
    this.server.of('/dashboard').to(`team:${teamId}`).emit(event, payload);
  }
}

export default VoiceGateway;
