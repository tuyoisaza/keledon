import type { Server, Socket } from 'socket.io';
import type { Logger } from '@nestjs/common';
import type { EscalationService } from '../services/escalation.service';

export class DeviceEscalationHandlers {
  constructor(
    private readonly service: EscalationService | undefined,
    private readonly logger: Logger,
  ) {}

  async trigger(
    client: Socket,
    data: { trigger: string; transcript: string; timestamp: string },
    server: Server,
  ) {
    this.logger.warn(
      `Escalation trigger from ${client.data.deviceId}:`,
      data.trigger,
    );
    if (!this.service) return { received: true };
    try {
      const escalation = await this.service.create({
        sessionId: client.data.sessionId || null,
        deviceId: client.data.deviceId,
        trigger: data.trigger,
        triggerType: 'keyword',
        transcript: data.transcript,
        metadata: { timestamp: data.timestamp },
      });
      this.logger.log(`Escalation logged: ${escalation.id}`);
      if (client.data.sessionId) {
        server
          .to(`session:${client.data.sessionId}`)
          .emit('escalation_triggered', {
            escalation_id: escalation.id,
            trigger: data.trigger,
            timestamp: data.timestamp,
          });
      }
      return { received: true, escalation_id: escalation.id };
    } catch (error) {
      this.logger.error('Failed to log escalation:', error);
      return { received: true };
    }
  }

  async abort(client: Socket, data: { reason: string; timestamp: string }) {
    this.logger.warn(
      `Escalation abort from ${client.data.deviceId}:`,
      data.reason,
    );
    if (!this.service || !client.data.sessionId) return { received: true };
    try {
      const escalations = await this.service.getBySessionId(
        client.data.sessionId,
      );
      const activeEscalation = escalations.find(
        (escalation) => escalation.status === 'triggered',
      );
      if (activeEscalation) {
        await this.service.abort(activeEscalation.id, data.reason);
        this.logger.log(`Escalation aborted: ${activeEscalation.id}`);
      }
    } catch (error) {
      this.logger.error('Failed to abort escalation:', error);
    }
    return { received: true };
  }
}
