/**
 * Cloud WebSocket Server Handler
 * Implements real session management for agent connections
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { randomUUID } from 'crypto';
import { validationService } from '../../../contracts/service';

interface RealtimeMessage {
  message_id: string;
  timestamp: string;
  direction: 'agent_to_cloud' | 'cloud_to_agent';
  message_type: 'brain_event' | 'brain_command' | 'heartbeat' | 'error' | 'ack';
  session_id?: string;
  payload: any;
  metadata?: any;
}

interface AgentSession {
  session_id: string;
  agent_id: string;
  socket_id: string;
  created_at: string;
  last_heartbeat: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  message_count: number;
}

export class CloudServer {
  private io: SocketIOServer;
  private sessions = new Map<string, AgentSession>();
  private agentSockets = new Map<string, string>(); // agent_id -> session_id

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupHandlers();
    console.log('[Cloud] WebSocket server initialized');
  }

  /**
   * Setup socket event handlers
   */
  private setupHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`[Cloud] New socket connection: ${socket.id}`);

      // Handle incoming messages from agents
      socket.on('message', (data: unknown) => {
        this.handleMessage(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`[Cloud] Socket disconnected: ${socket.id}, reason: ${reason}`);
        this.handleDisconnect(socket.id);
      });

      // Handle connection errors
      socket.on('error', (error) => {
        console.error(`[Cloud] Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Handle incoming message from agent
   */
  private handleMessage(socket: any, data: unknown): void {
    // Validate message
    const validation = validationService.validateRealtimeMessage(data);
    if (!validation.valid) {
      console.error(`[Cloud] Invalid message received:`, validation.errors);
      this.sendError(socket, 'validation_failed', 'Invalid message format');
      return;
    }

    const message = validation.data as RealtimeMessage;
    console.log(`[Cloud] Received message: ${message.message_type} from ${message.session_id || 'unknown'}`);

    // Process based on message type
    switch (message.message_type) {
      case 'brain_event':
        this.handleBrainEvent(socket, message);
        break;
      
      case 'brain_command':
        this.handleBrainCommand(socket, message);
        break;
      
      case 'heartbeat':
        this.handleHeartbeat(socket, message);
        break;
      
      default:
        console.log(`[Cloud] Unhandled message type: ${message.message_type}`);
    }

    // Send acknowledgment
    this.sendAcknowledgment(socket, message.message_id, 'received');
  }

  /**
   * Handle brain event (session creation, user input, etc.)
   */
  private handleBrainEvent(socket: any, message: RealtimeMessage): void {
    const { payload } = message;

    // Handle session creation
    if (payload?.type === 'session_created' && payload?.session_id && payload?.agent_id) {
      const session: AgentSession = {
        session_id: payload.session_id,
        agent_id: payload.agent_id,
        socket_id: socket.id,
        created_at: payload.timestamp,
        last_heartbeat: new Date().toISOString(),
        status: 'connected',
        message_count: 1
      };

      this.sessions.set(payload.session_id, session);
      this.agentSockets.set(payload.agent_id, payload.session_id);

      console.log(`[Cloud] Session created: ${payload.session_id} for agent: ${payload.agent_id}`);
      
      // Send session confirmation
      this.sendToAgent(payload.agent_id, {
        message_type: 'brain_event',
        payload: {
          type: 'session_confirmed',
          session_id: payload.session_id,
          agent_id: payload.agent_id,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      // Handle other brain events
      console.log(`[Cloud] Brain event:`, payload.type);
      this.processBrainEvent(message);
    }
  }

  /**
   * Handle brain command from agent
   */
  private handleBrainCommand(socket: any, message: RealtimeMessage): void {
    const { payload } = message;
    
    console.log(`[Cloud] Brain command received:`, payload.command);
    
    // Process command and send response
    const response = {
      command: payload.command,
      result: 'processed',
      timestamp: new Date().toISOString()
    };

    const session = this.getSessionBySocket(socket.id);
    if (session) {
      this.sendToAgent(session.agent_id, {
        message_type: 'brain_event',
        payload: {
          type: 'command_response',
          ...response
        }
      });
    }
  }

  /**
   * Handle heartbeat from agent
   */
  private handleHeartbeat(socket: any, message: RealtimeMessage): void {
    const session = this.getSessionBySocket(socket.id);
    if (session) {
      session.last_heartbeat = new Date().toISOString();
      session.message_count++;
      
      // Echo heartbeat back
      this.sendToAgent(session.agent_id, {
        message_type: 'heartbeat',
        payload: {
          status: 'alive',
          uptime_ms: Date.now() - new Date(session.created_at).getTime(),
          session_message_count: session.message_count
        }
      });
    }
  }

  /**
   * Process brain event logic
   */
  private processBrainEvent(message: RealtimeMessage): void {
    const { payload } = message;
    
    // Example processing logic
    switch (payload?.type) {
      case 'user_input':
        console.log(`[Cloud] Processing user input:`, payload.data);
        break;
      
      case 'system_status':
        console.log(`[Cloud] System status update:`, payload.data);
        break;
      
      default:
        console.log(`[Cloud] Unknown brain event type:`, payload?.type);
    }
  }

  /**
   * Get session by socket ID
   */
  private getSessionBySocket(socketId: string): AgentSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.socket_id === socketId) {
        return session;
      }
    }
    return undefined;
  }

  /**
   * Send message to specific agent
   */
  private sendToAgent(agentId: string, message: Omit<RealtimeMessage, 'message_id' | 'timestamp' | 'direction'>): void {
    const sessionId = this.agentSockets.get(agentId);
    if (!sessionId) {
      console.error(`[Cloud] No session found for agent: ${agentId}`);
      return;
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      console.error(`[Cloud] Session not found: ${sessionId}`);
      return;
    }

    const socket = this.io.sockets.sockets.get(session.socket_id);
    if (!socket) {
      console.error(`[Cloud] Socket not found for session: ${sessionId}`);
      return;
    }

    const realtimeMessage: RealtimeMessage = {
      message_id: randomUUID(),
      timestamp: new Date().toISOString(),
      direction: 'cloud_to_agent',
      session_id: sessionId,
      metadata: {
        retry_count: 0,
        priority: 'normal'
      },
      ...message
    };

    console.log(`[Cloud] Sending to agent ${agentId}:`, message.message_type);
    socket.emit('message', realtimeMessage);
  }

  /**
   * Send error to agent
   */
  private sendError(socket: any, code: string, message: string): void {
    const errorMessage: RealtimeMessage = {
      message_id: randomUUID(),
      timestamp: new Date().toISOString(),
      direction: 'cloud_to_agent',
      message_type: 'error',
      payload: {
        code,
        message,
        timestamp: new Date().toISOString()
      }
    };

    socket.emit('message', errorMessage);
  }

  /**
   * Send acknowledgment to agent
   */
  private sendAcknowledgment(socket: any, messageId: string, status: 'received' | 'processed' | 'failed'): void {
    const ackMessage: RealtimeMessage = {
      message_id: randomUUID(),
      timestamp: new Date().toISOString(),
      direction: 'cloud_to_agent',
      message_type: 'ack',
      payload: {
        ack_message_id: messageId,
        status,
        timestamp: new Date().toISOString()
      }
    };

    socket.emit('message', ackMessage);
  }

  /**
   * Handle socket disconnection
   */
  private handleDisconnect(socketId: string): void {
    const session = this.getSessionBySocket(socketId);
    if (session) {
      session.status = 'disconnected';
      console.log(`[Cloud] Session ${session.session_id} disconnected`);
      
      // Clean up after delay (allow potential reconnection)
      setTimeout(() => {
        if (session.status === 'disconnected') {
          this.sessions.delete(session.session_id);
          this.agentSockets.delete(session.agent_id);
          console.log(`[Cloud] Cleaned up session: ${session.session_id}`);
        }
      }, 30000);
    }
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): AgentSession[] {
    return Array.from(this.sessions.values()).filter(s => s.status === 'connected');
  }

  /**
   * Get session statistics
   */
  getStats(): any {
    const sessions = Array.from(this.sessions.values());
    return {
      total_sessions: sessions.length,
      active_sessions: sessions.filter(s => s.status === 'connected').length,
      total_messages: sessions.reduce((sum, s) => sum + s.message_count, 0),
      agents_connected: this.agentSockets.size
    };
  }

  /**
   * Shutdown server
   */
  shutdown(): void {
    console.log('[Cloud] Shutting down WebSocket server...');
    this.io.close();
  }
}

export default CloudServer;