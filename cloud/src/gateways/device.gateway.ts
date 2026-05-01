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
import { Logger, Inject, Optional } from '@nestjs/common';
import { DeviceService } from '../devices/device.service';
import { PrismaService } from '../prisma/prisma.service';
import { DecisionEngineService, DecisionContext, DecisionResult } from '../services/decision-engine.service';
import { EscalationService } from '../services/escalation.service';
import { TTSService } from '../tts/tts.service';

const deviceCorsOrigins = process.env.KELEDON_ALLOW_ALL_CORS === 'true'
  ? true
  : process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];

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
  server: Server;

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token;
    const deviceId = client.handshake.auth?.device_id;

    if (!token || !deviceId) {
      this.logger.warn(`Device connection rejected: missing token or device_id`);
      client.disconnect();
      return;
    }

    const validation = await this.deviceService.validateAuthToken(token);
    if (!validation.valid || validation.deviceId !== deviceId) {
      this.logger.warn(`Device connection rejected: invalid token for device ${deviceId}`);
      client.disconnect();
      return;
    }

    this.logger.log(`Device connected: ${deviceId}`);
    client.data.deviceId = deviceId;
    client.data.sessionId = null;

    await this.deviceService.updateDeviceStatus(deviceId, 'paired');
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const deviceId = client.data.deviceId;
    if (deviceId) {
      this.logger.log(`Device disconnected: ${deviceId}`);
      await this.deviceService.updateDeviceStatus(deviceId, 'disconnected');
    }
  }

  @SubscribeMessage('session:start')
  async handleSessionStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { session_id: string; team_id: string }
  ) {
    client.data.sessionId = data.session_id;
    this.logger.log(`Device ${client.data.deviceId} started session: ${data.session_id}`);
    
    client.join(`session:${data.session_id}`);
    
    return { success: true, session_id: data.session_id };
  }

  @SubscribeMessage('session:end')
  async handleSessionEnd(@ConnectedSocket() client: Socket) {
    const sessionId = client.data.sessionId;
    if (sessionId) {
      client.leave(`session:${sessionId}`);
      this.logger.log(`Device ${client.data.deviceId} ended session: ${sessionId}`);
    }
    client.data.sessionId = null;
    
    return { success: true };
  }

  @SubscribeMessage('voice:transcript')
  async handleVoiceTranscript(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string; isFinal: boolean; timestamp: string }
  ) {
    this.logger.log(`Voice transcript from ${client.data.deviceId}: ${data.text.substring(0, 50)}...`);
    
    const sessionId = client.data.sessionId || 'default';
    
    if (this.decisionEngine && data.isFinal) {
      try {
        const result: DecisionResult = await this.decisionEngine.processTextInput(
          sessionId,
          data.text,
          0.8,
          'webspeech',
          { source: 'voice', timestamp: data.timestamp }
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
              decision_id: result.decisionEvidence?.decision_id
            },
            timestamp: new Date().toISOString()
          });

          // Async: generate ElevenLabs audio and send when ready
          if (this.ttsService) {
            this.ttsService.speak(sayText, { interruptible }).then(ttsResult => {
              if (ttsResult.audioData && ttsResult.audioData.length > 0) {
                client.emit('brain:audio', {
                  audio: ttsResult.audioData.toString('base64'),
                  format: 'mp3',
                  duration: ttsResult.duration,
                  text: sayText,
                  timestamp: new Date().toISOString()
                });
              }
            }).catch(err => {
              this.logger.warn(`TTS generation failed for brain:command: ${err.message}`);
            });
          }
        }
      } catch (error) {
        this.logger.error('Decision engine error:', error);
      }
    }
    
    return { received: true };
  }

  @SubscribeMessage('transcript')
  async handleTranscript(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string; confidence: number; is_final: boolean }
  ) {
    const sessionId = client.data.sessionId;
    if (!sessionId) {
      return { error: 'No active session' };
    }

    this.logger.debug(`Transcript from ${client.data.deviceId}: ${data.text}`);

    this.server.to(`session:${sessionId}`).emit('transcript', {
      device_id: client.data.deviceId,
      text: data.text,
      confidence: data.confidence,
      is_final: data.is_final,
      timestamp: new Date().toISOString()
    });

    return { received: true };
  }

  @SubscribeMessage('ui_result')
  async handleUIResult(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any
  ) {
    const sessionId = client.data.sessionId;
    if (!sessionId) {
      return { error: 'No active session' };
    }

    this.logger.log(`UI result from ${client.data.deviceId}:`, data.execution_id);

    this.server.to(`session:${sessionId}`).emit('execution_result', {
      device_id: client.data.deviceId,
      ...data,
      timestamp: new Date().toISOString()
    });

    return { received: true };
  }

  @SubscribeMessage('adaptive_goal_result')
  async handleAdaptiveGoalResult(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any
  ) {
    const sessionId = client.data.sessionId;
    if (!sessionId) {
      return { error: 'No active session' };
    }

    this.logger.log(`Adaptive goal result from ${client.data.deviceId}:`, data.goal_status);

    this.server.to(`session:${sessionId}`).emit('goal_result', {
      device_id: client.data.deviceId,
      ...data,
      timestamp: new Date().toISOString()
    });

    return { received: true };
  }

  @SubscribeMessage('call:status')
  async handleCallStatus(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { status: string; duration?: number }
  ) {
    const sessionId = client.data.sessionId;
    if (sessionId) {
      this.server.to(`session:${sessionId}`).emit('call_status', {
        device_id: client.data.deviceId,
        status: data.status,
        duration: data.duration,
        timestamp: new Date().toISOString()
      });
    }
    return { received: true };
  }

  @SubscribeMessage('goal:execute')
  async handleGoalExecute(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { execution_id: string; goal: string; inputs?: Record<string, unknown>; constraints?: Record<string, unknown> }
  ) {
    // Allow goal execution with or without active session
    const sessionId = client.data.sessionId;

    this.logger.log(`Goal execution request from ${client.data.deviceId}:`, data.goal);

    // Emit directly to the device (same client) for session-less execution
    if (client) {
      client.emit('goal_execute', {
        device_id: client.data.deviceId,
        execution_id: data.execution_id,
        goal: data.goal,
        inputs: data.inputs,
        constraints: data.constraints,
        timestamp: new Date().toISOString()
      });
    }

    if (sessionId) {
      this.server.to(`session:${sessionId}`).emit('goal_execute', {
        device_id: client.data.deviceId,
        execution_id: data.execution_id,
        goal: data.goal,
        inputs: data.inputs,
        constraints: data.constraints,
        timestamp: new Date().toISOString()
      });
    }

    return { received: true };
  }

  @SubscribeMessage('goal:result')
  async handleGoalResult(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { execution_id: string; status: string; goal_status: string; steps?: unknown[]; duration?: number; artifacts?: Record<string, unknown> }
  ) {
    const sessionId = client.data.sessionId;

    this.logger.log(`Goal result from ${client.data.deviceId}:`, data.goal_status);

    if (sessionId) {
      this.server.to(`session:${sessionId}`).emit('goal_result', {
        device_id: client.data.deviceId,
        ...data,
        timestamp: new Date().toISOString()
      });
    }

    return { received: true };
  }

  @SubscribeMessage('error')
  async handleError(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; message: string }
  ) {
    this.logger.error(`Device ${client.data.deviceId} error:`, data);
    
    const sessionId = client.data.sessionId;
    if (sessionId) {
      this.server.to(`session:${sessionId}`).emit('device_error', {
        device_id: client.data.deviceId,
        ...data,
        timestamp: new Date().toISOString()
      });
    }
    
    return { received: true };
  }

  @SubscribeMessage('escalation:trigger')
  async handleEscalationTrigger(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { trigger: string; transcript: string; timestamp: string }
  ) {
    this.logger.warn(`Escalation trigger from ${client.data.deviceId}:`, data.trigger);
    
    if (this.escalationService) {
      try {
        const escalation = await this.escalationService.create({
          sessionId: client.data.sessionId || null,
          deviceId: client.data.deviceId,
          trigger: data.trigger,
          triggerType: 'keyword',
          transcript: data.transcript,
          metadata: { timestamp: data.timestamp }
        });
        
        this.logger.log(`Escalation logged: ${escalation.id}`);
        
        // Emit to session room for real-time notification
        if (client.data.sessionId) {
          this.server.to(`session:${client.data.sessionId}`).emit('escalation_triggered', {
            escalation_id: escalation.id,
            trigger: data.trigger,
            timestamp: data.timestamp
          });
        }
        
        return { received: true, escalation_id: escalation.id };
      } catch (error) {
        this.logger.error(`Failed to log escalation:`, error);
      }
    }
    
    return { received: true };
  }

  @SubscribeMessage('escalation:abort')
  async handleEscalationAbort(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { reason: string; timestamp: string }
  ) {
    this.logger.warn(`Escalation abort from ${client.data.deviceId}:`, data.reason);
    
    if (this.escalationService) {
      try {
        // Find the active escalation for this session
        if (client.data.sessionId) {
          const escalations = await this.escalationService.getBySessionId(client.data.sessionId);
          const activeEscalation = escalations.find(e => e.status === 'triggered');
          
          if (activeEscalation) {
            await this.escalationService.abort(activeEscalation.id, data.reason);
            this.logger.log(`Escalation aborted: ${activeEscalation.id}`);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to abort escalation:`, error);
      }
    }
    
    return { received: true };
  }
}