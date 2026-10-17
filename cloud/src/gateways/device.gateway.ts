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
import { Logger, Inject, Optional } from '@nestjs/common';
import { DeviceService } from '../devices/device.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  DecisionEngineService,
  DecisionResult,
} from '../services/decision-engine.service';
import { EscalationService } from '../services/escalation.service';
import { TTSService } from '../tts/tts.service';
import {
  isRuntimeIdentityCurrent,
  ownsRuntimeSession,
  resolveRuntimeIdentity,
  RuntimeIdentity,
} from './runtime-identity';
import { resolveCorsOrigins } from '../config/runtime-tier';

interface DeviceSocketData {
  deviceId?: string;
  sessionId?: string | null;
  runtimeIdentity?: RuntimeIdentity;
}

type DeviceSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  DeviceSocketData
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const deviceCorsOrigins = resolveCorsOrigins();

@WebSocketGateway({
  cors: {
    origin: deviceCorsOrigins,
    credentials: true,
  },
  namespace: '/ws/runtime',
})
export class DeviceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(DeviceGateway.name);

  constructor(
    private deviceService: DeviceService,
    private prisma: PrismaService,
    @Optional() private decisionEngine?: DecisionEngineService,
    @Optional() private escalationService?: EscalationService,
    @Optional() @Inject(TTSService) private ttsService?: TTSService,
  ) {}

  @WebSocketServer()
  server: Server<
    DefaultEventsMap,
    DefaultEventsMap,
    DefaultEventsMap,
    DeviceSocketData
  >;

  async handleConnection(client: DeviceSocket): Promise<void> {
    const auth: unknown = client.handshake.auth;
    const token = isRecord(auth) ? auth.token : undefined;
    const deviceId = isRecord(auth) ? auth.device_id : undefined;

    if (
      typeof token !== 'string' ||
      !token ||
      typeof deviceId !== 'string' ||
      !deviceId
    ) {
      this.logger.warn(
        `Device connection rejected: missing token or device_id`,
      );
      client.disconnect();
      return;
    }

    const validation = await this.deviceService.validateAuthToken(token);
    const identity = await resolveRuntimeIdentity(this.prisma, token, deviceId);
    if (!identity || !validation.valid || validation.deviceId !== deviceId) {
      this.logger.warn(
        `Device connection rejected: invalid token for device ${deviceId}`,
      );
      client.disconnect();
      return;
    }

    this.logger.log(`Device connected: ${deviceId}`);
    client.data.runtimeIdentity = identity;
    client.data.deviceId = deviceId;
    client.data.sessionId = null;

    await this.deviceService.updateDeviceStatus(deviceId, 'paired');
  }

  async handleDisconnect(client: DeviceSocket): Promise<void> {
    const deviceId = client.data.deviceId;
    if (deviceId) {
      this.logger.log(`Device disconnected: ${deviceId}`);
      await this.deviceService.updateDeviceStatus(deviceId, 'disconnected');
    }
  }

  @SubscribeMessage('session:start')
  async handleSessionStart(
    @ConnectedSocket() client: DeviceSocket,
    @MessageBody() data: { session_id: string; team_id: string },
  ) {
    const identity = client.data.runtimeIdentity;
    if (
      !identity ||
      data?.team_id !== identity.teamId ||
      !(await ownsRuntimeSession(this.prisma, identity, data?.session_id))
    ) {
      return { error: 'Session is outside paired device scope' };
    }
    if (client.data.sessionId) {
      void client.leave(`session:${client.data.sessionId}`);
    }
    client.data.sessionId = data.session_id;
    this.logger.log(
      `Device ${client.data.deviceId} started session: ${data.session_id}`,
    );

    void client.join(`session:${data.session_id}`);

    return { success: true, session_id: data.session_id };
  }

  @SubscribeMessage('session:end')
  handleSessionEnd(@ConnectedSocket() client: DeviceSocket) {
    const sessionId = client.data.sessionId;
    if (sessionId) {
      void client.leave(`session:${sessionId}`);
      this.logger.log(
        `Device ${client.data.deviceId} ended session: ${sessionId}`,
      );
    }
    client.data.sessionId = null;

    return { success: true };
  }

  @SubscribeMessage('voice:transcript')
  async handleVoiceTranscript(
    @ConnectedSocket() client: DeviceSocket,
    @MessageBody() data: { text: string; isFinal: boolean; timestamp: string },
  ) {
    const identity = client.data.runtimeIdentity;
    if (!identity || !(await isRuntimeIdentityCurrent(this.prisma, identity))) {
      return { error: 'Paired device identity is no longer valid' };
    }
    if (client.data.sessionId && !(await this.hasAuthorizedSession(client))) {
      return { error: 'Session is outside paired device scope' };
    }
    this.logger.log(
      `Voice transcript accepted from ${client.data.deviceId} (${data.text.length} characters)`,
    );

    const sessionId = client.data.sessionId || 'default';

    if (this.decisionEngine && data.isFinal) {
      try {
        const result: DecisionResult =
          await this.decisionEngine.processTextInput(
            sessionId,
            data.text,
            0.8,
            'webspeech',
            { source: 'voice', timestamp: data.timestamp },
          );

        if (result.command.say?.text) {
          const sayText = result.command.say.text;
          const interruptible = result.command.say.interruptible ?? true;

          // Send text command immediately so browser can display it
          client.emit('brain:command', {
            type: 'say',
            data: {
              say: { text: sayText, interruptible },
              confidence: result.confidence,
              decision_id: result.decisionEvidence?.decision_id,
            },
            timestamp: new Date().toISOString(),
          });

          // Async: generate ElevenLabs audio and send when ready
          if (this.ttsService) {
            this.ttsService
              .speak(sayText, { interruptible })
              .then((ttsResult) => {
                if (ttsResult.audioData && ttsResult.audioData.length > 0) {
                  client.emit('brain:audio', {
                    audio: ttsResult.audioData.toString('base64'),
                    format: 'mp3',
                    duration: ttsResult.duration,
                    text: sayText,
                    timestamp: new Date().toISOString(),
                  });
                }
              })
              .catch(() => {
                this.logger.warn('TTS generation failed for brain:command');
              });
          }
        }

        if (
          result.command.type === 'ui_steps' &&
          Array.isArray(result.command.ui_steps) &&
          result.command.ui_steps.length > 0
        ) {
          client.emit('brain:command', {
            type: 'ui_steps',
            data: {
              steps: result.command.ui_steps,
              confidence: result.confidence,
              decision_id: result.decisionEvidence?.decision_id,
            },
            timestamp: new Date().toISOString(),
          });
          this.logger.log(
            `Emitted ui_steps command: ${result.command.ui_steps.length} steps`,
          );
        }
      } catch (error) {
        this.logger.error('Decision engine error:', error);
      }
    }

    return { received: true };
  }

  @SubscribeMessage('transcript')
  async handleTranscript(
    @ConnectedSocket() client: DeviceSocket,
    @MessageBody()
    data: { text: string; confidence: number; is_final: boolean },
  ) {
    const sessionId = client.data.sessionId;
    if (!sessionId) {
      return { error: 'No active session' };
    }
    if (!(await this.hasAuthorizedSession(client))) {
      return { error: 'Session is outside paired device scope' };
    }

    this.logger.debug(
      `Transcript received from ${client.data.deviceId} (${data.text.length} characters)`,
    );

    this.server.to(`session:${sessionId}`).emit('transcript', {
      device_id: client.data.deviceId,
      text: data.text,
      confidence: data.confidence,
      is_final: data.is_final,
      timestamp: new Date().toISOString(),
    });

    return { received: true };
  }

  @SubscribeMessage('ui_result')
  async handleUIResult(
    @ConnectedSocket() client: DeviceSocket,
    @MessageBody() data: Record<string, unknown>,
  ) {
    const sessionId = client.data.sessionId;
    if (!sessionId) {
      return { error: 'No active session' };
    }
    if (!(await this.hasAuthorizedSession(client))) {
      return { error: 'Session is outside paired device scope' };
    }

    this.logger.log(
      `UI result from ${client.data.deviceId}:`,
      data.execution_id,
    );

    this.server.to(`session:${sessionId}`).emit('execution_result', {
      device_id: client.data.deviceId,
      ...data,
      timestamp: new Date().toISOString(),
    });

    return { received: true };
  }

  @SubscribeMessage('adaptive_goal_result')
  async handleAdaptiveGoalResult(
    @ConnectedSocket() client: DeviceSocket,
    @MessageBody() data: Record<string, unknown>,
  ) {
    const sessionId = client.data.sessionId;
    if (!sessionId) {
      return { error: 'No active session' };
    }
    if (!(await this.hasAuthorizedSession(client))) {
      return { error: 'Session is outside paired device scope' };
    }

    this.logger.log(
      `Adaptive goal result from ${client.data.deviceId}:`,
      data.goal_status,
    );

    this.server.to(`session:${sessionId}`).emit('goal_result', {
      device_id: client.data.deviceId,
      ...data,
      timestamp: new Date().toISOString(),
    });

    return { received: true };
  }

  @SubscribeMessage('call:status')
  async handleCallStatus(
    @ConnectedSocket() client: DeviceSocket,
    @MessageBody() data: { status: string; duration?: number },
  ) {
    const sessionId = client.data.sessionId;
    if (sessionId) {
      if (!(await this.hasAuthorizedSession(client))) {
        return { error: 'Session is outside paired device scope' };
      }
      this.server.to(`session:${sessionId}`).emit('call_status', {
        device_id: client.data.deviceId,
        status: data.status,
        duration: data.duration,
        timestamp: new Date().toISOString(),
      });
    }
    return { received: true };
  }

  @SubscribeMessage('goal:execute')
  async handleGoalExecute(
    @ConnectedSocket() client: DeviceSocket,
    @MessageBody()
    data: {
      execution_id: string;
      goal: string;
      inputs?: Record<string, unknown>;
      constraints?: Record<string, unknown>;
    },
  ) {
    // Allow goal execution with or without active session
    const sessionId = client.data.sessionId;
    const identity = client.data.runtimeIdentity;
    if (!identity || !(await isRuntimeIdentityCurrent(this.prisma, identity))) {
      return { error: 'Paired device identity is no longer valid' };
    }

    this.logger.log(`Goal execution request from ${client.data.deviceId}`);

    // Emit directly to the device (same client) for session-less execution
    if (client) {
      client.emit('goal_execute', {
        device_id: client.data.deviceId,
        execution_id: data.execution_id,
        goal: data.goal,
        inputs: data.inputs,
        constraints: data.constraints,
        timestamp: new Date().toISOString(),
      });
    }

    if (sessionId) {
      if (!(await this.hasAuthorizedSession(client))) {
        return { received: true };
      }
      this.server.to(`session:${sessionId}`).emit('goal_execute', {
        device_id: client.data.deviceId,
        execution_id: data.execution_id,
        goal: data.goal,
        inputs: data.inputs,
        constraints: data.constraints,
        timestamp: new Date().toISOString(),
      });
    }

    return { received: true };
  }

  @SubscribeMessage('goal:result')
  async handleGoalResult(
    @ConnectedSocket() client: DeviceSocket,
    @MessageBody()
    data: {
      execution_id: string;
      status: string;
      goal_status: string;
      steps?: unknown[];
      duration?: number;
      artifacts?: Record<string, unknown>;
    },
  ) {
    const sessionId = client.data.sessionId;

    this.logger.log(
      `Goal result from ${client.data.deviceId}:`,
      data.goal_status,
    );

    if (sessionId) {
      if (!(await this.hasAuthorizedSession(client))) {
        return { received: true };
      }
      this.server.to(`session:${sessionId}`).emit('goal_result', {
        device_id: client.data.deviceId,
        ...data,
        timestamp: new Date().toISOString(),
      });
    }

    return { received: true };
  }

  @SubscribeMessage('error')
  async handleError(
    @ConnectedSocket() client: DeviceSocket,
    @MessageBody() data: { code: string; message: string },
  ) {
    this.logger.error(`Device ${client.data.deviceId} reported an error`);

    const sessionId = client.data.sessionId;
    if (sessionId) {
      if (!(await this.hasAuthorizedSession(client))) {
        return { received: true };
      }
      this.server.to(`session:${sessionId}`).emit('device_error', {
        device_id: client.data.deviceId,
        ...data,
        timestamp: new Date().toISOString(),
      });
    }

    return { received: true };
  }

  @SubscribeMessage('escalation:trigger')
  async handleEscalationTrigger(
    @ConnectedSocket() client: DeviceSocket,
    @MessageBody()
    data: { trigger: string; transcript: string; timestamp: string },
  ) {
    const identity = client.data.runtimeIdentity;
    if (!identity || !(await isRuntimeIdentityCurrent(this.prisma, identity))) {
      return { error: 'Paired device identity is no longer valid' };
    }
    this.logger.warn(
      `Escalation trigger received from ${client.data.deviceId}`,
    );

    if (this.escalationService) {
      try {
        if (
          client.data.sessionId &&
          !(await this.hasAuthorizedSession(client))
        ) {
          return { error: 'Session is outside paired device scope' };
        }
        const deviceId = client.data.deviceId;
        if (!deviceId)
          return { error: 'Paired device identity is unavailable' };
        const result: unknown = await this.escalationService.create({
          sessionId: client.data.sessionId || null,
          deviceId,
          trigger: data.trigger,
          triggerType: 'keyword',
          transcript: data.transcript,
          metadata: { timestamp: data.timestamp },
        });
        if (!isRecord(result) || typeof result.id !== 'string') {
          return { received: true };
        }
        const escalationId = result.id;

        this.logger.log(`Escalation logged: ${escalationId}`);

        // Emit to session room for real-time notification
        if (client.data.sessionId) {
          if (!(await this.hasAuthorizedSession(client))) {
            return { received: true };
          }
          this.server
            .to(`session:${client.data.sessionId}`)
            .emit('escalation_triggered', {
              escalation_id: escalationId,
              trigger: data.trigger,
              timestamp: data.timestamp,
            });
        }

        return { received: true, escalation_id: escalationId };
      } catch {
        this.logger.error('Failed to log escalation');
      }
    }

    return { received: true };
  }

  @SubscribeMessage('escalation:abort')
  async handleEscalationAbort(
    @ConnectedSocket() client: DeviceSocket,
    @MessageBody() data: { reason: string; timestamp: string },
  ) {
    this.logger.warn(`Escalation abort received from ${client.data.deviceId}`);

    if (this.escalationService) {
      try {
        // Find the active escalation for this session
        if (client.data.sessionId) {
          if (!(await this.hasAuthorizedSession(client))) {
            return { received: true };
          }
          const result: unknown = await this.escalationService.getBySessionId(
            client.data.sessionId,
          );
          const escalations = Array.isArray(result)
            ? result.filter(isRecord)
            : [];
          const activeEscalation = escalations.find(
            (e) => e.status === 'triggered' && typeof e.id === 'string',
          );

          if (activeEscalation) {
            const escalationId = activeEscalation.id;
            if (typeof escalationId !== 'string') return { received: true };
            await this.escalationService.abort(escalationId, data.reason);
            this.logger.log(`Escalation aborted: ${escalationId}`);
          }
        }
      } catch {
        this.logger.error('Failed to abort escalation');
      }
    }

    return { received: true };
  }

  private async hasAuthorizedSession(client: DeviceSocket): Promise<boolean> {
    const identity = client.data.runtimeIdentity;
    const sessionId = client.data.sessionId;
    return (
      !!identity &&
      !!sessionId &&
      ownsRuntimeSession(this.prisma, identity, sessionId)
    );
  }
}
