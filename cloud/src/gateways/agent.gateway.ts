import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { SessionService } from '../services/session.service';
import { AgentEvent, CloudCommand } from '../contracts/events';
import { DecisionEngineService } from '../services/decision-engine.service';
import { TTSService } from '../services/tts.service';
import { UIAutomationService } from '../services/ui-automation.service';
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
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.CORS_ORIGINS?.split(',') || ['chrome-extension://*']
      : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true 
  },
  transports: ['websocket', 'polling'],
  namespace: '/agent'
})

export class AgentGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AgentGateway.name);
  private readonly connectedAgents = new Map<string, Socket>();

  constructor(
    @Inject(forwardRef(() => SessionService))
    private readonly sessionService: SessionService,
    @Inject(forwardRef(() => DecisionEngineService))
    private readonly decisionEngine: DecisionEngineService,
    private readonly ttsService: TTSService,
    private readonly uiAutomationService: UIAutomationService
  ) {
    // TTS event listeners for real-time updates
    if (this.ttsService) {
      this.ttsService.on('playback:started', () => {
        this.broadcastToSidePanel('tts_status', 'speaking');
      });
      
      this.ttsService.on('playback:completed', () => {
        this.broadcastToSidePanel('tts_status', 'ready');
      });
      
      this.ttsService.on('error', (error) => {
        this.broadcastToSidePanel('tts_status', 'error');
        console.error('TTS Error:', error);
      });
    }
  }

  afterInit(server: Server): void {
    this.logger.log('AgentGateway: WebSocket server initialized');
  }

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

  handleDisconnect(client: Socket): void {
    this.logger.log(`Agent disconnected: ${client.id}`);
    this.connectedAgents.delete(client.id);
    
    // Broadcast agent disconnection to dashboard if needed
    this.server.of('/dashboard').emit('agent:disconnected', {
      agent_id: client.id,
      timestamp: new Date().toISOString()
    });
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
      if (this.decisionEngine) {
        const decision = await this.decisionEngine.processTextInput(
          event.session_id,
          event.payload.text,
          event.payload.confidence || 0.8,
          event.payload.provider || 'deepgram',
          event.payload.metadata || {}
        );

        // Handle 'say' commands with TTS
        if (decision.command.type === 'say' && decision.command.say && this.ttsService) {
          await this.ttsService.speak(decision.command.say.text, {
            voice: decision.command.say.voice,
            interruptible: decision.command.say.interruptible,
            language: decision.command.say.language,
            speed: decision.command.say.speed,
            pitch: decision.command.say.pitch,
            volume: decision.command.say.volume
          });
          
          console.log(`[AgentGateway] TTS: "${decision.command.say.text}" (voice: ${decision.command.say.voice || 'default'})`);
        }

        // Handle UI steps
        if (decision.command.type === 'ui_steps' && this.uiAutomationService) {
          for (const step of decision.command.ui_steps || []) {
            try {
              await this.uiAutomationService.executeStep(event.session_id, step);
            } catch (stepError) {
              console.error(`[AgentGateway] UI step failed:`, stepError);
            }
          }
        }

        // Send command back to agent
        this.sendCommand(event.session_id, decision.command);
      }

      // Persist the original event (canon: all events must be persisted)
      const persistedEvent = await this.sessionService.persistEvent(event.session_id, event);
      
      console.log(`[AgentGateway] Event processed: ${persistedEvent.id}`);

    } catch (error) {
      console.error(`[AgentGateway] Error processing event:`, error);
      
      // Send error command (anti-demo rule: show failure)
      const errorCommand = {
        command_id: uuidv4(),
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

  @SubscribeMessage('session.create')
  async handleSessionCreate(client: Socket, data: {
    agent_id: string;
    tab_url?: string;
    tab_title?: string;
  }): Promise<void> {
    try {
      const session = await this.sessionService.create(data.agent_id, {
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

  // Method to send commands to agent (Cloud → Agent)
  sendCommand(sessionId: string, command: CloudCommand): void {
    this.server.emit(`command.${sessionId}`, command);
    if (command.say) {
      console.log(`[AgentGateway] Command sent to session ${sessionId}: ${command.say.text}`);
    }
  }

  // Send Cloud → Agent commands (per canonical contract)
  sendCommandToAgent(agentId: string, command: CommandSocketData): void {
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
    
    this.sendCommandToAgent(client.id, command);
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
    return uuidv4();
  }

  // Broadcast to sidepanel
  private broadcastToSidePanel(event: string, data: any): void {
    this.server.of('/sidepanel').emit(event, data);
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