/**
 * Core Agent-Cloud WebSocket Connection
 * Implements real session management using KELEDON contracts
 */

import { io, Socket } from 'socket.io-client';
import { randomUUID } from 'crypto';

interface SessionInfo {
  session_id: string;
  agent_id: string;
  created_at: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  last_heartbeat: string;
}

interface AgentEvent {
  event_id: string;
  session_id: string;
  event_type: string;
  agent_id: string;
  ts: string;
  payload: any;
}

interface CloudCommand {
  command_id: string;
  session_id: string;
  timestamp: string;
  type: 'say' | 'ui_steps' | 'mode' | 'stop' | 'error';
  confidence: number;
  mode: string;
  flow_id: string | null;
  flow_run_id: string | null;
  say?: { text: string; interruptible?: boolean };
  ui_steps?: any[];
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
    private onCommand?: (command: CloudCommand) => void
  ) {}

  /**
   * Connect to cloud and create real session
   */
  async connect(): Promise<void> {
    const namespace = '/agent';
    const url = `${this.cloudUrl}${namespace}`;
    console.log(`[Agent:${this.agentId}] Connecting to cloud at ${url}`);
    
    return new Promise((resolve, reject) => {
      this.socket = io(url, {
        transports: ['websocket'],
        timeout: 10000,
      });

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

      this.socket.on('command', (command: CloudCommand) => {
        console.log(`[Agent:${this.agentId}] Received command:`, command.type);
        if (this.onCommand) {
          this.onCommand(command);
        }
      });

      this.socket.on('connected', (data: any) => {
        console.log(`[Agent:${this.agentId}] Server acknowledged connection:`, data);
      });

      this.socket.on('session.created', (data: any) => {
        console.log(`[Agent:${this.agentId}] Session created:`, data.session_id);
        this.session!.session_id = data.session_id;
      });

      this.socket.on('error', (data: any) => {
        console.error(`[Agent:${this.agentId}] Server error:`, data.message);
      });

      this.socket.on('connect_error', (error) => {
        console.error(`[Agent:${this.agentId}] Connection error:`, error);
        this.updateSessionStatus('error');
        reject(error);
      });

      setTimeout(() => {
        if (!this.socket?.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Create and initialize session via AgentGateway
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

    console.log(`[Agent:${this.agentId}] Creating session: ${sessionId}`);
    
    this.socket!.emit('session.create', {
      agent_id: this.agentId,
      tab_url: '',
      tab_title: ''
    });
  }

  /**
   * Send text input event (from STT) to cloud brain
   */
  sendTextInput(text: string, confidence: number = 0.8, metadata: any = {}): void {
    if (!this.socket?.connected || !this.session) {
      console.error(`[Agent:${this.agentId}] Cannot send text - not connected`);
      return;
    }

    const event: AgentEvent = {
      event_id: randomUUID(),
      session_id: this.session.session_id,
      event_type: 'text_input',
      agent_id: this.agentId,
      ts: new Date().toISOString(),
      payload: {
        text,
        confidence,
        provider: 'vosk',
        metadata
      }
    };

    console.log(`[Agent:${this.agentId}] Sending text_input: "${text.substring(0, 50)}..."`);
    this.socket.emit('brain_event', event);
  }

  /**
   * Send UI execution result back to cloud
   */
  sendUIResult(results: any[]): void {
    if (!this.socket?.connected || !this.session) {
      console.error(`[Agent:${this.agentId}] Cannot send UI result - not connected`);
      return;
    }

    this.socket.emit('ui_result', {
      event_id: randomUUID(),
      session_id: this.session.session_id,
      event_type: 'ui_result',
      agent_id: this.agentId,
      ts: new Date().toISOString(),
      payload: { results }
    });
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
}

export default CloudConnection;