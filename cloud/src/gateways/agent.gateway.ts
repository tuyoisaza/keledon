import { WebSocketGateway, SubscribeMessage, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { SessionService } from '../services/session.service';
import { v4 as uuidv4 } from 'uuid';

// Import from canonical contracts
import { BrainEvent } from '../../../contracts/v1/brain/event.schema.json';
import { BrainCommand } from '../../../contracts/v1/brain/command.schema.json';

export interface AgentSocketData {
  event_id: string;
  session_id: string;
  timestamp: string;
  type: 'text_input' | 'ui_result' | 'system';
  payload: any;
}

export interface CommandSocketData {
  command_id: string;
  session_id: string;
  timestamp: string;
  type: 'say' | 'ui_steps' | 'mode' | 'stop';
  payload: any;
}

@WebSocketGateway({
  cors: {
    origin: ['chrome-extension://*', 'moz-extension://*'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  namespace: '/agent'
})
export class AgentGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() 
  server: Server;

  private readonly logger = new Logger(AgentGateway.name);
  private readonly connectedAgents = new Map<string, Socket>();
  private readonly agentSessions = new Map<string, string>(); // agent_id -> session_id

  constructor(private readonly sessionService: SessionService) {
    this.logger.log('AgentGateway: Initialized with SessionService for real session management');
  }

  afterInit(server: Server): void {
    this.logger.log('AgentGateway: WebSocket server initialized');
  }

  @OnGatewayConnection()
  handleConnection(client: Socket): void {
    this.logger.log(`Agent connected: ${client.id}`);
    this.connectedAgents.set(client.id, client);
    
    // Send initial connection acknowledgment
    client.emit('connected', {
      agent_id: client.id,
      timestamp: new Date().toISOString(),
      status: 'connected'
    });
  }

  @OnGatewayDisconnect()
  handleDisconnect(client: Socket): void {
    this.logger.log(`Agent disconnected: ${client.id}`);
    this.connectedAgents.delete(client.id);
    
    // Clean up session mapping
    this.agentSessions.delete(client.id);
    
    // Broadcast agent disconnection to dashboard if needed
    this.server.of('/dashboard').emit('agent:disconnected', {
      agent_id: client.id,
      timestamp: new Date().toISOString()
    });
  }

  // Handle Agent → Cloud events (per canonical contract)
  @SubscribeMessage('event')
  handleEvent(client: Socket, data: AgentSocketData): void {
    try {
      this.logger.log(`Received event from agent ${client.id}: ${data.type}`);
      
      // Validate event structure against canonical contract
      if (!this.validateEvent(data)) {
        this.logger.error(`Invalid event structure from agent ${client.id}`, data);
        client.emit('error', { message: 'Invalid event structure' });
        return;
      }

      // Process event based on type
      switch (data.type) {
        case 'text_input':
          this.handleTextInput(client, data);
          break;
        case 'ui_result':
          this.handleUIResult(client, data);
          break;
        case 'system':
          this.handleSystemEvent(client, data);
          break;
        default:
          this.logger.warn(`Unknown event type: ${data.type}`);
      }
      
    } catch (error) {
      this.logger.error(`Error processing event from agent ${client.id}`, error);
      client.emit('error', { message: 'Failed to process event' });
    }
  }

  // Handle session creation requests
  @SubscribeMessage('create_session')
  async handleCreateSession(client: Socket, data: { name?: string; user_id?: string }): Promise<void> {
    try {
      this.logger.log(`Creating session for agent ${client.id}`);
      
      // Create real session with UUID
      const session = await this.sessionService.create({
        name: data.name || `Session ${Date.now()}`,
        agent_id: client.id,
        user_id: data.user_id,
        metadata: {
          connection_info: {
            connected_at: new Date().toISOString(),
            client_id: client.id,
          }
        }
      });

      // Store session mapping for this agent
      this.agentSessions.set(client.id, session.id);

      // Send session info back to agent
      client.emit('session_created', {
        session_id: session.id,
        status: session.status,
        timestamp: session.created_at
      });

      this.logger.log(`Created session ${session.id} for agent ${client.id}`);
      
    } catch (error) {
      this.logger.error(`Failed to create session for agent ${client.id}`, error);
      client.emit('error', { message: 'Failed to create session' });
    }
  }

  // Send Cloud → Agent commands (per canonical contract)
  sendCommand(agentId: string, command: CommandSocketData): void {
    try {
      const agent = this.connectedAgents.get(agentId);
      if (!agent) {
        this.logger.warn(`Agent ${agentId} not connected`);
        return;
      }

      // Validate command structure against canonical contract
      if (!this.validateCommand(command)) {
        this.logger.error(`Invalid command structure for agent ${agentId}`, command);
        return;
      }

      agent.emit('command', command);
      this.logger.log(`Sent command to agent ${agentId}: ${command.type}`);
      
    } catch (error) {
      this.logger.error(`Error sending command to agent ${agentId}`, error);
    }
  }

  // Handle text input events (STT output)
  private async handleTextInput(client: Socket, event: AgentSocketData): Promise<void> {
    this.logger.log(`Processing text input: ${event.payload.text}`);
    
    try {
      // Store event in database
      await this.sessionService.addEvent(event.session_id, {
        type: event.type,
        payload: event.payload,
        agent_id: client.id,
        timestamp: new Date(event.timestamp)
      });

      // TODO: Integrate with AI decision engine
      // For now, send back a simple acknowledgment command
      const command: CommandSocketData = {
        command_id: uuidv4(),
        session_id: event.session_id,
        timestamp: new Date().toISOString(),
        type: 'say',
        payload: {
          text: `Received: ${event.payload.text}`,
          interruptible: true
        }
      };
      
      this.sendCommand(client.id, command);
      
    } catch (error) {
      this.logger.error('Failed to handle text input', error);
      client.emit('error', { message: 'Failed to process text input' });
    }
  }

  // Handle UI result events (RPA execution results)
  private async handleUIResult(client: Socket, event: AgentSocketData): Promise<void> {
    this.logger.log(`Processing UI result: ${event.payload.status}`);
    
    try {
      // Store event in database
      await this.sessionService.addEvent(event.session_id, {
        type: event.type,
        payload: event.payload,
        agent_id: client.id,
        timestamp: new Date(event.timestamp)
      });
      
      // TODO: Store result, continue flow execution
      
    } catch (error) {
      this.logger.error('Failed to handle UI result', error);
      client.emit('error', { message: 'Failed to process UI result' });
    }
  }

  // Handle system events (lifecycle, errors)
  private async handleSystemEvent(client: Socket, event: AgentSocketData): Promise<void> {
    this.logger.log(`Processing system event: ${event.payload.event}`);
    
    try {
      // Store event in database
      await this.sessionService.addEvent(event.session_id, {
        type: event.type,
        payload: event.payload,
        agent_id: client.id,
        timestamp: new Date(event.timestamp)
      });
      
      // Handle system events like call_started, call_ended
      switch (event.payload.event) {
        case 'call_started':
          this.logger.log(`Call started for agent ${client.id}`);
          break;
        case 'call_ended':
          this.logger.log(`Call ended for agent ${client.id}`);
          // End the session
          await this.sessionService.endSession(event.session_id, 'call_ended');
          break;
        case 'error':
          this.logger.error(`Agent error: ${event.payload.data}`);
          break;
      }
      
    } catch (error) {
      this.logger.error('Failed to handle system event', error);
      client.emit('error', { message: 'Failed to process system event' });
    }
  }

  // Validate event against canonical contract
  private validateEvent(event: AgentSocketData): boolean {
    return !!(
      event.event_id &&
      event.session_id &&
      event.timestamp &&
      ['text_input', 'ui_result', 'system'].includes(event.type) &&
      event.payload
    );
  }

  // Validate command against canonical contract
  private validateCommand(command: CommandSocketData): boolean {
    return !!(
      command.command_id &&
      command.session_id &&
      command.timestamp &&
      ['say', 'ui_steps', 'mode', 'stop'].includes(command.type) &&
      command.payload
    );
  }

  // Get connected agents count
  getConnectedAgentsCount(): number {
    return this.connectedAgents.size;
  }

  // Get list of connected agent IDs
  getConnectedAgentIds(): string[] {
    return Array.from(this.connectedAgents.keys());
  }

  // Get session for agent
  getAgentSession(agentId: string): string | undefined {
    return this.agentSessions.get(agentId);
  }
}