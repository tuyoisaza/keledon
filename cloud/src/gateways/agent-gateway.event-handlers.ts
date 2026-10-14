import type { Logger } from '@nestjs/common';
import type { SessionService } from '../services/session.service';
import type {
  AgentSocket,
  AgentSocketData,
  CommandSocketData,
} from './agent-gateway.types';
import { generateAgentUUID } from './agent-gateway.utils';

export class AgentGatewayEventHandlers {
  constructor(
    private readonly sessions: SessionService,
    private readonly logger: Logger,
    private readonly sendCommand: (
      agentId: string,
      command: CommandSocketData,
    ) => void,
  ) {}

  handle(client: AgentSocket, event: AgentSocketData): void {
    switch (event.type) {
      case 'text_input':
        this.handleTextInput(client, event);
        break;
      case 'ui_result':
        this.handleUIResult(client, event);
        break;
      case 'system':
        this.handleSystemEvent(client, event);
        break;
    }
  }

  private handleTextInput(
    client: AgentSocket,
    event: Extract<AgentSocketData, { type: 'text_input' }>,
  ): void {
    this.logger.log(
      `Processing text input (${event.payload.text.length} characters)`,
    );
    const command: CommandSocketData = {
      command_id: generateAgentUUID(),
      session_id: event.session_id,
      timestamp: new Date().toISOString(),
      type: 'say',
      payload: {
        text: `Received: ${event.payload.text}`,
        interruptible: true,
      },
    };
    this.sendCommand(client.id, command);
  }

  private handleUIResult(
    client: AgentSocket,
    event: Extract<AgentSocketData, { type: 'ui_result' }>,
  ): void {
    this.logger.log(`Processing UI result for session ${event.session_id}`);
    void this.storeUIResult(event).catch(() => {
      this.logger.error('Failed to store UI result');
    });
    client.emit('ui_result_stored', {
      session_id: event.session_id,
      command_id: event.command_id,
      status: 'stored',
    });
  }

  private async storeUIResult(
    event: Extract<AgentSocketData, { type: 'ui_result' }>,
  ): Promise<void> {
    await this.sessions.persistEvent(event.session_id, {
      session_id: event.session_id,
      event_type: 'ui_result',
      payload: {
        command_id: event.command_id,
        results: event.payload.results || [],
        error: event.payload.error,
      },
      ts: event.timestamp || new Date().toISOString(),
      agent_id: event.agent_id || 'unknown',
    });
    this.logger.log(`UI result stored for session ${event.session_id}`);
  }

  private handleSystemEvent(
    client: AgentSocket,
    event: Extract<AgentSocketData, { type: 'system' }>,
  ): void {
    this.logger.log(`Processing system event: ${event.payload.event}`);
    switch (event.payload.event) {
      case 'call_started':
        this.logger.log(`Call started for agent ${client.id}`);
        break;
      case 'call_ended':
        this.logger.log(`Call ended for agent ${client.id}`);
        break;
      case 'error':
        this.logger.error('Agent reported a system error');
        break;
    }
  }
}
