import { WebSocketGateway, SubscribeMessage, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

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

  constructor() {
    this.logger.log('AgentGateway: Initialized for real agent connections');
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
  private handleTextInput(client: Socket, event: AgentSocketData): void {
    this.logger.log(`Processing text input: ${event.payload.text}`);
    
    // TODO: Integrate with AI decision engine
    // For now, send back a simple acknowledgment command
    const command: CommandSocketData = {
      command_id: this.generateUUID(),
      session_id: event.session_id,
      timestamp: new Date().toISOString(),
      type: 'say',
      payload: {
        text: `Received: ${event.payload.text}`,
        interruptible: true
      }
    };
    
    this.sendCommand(client.id, command);
  }

  // Handle UI result events (RPA execution results)
  private handleUIResult(client: Socket, event: AgentSocketData): void {
    this.logger.log(`Processing UI result: ${event.payload.status}`);
    
    // TODO: Store result, continue flow execution
  }

  // Handle system events (lifecycle, errors)
  private handleSystemEvent(client: Socket, event: AgentSocketData): void {
    this.logger.log(`Processing system event: ${event.payload.event}`);
    
    // TODO: Handle system events like call_started, call_ended
    switch (event.payload.event) {
      case 'call_started':
        this.logger.log(`Call started for agent ${client.id}`);
        break;
      case 'call_ended':
        this.logger.log(`Call ended for agent ${client.id}`);
        break;
      case 'error':
        this.logger.error(`Agent error: ${event.payload.data}`);
        break;
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

  // Generate UUID for events/commands
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Get connected agents count
  getConnectedAgentsCount(): number {
    return this.connectedAgents.size;
  }

  // Get list of connected agent IDs
  getConnectedAgentIds(): string[] {
    return Array.from(this.connectedAgents.keys());
  }
}