/**
 * KELEDON Runtime - Main Entry Point
 * 
 * Core embeddable runtime for KELEDON Browser / Desktop Agent
 * Handles: device registration, cloud connection, command execution, evidence collection
 */

import { EventEmitter } from 'events';
import { RuntimeWebSocketClient } from './websocket-client.js';
import { ExecutionRouter, DeterministicExecutor, AdaptiveExecutor } from './executor.js';
import { DeviceManager } from './device-manager.js';
import { EvidenceCollector } from './evidence-collector.js';

export interface RuntimeConfig {
  dataDir: string;
  cloudUrl?: string;
}

export interface RuntimeStatus {
  status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
  deviceId: string | null;
  sessionId: string | null;
  connectedAt: string | null;
  error?: string;
}

export class KeledonRuntime extends EventEmitter {
  private config: RuntimeConfig;
  private deviceManager: DeviceManager;
  private wsClient: RuntimeWebSocketClient;
  private executionRouter: ExecutionRouter;
  private evidenceCollector: EvidenceCollector;
  private status: RuntimeStatus = {
    status: 'idle',
    deviceId: null,
    sessionId: null,
    connectedAt: null
  };

  constructor(config: RuntimeConfig) {
    super();
    this.config = config;
    
    this.deviceManager = new DeviceManager({ dataDir: config.dataDir });
    this.wsClient = new RuntimeWebSocketClient();
    this.executionRouter = new ExecutionRouter();
    this.evidenceCollector = new EvidenceCollector(config.dataDir);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.wsClient.on('connected', () => {
      this.updateStatus({ status: 'connected', connectedAt: new Date().toISOString() });
      this.emit('connected');
    });

    this.wsClient.on('disconnected', () => {
      this.updateStatus({ status: 'disconnected', connectedAt: null });
      this.emit('disconnected');
    });

    this.wsClient.on('command', async (command) => {
      await this.handleCommand(command as {
        command_id: string;
        session_id: string;
        type: string;
        payload: unknown;
      });
    });

    this.wsClient.on('error', (error) => {
      this.updateStatus({ status: 'error', error: String(error) });
      this.emit('error', error);
    });

    this.executionRouter.on('execution:completed', (result) => {
      this.sendExecutionResult(result);
    });

    this.executionRouter.on('execution:failed', (result) => {
      this.sendExecutionResult(result);
    });
  }

  async initialize(): Promise<void> {
    const device = this.deviceManager.getOrCreateDevice();
    this.updateStatus({ deviceId: device.deviceId });
    
    this.executionRouter.setExecutors(
      new DeterministicExecutor(),
      new AdaptiveExecutor()
    );
    
    this.emit('initialized', { deviceId: device.deviceId });
  }

  async pair(cloudUrl: string, pairingCode: string): Promise<{ deviceId: string; authToken: string }> {
    this.updateStatus({ status: 'connecting' });
    
    const result = await this.deviceManager.pairWithCloud(cloudUrl, pairingCode);
    
    return {
      deviceId: result.device_id,
      authToken: result.auth_token
    };
  }

  async connect(cloudUrl?: string): Promise<void> {
    const url = cloudUrl || this.deviceManager.getCloudUrl();
    const token = this.deviceManager.getAuthToken();
    const device = this.deviceManager.getOrCreateDevice();

    if (!url || !token) {
      throw new Error('Device not paired. Call pair() first.');
    }

    this.updateStatus({ status: 'connecting' });

    await this.wsClient.connect({
      cloudUrl: url,
      token,
      deviceId: device.deviceId
    });

    this.executionRouter.setWebSocketClient(this.wsClient);
  }

  async disconnect(): Promise<void> {
    this.wsClient.disconnect();
    this.evidenceCollector.clearSession();
    this.updateStatus({ status: 'disconnected', sessionId: null });
  }

  private async handleCommand(command: {
    command_id: string;
    session_id: string;
    type: string;
    payload: unknown;
  }): Promise<void> {
    this.updateStatus({ sessionId: command.session_id });
    
    this.evidenceCollector.setSession(command.session_id, command.command_id);
    this.wsClient.setSession(command.session_id);

    try {
      const result = await this.executionRouter.executeCommand(
        { type: command.type, payload: command.payload },
        {
          sessionId: command.session_id,
          deviceId: this.status.deviceId!
        }
      );

      this.evidenceCollector.addLog('info', `Command ${command.type} completed`, { 
        executionId: result.execution_id 
      });

    } catch (error) {
      this.evidenceCollector.addError(error as Error);
      this.sendError(command.command_id, error);
    }
  }

  private sendExecutionResult(result: unknown): void {
    this.wsClient.sendEvent({
      event_id: `evt-${Date.now()}`,
      session_id: this.status.sessionId || 'unknown',
      timestamp: new Date().toISOString(),
      type: 'ui_result',
      payload: result
    });
  }

  private sendError(commandId: string, error: unknown): void {
    this.wsClient.sendEvent({
      event_id: `evt-${Date.now()}`,
      session_id: this.status.sessionId || 'unknown',
      timestamp: new Date().toISOString(),
      type: 'system',
      payload: {
        event: 'error',
        command_id: commandId,
        error: String(error)
      }
    });
  }

  private updateStatus(partial: Partial<RuntimeStatus>): void {
    this.status = { ...this.status, ...partial };
    this.emit('statusChanged', this.status);
  }

  getStatus(): RuntimeStatus {
    return { ...this.status };
  }

  isPaired(): boolean {
    return this.deviceManager.isPaired();
  }

  getDeviceInfo() {
    return this.deviceManager.getOrCreateDevice();
  }

  async uploadEvidence(): Promise<void> {
    const device = this.deviceManager.getOrCreateDevice();
    const cloudUrl = this.deviceManager.getCloudUrl();
    const token = this.deviceManager.getAuthToken();

    if (!cloudUrl || !token) {
      throw new Error('Device not paired');
    }

    await this.evidenceCollector.uploadEvidence(device.deviceId, cloudUrl, token);
  }

  cleanup(): void {
    this.wsClient.disconnect();
    this.evidenceCollector.clear();
  }
}

export { RuntimeWebSocketClient } from './websocket-client.js';
export { ExecutionRouter } from './executor.js';
export { DeviceManager } from './device-manager.js';
export { EvidenceCollector } from './evidence-collector.js';
export { MediaLayer, mediaLayer } from './media/media-layer.js';
export { SessionCoordinator, sessionCoordinator } from './session-coordinator.js';
export { AutoBrowseBridge, autoBrowseBridge } from './autobrowse-bridge.js';

// Media components
export * from './media/config-loader.js';
export * from './media/stt-service.js';
export * from './media/tts-service.js';
export * from './media/vad.js';
export * from './media/audio-capture.js';
export * from './media/adapters/webrtc-adapter.js';
export * from './media/adapters/genesys-adapter.js';