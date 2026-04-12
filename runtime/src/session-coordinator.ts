/**
 * Session Coordinator - Coordinates call lifecycle + automation
 * 
 * Orchestrates:
 * 1. Call start (media layer)
 * 2. Text exchange (WebSocket ↔ Cloud)
 * 3. Automation execution (AutoBrowse)
 * 4. Call end + reporting
 */

import { EventEmitter } from 'events';
import { mediaLayer } from '../media/media-layer.js';

export interface SessionConfig {
  cloudUrl: string;
  authToken: string;
  deviceId: string;
}

export interface CloudCommand {
  type: 'say' | 'ui_steps' | 'adaptive_goal' | 'mode' | 'stop';
  payload: unknown;
}

export interface ExecutionResult {
  execution_id: string;
  status: 'success' | 'failure' | 'partial';
  goal_status?: 'achieved' | 'failed' | 'uncertain';
  results: unknown[];
  summary: {
    total_steps: number;
    successful_steps: number;
    failed_steps: number;
    execution_time_ms: number;
  };
  final_state?: {
    url?: string;
    screenshots?: string[];
  };
}

export class SessionCoordinator extends EventEmitter {
  private config: SessionConfig | null = null;
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private isActive = false;
  private autoBrowseExecutor: any = null;

  constructor() {
    super();
  }

  /**
   * Initialize session with Cloud configuration
   */
  initialize(config: SessionConfig): void {
    this.config = config;
    console.log('[SessionCoordinator] Initialized');
  }

  /**
   * Set AutoBrowse executor (injected from main process)
   */
  setAutoBrowseExecutor(executor: any): void {
    this.autoBrowseExecutor = executor;
  }

  /**
   * Start a new session (call)
   */
  async startSession(sessionId: string): Promise<void> {
    if (this.isActive) {
      throw new Error('Session already active');
    }

    this.sessionId = sessionId;
    this.isActive = true;

    await mediaLayer.startCall(sessionId);

    this.connectWebSocket();
    this.setupMediaListeners();

    this.emit('session:started', { sessionId });
    console.log('[SessionCoordinator] Session started:', sessionId);
  }

  /**
   * Connect to Cloud WebSocket for real-time communication
   */
  private connectWebSocket(): void {
    if (!this.config) throw new Error('Not initialized');

    const wsUrl = this.config.cloudUrl.replace('http', 'ws') + 
      `/ws/sessions?token=${this.config.authToken}&device_id=${this.config.deviceId}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[SessionCoordinator] WebSocket connected');
      this.emit('ws:connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleCloudCommand(message.payload);
      } catch (e) {
        console.error('[SessionCoordinator] Failed to parse message:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('[SessionCoordinator] WebSocket disconnected');
      this.emit('ws:disconnected');
    };

    this.ws.onerror = (error) => {
      console.error('[SessionCoordinator] WebSocket error:', error);
      this.emit('ws:error', error);
    };
  }

  /**
   * Handle commands from Cloud
   */
  private async handleCloudCommand(command: CloudCommand): Promise<void> {
    console.log('[SessionCoordinator] Received command:', command.type);

    switch (command.type) {
      case 'say':
        await this.handleSay(command.payload);
        break;
      case 'ui_steps':
        await this.handleUISteps(command.payload);
        break;
      case 'adaptive_goal':
        await this.handleAdaptiveGoal(command.payload);
        break;
      case 'mode':
        await this.handleMode(command.payload);
        break;
      case 'stop':
        await this.stopSession();
        break;
    }
  }

  /**
   * Handle 'say' command - TTS response
   */
  private async handleSay(payload: any): Promise<void> {
    await mediaLayer.speak(payload.text, {
      voice: payload.voice,
      speed: payload.speed,
      interruptible: payload.interruptible
    });

    this.sendCloudEvent('say_completed', {
      text: payload.text,
      sessionId: this.sessionId
    });
  }

  /**
   * Handle 'ui_steps' command - deterministic RPA
   */
  private async handleUISteps(payload: any): Promise<void> {
    console.log('[SessionCoordinator] Executing UI steps:', payload.steps?.length);

    // For now, delegate to AutoBrowse
    if (this.autoBrowseExecutor) {
      const result = await this.autoBrowseExecutor.executeGoal(
        {
          objective: 'Execute UI steps',
          target_app: 'web',
          target_url: payload.context?.targetUrl
        },
        {
          sessionId: this.sessionId || 'unknown',
          flowId: payload.flow_id,
          metadata: payload
        }
      );

      this.sendCloudEvent('ui_steps_completed', result);
    }
  }

  /**
   * Handle 'adaptive_goal' command - AutoBrowse execution
   */
  private async handleAdaptiveGoal(payload: any): Promise<void> {
    console.log('[SessionCoordinator] Executing adaptive goal:', payload.goal);

    if (!this.autoBrowseExecutor) {
      throw new Error('AutoBrowse executor not set');
    }

    const result = await this.autoBrowseExecutor.executeGoal(
      {
        objective: payload.goal,
        target_app: payload.target_app,
        target_url: payload.context?.targetUrl,
        constraints: payload.constraints
      },
      {
        sessionId: this.sessionId || 'unknown',
        flowId: payload.flow_id,
        metadata: payload.context
      }
    );

    this.sendCloudEvent('adaptive_goal_completed', result);
  }

  /**
   * Handle 'mode' command - change agent mode
   */
  private async handleMode(payload: any): Promise<void> {
    console.log('[SessionCoordinator] Mode change:', payload.mode);
    this.emit('mode:changed', payload);
  }

  /**
   * Send event back to Cloud
   */
  private sendCloudEvent(eventType: string, payload: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[SessionCoordinator] WebSocket not connected');
      return;
    }

    this.ws.send(JSON.stringify({
      message_id: `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
      direction: 'runtime_to_cloud',
      message_type: 'runtime_event',
      payload: {
        event_type: eventType,
        session_id: this.sessionId,
        device_id: this.config?.deviceId,
        payload
      }
    }));
  }

  /**
   * Setup media layer event listeners
   */
  private setupMediaListeners(): void {
    mediaLayer.on('media:transcript', (data) => {
      this.sendCloudEvent('transcript', data);
    });

    mediaLayer.on('call:ended', (data) => {
      this.emit('call:ended', data);
    });
  }

  /**
   * End current session
   */
  async stopSession(): Promise<void> {
    if (!this.isActive) return;

    console.log('[SessionCoordinator] Stopping session');

    await mediaLayer.stopCall();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isActive = false;
    const sessionId = this.sessionId;
    this.sessionId = null;

    this.emit('session:ended', { sessionId });
    console.log('[SessionCoordinator] Session ended');
  }

  /**
   * Get current session status
   */
  getStatus(): { active: boolean; sessionId: string | null; wsConnected: boolean } {
    return {
      active: this.isActive,
      sessionId: this.sessionId,
      wsConnected: this.ws?.readyState === WebSocket.OPEN
    };
  }

  /**
   * Send text input to Cloud (from STT)
   */
  sendTextInput(text: string, confidence: number): void {
    this.sendCloudEvent('text_input', {
      text,
      confidence,
      timestamp: Date.now()
    });
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.stopSession();
    mediaLayer.cleanup();
    console.log('[SessionCoordinator] Cleaned up');
  }
}

export const sessionCoordinator = new SessionCoordinator();