/**
 * WebSocket Client - Communication layer between Runtime and Cloud
 */

import { EventEmitter } from 'events';

export interface RuntimeWebSocketConfig {
  cloudUrl: string;
  token: string;
  deviceId: string;
  reconnectIntervalMs?: number;
  maxReconnectAttempts?: number;
}

export interface CloudCommand {
  command_id: string;
  session_id: string;
  timestamp: string;
  type: 'say' | 'ui_steps' | 'adaptive_goal' | 'mode' | 'stop';
  payload: unknown;
}

export interface RuntimeEvent {
  event_id: string;
  session_id: string;
  timestamp: string;
  type: 'text_input' | 'ui_result' | 'system' | 'device_status';
  payload: unknown;
}

export class RuntimeWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: RuntimeWebSocketConfig | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectIntervalMs = 3000;
  private messageQueue: unknown[] = [];
  private sessionId: string | null = null;

  async connect(config: RuntimeWebSocketConfig): Promise<void> {
    this.config = {
      ...config,
      reconnectIntervalMs: config.reconnectIntervalMs || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5
    };

    return this.establishConnection();
  }

  private async establishConnection(): Promise<void> {
    if (!this.config) throw new Error('Not configured');

    const url = `${this.config.cloudUrl.replace('http', 'ws')}/ws/runtime?token=${this.config.token}&device_id=${this.config.deviceId}`;
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new (require('ws'))(url);
        
        this.ws.on('open', () => {
          this.reconnectAttempts = 0;
          this.emit('connected');
          this.flushMessageQueue();
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          this.handleMessage(JSON.parse(data.toString()));
        });

        this.ws.on('close', () => {
          this.emit('disconnected');
          this.attemptReconnect();
        });

        this.ws.on('error', (error) => {
          this.emit('error', error);
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: { message_type?: string; payload?: unknown }): void {
    switch (message.message_type) {
      case 'brain_command':
        this.emit('command', message.payload as CloudCommand);
        break;
      case 'heartbeat':
        this.emit('heartbeat', message.payload);
        break;
      case 'ack':
        this.emit('ack', message.payload);
        break;
      default:
        console.log('Unknown message type:', message.message_type);
    }
  }

  sendEvent(event: RuntimeEvent): void {
    const message = {
      message_id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      direction: 'runtime_to_cloud',
      message_type: 'runtime_event',
      payload: event
    };

    this.send(message);
  }

  send(command: unknown): void {
    if (this.ws?.readyState === (require('ws')).OPEN) {
      this.ws.send(JSON.stringify(command));
    } else {
      this.messageQueue.push(command);
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('reconnect:failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config!.reconnectIntervalMs * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      this.establishConnection().catch(() => {});
    }, delay);
  }

  setSession(sessionId: string): void {
    this.sessionId = sessionId;
  }

  getSession(): string | null {
    return this.sessionId;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.config = null;
    this.sessionId = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === (require('ws')).OPEN;
  }
}