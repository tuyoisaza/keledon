import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SessionService } from '../services/session.service';
import { AgentEvent, CloudCommand } from '../contracts/events';
import { DecisionEngineService } from '../services/decision-engine.service';

@WebSocketGateway({
  cors: { 
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.CORS_ORIGINS?.split(',') || ['chrome-extension://*']
      : ['http://localhost:5173', 'http://localhost:3000'], // Development origins
    credentials: true 
  },
  transports: ['websocket', 'polling'],
})
export class AgentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly sessionService: SessionService,
    private readonly decisionEngine: DecisionEngineService
  ) {}

  handleConnection(client: Socket) {
    console.log(`[AgentGateway] Agent connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[AgentGateway] Agent disconnected: ${client.id}`);
  }

  @SubscribeMessage('brain_event')
  async handleBrainEvent(client: Socket, event: AgentEvent): Promise<void> {
    try {
      // Validate session exists (canon rule: if no session_id, it does not exist)
      const session = await this.sessionService.getSession(event.session_id);
      if (!session) {
        console.error(`[AgentGateway] Invalid session ${event.session_id} from agent ${client.id}`);
        client.emit('error', { message: 'Invalid session_id' });
        return;
      }

      // Process event with decision engine (Cloud decides)
      const decision = await this.decisionEngine.processTextInput(
        event.session_id,
        event.payload.text,
        event.payload.confidence || 0.8,
        event.payload.provider || 'deepgram',
        event.payload.metadata || {}
      );

      // Generate canonical brain command from decision
      const command = await this.decisionEngine.generateCommand(decision, event.session_id);

      // Send command back to agent
      this.sendCommand(event.session_id, command);

      // Persist the original event (canon: all events must be persisted)
      const persistedEvent = await this.sessionService.persistEvent(event.session_id, event);
      
      console.log(`[AgentGateway] Event processed: ${persistedEvent.id} -> Command: ${command.type}`);

    } catch (error) {
      console.error(`[AgentGateway] Error processing event:`, error);
      
      // Send error command (anti-demo rule: show failure)
      const errorCommand = {
        command_id: crypto.randomUUID(),
        session_id: event.session_id,
        timestamp: new Date().toISOString(),
        type: 'error',
        confidence: 0,
        mode: 'error',
        flow_id: null,
        flow_run_id: null,
        say: {
          text: `Decision processing failed: ${error.message}`,
          interruptible: true
        }
      };

      this.sendCommand(event.session_id, errorCommand);
    }
  }

      // Persist event (canon: all events must be persisted)
      const persistedEvent = await this.sessionService.persistEvent(event.session_id, event);
      
      console.log(`[AgentGateway] Event persisted: ${persistedEvent.id} (${event.event_type})`);

      // TODO: Process event and return command to agent
      // This will be implemented in next phase per execution order

      // For now, acknowledge receipt
      client.emit('event.acknowledged', { 
        event_id: persistedEvent.id,
        session_id: event.session_id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`[AgentGateway] Error processing event:`, error);
      client.emit('error', { message: 'Failed to process event' });
    }
  }

  @SubscribeMessage('session.create')
  async handleSessionCreate(client: Socket, data: {
    agent_id: string;
    tab_url?: string;
    tab_title?: string;
  }): Promise<void> {
    try {
      const session = await this.sessionService.createSession(data.agent_id, {
        tab_url: data.tab_url,
        tab_title: data.tab_title
      });

      console.log(`[AgentGateway] Session created: ${session.id} for agent ${data.agent_id}`);

      client.emit('session.created', {
        session_id: session.id,
        agent_id: session.agent_id,
        status: session.status,
        created_at: session.created_at
      });

    } catch (error) {
      console.error(`[AgentGateway] Error creating session:`, error);
      client.emit('error', { message: 'Failed to create session' });
    }
  }

  // Method to send commands to agent (Cloud → Agent)
  sendCommand(sessionId: string, command: CloudCommand): void {
    this.server.emit(`command.${sessionId}`, command);
    console.log(`[AgentGateway] Command sent to session ${sessionId}: ${command.say.text}`);
  }
}