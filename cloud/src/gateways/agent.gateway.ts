import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SessionService } from '../services/session.service';
import { AgentEvent, CloudCommand } from '../contracts/events';
import { DecisionEngineService } from '../services/decision-engine.service';
import { TTSService } from '../services/tts.service';
import { UIAutomationService } from '../services/ui-automation.service';

@WebSocketGateway({
  cors: { 
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.CORS_ORIGINS?.split(',') || ['chrome-extension://*']
      : ['http://localhost:5173', 'http://localhost:3000'], // Development origins
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
    private readonly sessionService: SessionService,
    private readonly decisionEngine: DecisionEngineService,
    private readonly ttsService: TTSService,
    private readonly uiAutomationService: UIAutomationService
  ) {
    // TTS event listeners for real-time updates
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

  afterInit(server: Server): void {
    this.logger.log('AgentGateway: WebSocket server initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`[AgentGateway] Agent connected: ${client.id}`);
    this.connectedAgents.set(client.id, client);
    
    // Send initial connection acknowledgment
    client.emit('connected', {
      agent_id: client.id,
      timestamp: new Date().toISOString(),
      status: 'connected'
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[AgentGateway] Agent disconnected: ${client.id}`);
    this.connectedAgents.delete(client.id);
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

      // Handle 'say' commands with TTS
      if (decision.type === 'say' && decision.say) {
        await this.ttsService.speak(decision.say.text, {
          voice: decision.say.voice,
          interruptible: decision.say.interruptible,
          language: decision.say.language,
          speed: decision.say.speed,
          pitch: decision.say.pitch,
          volume: decision.say.volume
        });
        
        console.log(`[AgentGateway] TTS: "${decision.say.text}" (voice: ${decision.say.voice || 'default'})`);
      } else {
        console.log(`[AgentGateway] Unsupported command type: ${decision.type}`);
      }

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

  // Send Cloud → Agent commands (per canonical contract)
  sendCommandToAgent(agentId: string, command: any): void {
    try {
      const agent = this.connectedAgents.get(agentId);
      if (!agent) {
        this.logger.warn(`Agent ${agentId} not connected`);
        return;
      }

      agent.emit('command', command);
      this.logger.log(`Sent command to agent ${agentId}: ${command.type}`);
      
    } catch (error) {
      this.logger.error(`Error sending command to agent ${agentId}`, error);
    }
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