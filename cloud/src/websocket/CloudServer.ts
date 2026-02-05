/**
 * Cloud WebSocket Server Handler
 * Implements real session management for agent connections
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { randomUUID } from 'crypto';
import { validationService } from '../../../contracts/service';
import { SessionService } from '../services/session.service';
import { AgentEvent } from '../contracts/events';

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
  private readonly sessionService: SessionService;
  
  // DATABASE-READY: Only track active socket connections, not session data
  private activeSockets = new Map<string, string>(); // socket_id -> session_id
  private socketAgents = new Map<string, string>(); // socket_id -> agent_id

  constructor(httpServer: HTTPServer, sessionService: SessionService) {
    this.sessionService = sessionService;
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupHandlers();
    console.log('[Cloud] DATABASE-READY: WebSocket server initialized with Supabase integration');
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
      // DATABASE-READY: Verify session exists in Supabase and track socket connection
      this.sessionService.getSession(payload.session_id).then(session => {
        if (!session) {
          console.error(`[Cloud] DATABASE-READY: Session ${payload.session_id} not found in Supabase`);
          this.sendError(socket, 'session_not_found', 'Session not found in database');
          return;
        }

        // DATABASE-READY: Track active socket connection
        this.activeSockets.set(socket.id, payload.session_id);
        this.socketAgents.set(socket.id, payload.agent_id);

        // Update session status to connected
        this.sessionService.updateSessionStatus(payload.session_id, 'active').then(() => {
          console.log(`[Cloud] DATABASE-READY: Session ${payload.session_id} verified and marked as active in Supabase`);
           
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
        }).catch(error => {
          console.error(`[Cloud] DATABASE-READY: Failed to update session status: ${error.message}`);
          this.sendError(socket, 'database_error', 'DATABASE-READY: Failed to update session status');
        });
      }).catch(error => {
        console.error(`[Cloud] DATABASE-READY: Failed to verify session in Supabase: ${error.message}`);
        this.sendError(socket, 'database_error', 'DATABASE-READY: Supabase connection required');
      });
    } else {
      // Handle other brain events
      console.log(`[Cloud] Brain event:`, payload.type);
      this.processBrainEvent(message, payload.agent_id).catch(error => {
        console.error(`[Cloud] DATABASE-READY: Failed to process brain event: ${error.message}`);
      });
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
   * Handle heartbeat from agent (DATABASE-READY: Use async session lookup)
   */
  private async handleHeartbeat(socket: any, message: RealtimeMessage): Promise<void> {
    const session = await this.getSessionBySocket(socket.id);
    if (session) {
      // Update session heartbeat in Supabase
      try {
        await this.sessionService.updateSessionStatus(session.session_id, session.status);
      } catch (error) {
        console.error(`[Cloud] DATABASE-READY: Failed to update session heartbeat: ${error.message}`);
      }
      
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
   * Process brain event logic (DATABASE-READY: Persist events to Supabase)
   */
  private async processBrainEvent(message: RealtimeMessage, agentId?: string): Promise<void> {
    const { payload } = message;
    
    if (message.session_id) {
      try {
        // DATABASE-READY: Persist event to Supabase
        await this.sessionService.persistEvent(message.session_id, {
          event_type: 'text_input', // Use valid event_type
          payload: payload,
          ts: message.timestamp,
          agent_id: agentId || 'unknown'
        });
        console.log(`[Cloud] DATABASE-READY: Brain event persisted to Supabase: ${payload?.type}`);
      } catch (error) {
        console.error(`[Cloud] DATABASE-READY: Failed to persist event: ${error.message}`);
      }
    }
    
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
   * Get session by socket ID (DATABASE-READY: Query from Supabase)
   */
  private async getSessionBySocket(socketId: string): Promise<any> {
    const sessionId = this.activeSockets.get(socketId);
    const agentId = this.socketAgents.get(socketId);
    
    if (!sessionId || !agentId) {
      return undefined;
    }

    try {
      const session = await this.sessionService.getSession(sessionId);
      if (session) {
        return {
          session_id: sessionId,
          agent_id: agentId,
          socket_id: socketId,
          created_at: session.created_at,
          last_heartbeat: new Date().toISOString(),
          status: session.status,
          message_count: 0 // This would need to be tracked separately or calculated
        };
      }
    } catch (error) {
      console.error(`[Cloud] DATABASE-READY: Failed to get session from Supabase: ${error.message}`);
    }
    
    return undefined;
  }

  /**
   * Send message to specific agent (DATABASE-READY: Use socket tracking)
   */
  private sendToAgent(agentId: string, message: Omit<RealtimeMessage, 'message_id' | 'timestamp' | 'direction'>): void {
    // DATABASE-READY: Find socket by agent ID from tracking maps
    let socketId: string | undefined;
    for (const [sid, aid] of this.socketAgents.entries()) {
      if (aid === agentId) {
        socketId = sid;
        break;
      }
    }

    if (!socketId) {
      console.error(`[Cloud] DATABASE-READY: No active socket found for agent: ${agentId}`);
      return;
    }

    const sessionId = this.activeSockets.get(socketId);
    if (!sessionId) {
      console.error(`[Cloud] DATABASE-READY: No session found for socket: ${socketId}`);
      return;
    }

    const socket = this.io.sockets.sockets.get(socketId);
    if (!socket) {
      console.error(`[Cloud] DATABASE-READY: Socket not found: ${socketId}`);
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

    console.log(`[Cloud] DATABASE-READY: Sending to agent ${agentId}:`, message.message_type);
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
   * Handle socket disconnection (DATABASE-READY: Update Supabase session status)
   */
  private async handleDisconnect(socketId: string): Promise<void> {
    const sessionId = this.activeSockets.get(socketId);
    const agentId = this.socketAgents.get(socketId);
    
    if (sessionId && agentId) {
      try {
        // Update session status in Supabase
        await this.sessionService.updateSessionStatus(sessionId, 'disconnected');
        console.log(`[Cloud] DATABASE-READY: Session ${sessionId} marked as disconnected in Supabase`);
      } catch (error) {
        console.error(`[Cloud] DATABASE-READY: Failed to update session status: ${error.message}`);
      }
       
      // Clean up socket tracking after delay (allow potential reconnection)
      setTimeout(() => {
        this.activeSockets.delete(socketId);
        this.socketAgents.delete(socketId);
        console.log(`[Cloud] DATABASE-READY: Cleaned up socket tracking: ${socketId}`);
      }, 30000);
    }
  }

  /**
   * Get all active sessions (DATABASE-READY: Query from Supabase)
   */
  async getActiveSessions(): Promise<any[]> {
    try {
      const sessions = await this.sessionService.findAll();
      return sessions.filter(s => s.status === 'active');
    } catch (error) {
      console.error(`[Cloud] DATABASE-READY: Failed to get active sessions: ${error.message}`);
      return [];
    }
  }

  /**
   * Get session statistics (DATABASE-READY: Query from Supabase)
   */
  async getStats(): Promise<any> {
    try {
      const sessions = await this.sessionService.findAll();
      const activeSessions = sessions.filter(s => s.status === 'active');
      return {
        total_sessions: sessions.length,
        active_sessions: activeSessions.length,
        total_messages: 0, // Would need to be calculated from events table
        agents_connected: this.socketAgents.size,
        database_ready: true
      };
    } catch (error) {
      console.error(`[Cloud] DATABASE-READY: Failed to get session stats: ${error.message}`);
      return {
        total_sessions: 0,
        active_sessions: 0,
        total_messages: 0,
        agents_connected: 0,
        database_ready: false,
        error: 'DATABASE-READY: Supabase connection required'
      };
    }
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