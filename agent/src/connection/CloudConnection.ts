/**
 * Core Agent-Cloud WebSocket Connection
 * Implements real session management using KELEDON contracts
 */

import { io, Socket } from 'socket.io-client';
import { randomUUID } from 'crypto';
import { validationService } from '../../contracts/service';

interface RealtimeMessage {
  message_id: string;
  timestamp: string;
  direction: 'agent_to_cloud' | 'cloud_to_agent';
  message_type: 'brain_event' | 'brain_command' | 'heartbeat' | 'error' | 'ack';
  session_id?: string;
  payload: any;
  metadata?: {
    correlation_id?: string;
    retry_count?: number;
    priority?: 'low' | 'normal' | 'high' | 'critical';
  };
}

interface SessionInfo {
  session_id: string;
  agent_id: string;
  created_at: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  last_heartbeat: string;
}

export class CloudConnection {
  private socket: Socket | null = null;
  private session: SessionInfo | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(
    private cloudUrl: string,
    private agentId: string,
    private onMessage?: (message: RealtimeMessage) => void
  ) {}

  /**
   * Connect to cloud and create real session
   */
  async connect(): Promise<void> {
    console.log(`[Agent:${this.agentId}] Connecting to cloud at ${this.cloudUrl}`);
    
    return new Promise((resolve, reject) => {
      this.socket = io(this.cloudUrl, {
        transports: ['websocket'],
        timeout: 10000,
      });

      // Create session immediately on connection
      this.socket.on('connect', () => {
        console.log(`[Agent:${this.agentId}] Socket connected, creating session...`);
        this.createSession();
        resolve();
      });

      this.socket.on('disconnect', () => {
        console.log(`[Agent:${this.agentId}] Socket disconnected`);
        this.updateSessionStatus('disconnected');
        this.stopHeartbeat();
      });

      this.socket.on('message', (data: unknown) => {
        this.handleMessage(data);
      });

      this.socket.on('connect_error', (error) => {
        console.error(`[Agent:${this.agentId}] Connection error:`, error);
        this.updateSessionStatus('error');
        reject(error);
      });

      // Start connection timeout
      setTimeout(() => {
        if (!this.socket?.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Create and initialize session
   */
  private createSession(): void {
    const sessionId = randomUUID();
    
    this.session = {
      session_id: sessionId,
      agent_id: this.agentId,
      created_at: new Date().toISOString(),
      status: 'connected',
      last_heartbeat: new Date().toISOString()
    };

    console.log(`[Agent:${this.agentId}] Session created: ${sessionId}`);
    
    // Send session creation event
    this.sendMessage({
      message_type: 'brain_event',
      payload: {
        type: 'session_created',
        session_id: sessionId,
        agent_id: this.agentId,
        timestamp: new Date().toISOString()
      }
    });

    // Start heartbeat
    this.startHeartbeat();
  }

  /**
   * Send message to cloud
   */
  sendMessage(message: Omit<RealtimeMessage, 'message_id' | 'timestamp' | 'direction'>): void {
    if (!this.socket?.connected) {
      console.error(`[Agent:${this.agentId}] Cannot send message - not connected`);
      return;
    }

    const realtimeMessage: RealtimeMessage = {
      message_id: randomUUID(),
      timestamp: new Date().toISOString(),
      direction: 'agent_to_cloud',
      session_id: this.session?.session_id,
      metadata: {
        retry_count: 0,
        priority: 'normal'
      },
      ...message
    };

    // Validate message
    const validation = validationService.validateRealtimeMessage(realtimeMessage);
    if (!validation.valid) {
      console.error(`[Agent:${this.agentId}] Invalid message:`, validation.errors);
      return;
    }

    console.log(`[Agent:${this.agentId}] Sending message:`, realtimeMessage.message_type);
    this.socket.emit('message', realtimeMessage);
  }

  /**
   * Handle incoming message from cloud
   */
  private handleMessage(data: unknown): void {
    const validation = validationService.validateRealtimeMessage(data);
    if (!validation.valid) {
      console.error(`[Agent:${this.agentId}] Invalid message received:`, validation.errors);
      return;
    }

    const message = validation.data as RealtimeMessage;
    console.log(`[Agent:${this.agentId}] Received message:`, message.message_type);

    // Update session heartbeat
    if (this.session) {
      this.session.last_heartbeat = new Date().toISOString();
    }

    // Handle specific message types
    switch (message.message_type) {
      case 'heartbeat':
        // Echo heartbeat back
        this.sendMessage({
          message_type: 'heartbeat',
          payload: {
            status: 'alive',
            uptime_ms: Date.now() - (this.session ? new Date(this.session.created_at).getTime() : 0)
          }
        });
        break;
      
      case 'ack':
        console.log(`[Agent:${this.agentId}] Received ACK for message: ${message.payload?.ack_message_id}`);
        break;

      case 'brain_command':
        console.log(`[Agent:${this.agentId}] Received brain command:`, message.payload);
        break;

      default:
        console.log(`[Agent:${this.agentId}] Unhandled message type: ${message.message_type}`);
    }

    // Forward to message handler if provided
    if (this.onMessage) {
      this.onMessage(message);
    }
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      this.sendMessage({
        message_type: 'heartbeat',
        payload: {
          status: 'alive',
          uptime_ms: this.session ? Date.now() - new Date(this.session.created_at).getTime() : 0
        }
      });
    }, 30000); // 30 seconds
  }

  /**
   * Stop heartbeat interval
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Update session status
   */
  private updateSessionStatus(status: SessionInfo['status']): void {
    if (this.session) {
      this.session.status = status;
      console.log(`[Agent:${this.agentId}] Session status updated: ${status}`);
    }
  }

  /**
   * Get current session info
   */
  getSession(): SessionInfo | null {
    return this.session;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Disconnect from cloud
   */
  async disconnect(): Promise<void> {
    console.log(`[Agent:${this.agentId}] Disconnecting from cloud...`);
    
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.updateSessionStatus('disconnected');
    this.session = null;
  }

  /**
   * Send brain event (e.g., user input)
   */
  sendBrainEvent(eventType: string, data: any): void {
    this.sendMessage({
      message_type: 'brain_event',
      payload: {
        type: eventType,
        data,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Send test brain command
   */
  sendTestCommand(command: string, parameters: any = {}): void {
    this.sendMessage({
      message_type: 'brain_command',
      payload: {
        command,
        parameters,
        timestamp: new Date().toISOString()
      }
    });
  }
}

export default CloudConnection;