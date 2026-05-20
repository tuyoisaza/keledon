import { BrowserWindow } from 'electron';
import { io, Socket } from 'socket.io-client';
import log from 'electron-log';
import { webrtcInjector } from './webrtc-injector.js';
import { mediaLayer } from './media/media-layer.js';
import { transcriptMonitor } from './media/transcript-monitor.js';
import { eventLogger } from './media/event-logger.js';
import type { RuntimeStatus } from './types.js';
import type { TabManager, Tab } from './tab-manager.js';

let deviceSocket: Socket | null = null;
let agentSocket: Socket | null = null;

export function getDeviceSocket() { return deviceSocket; }
export function getAgentSocket() { return agentSocket; }

export function connectWebSockets(
  cloudUrl: string,
  token: string,
  runtimeStatus: RuntimeStatus,
  tabManager: TabManager,
  mainWindow: BrowserWindow | null,
  getAutoBrowseBridge: () => Promise<any>
): void {
  deviceSocket = io(`${cloudUrl}/ws/runtime`, {
    auth: { token, device_id: runtimeStatus.deviceId },
    transports: ['websocket']
  });

  deviceSocket.on('connect', () => {
    log.info('Device WebSocket connected');
    if (runtimeStatus.sessionId) {
      deviceSocket?.emit('session:start', {
        session_id: runtimeStatus.sessionId,
        team_id: 'default-team'
      });
      log.info('Joined session:', runtimeStatus.sessionId);
    }
  });

  deviceSocket.on('disconnect', (reason) => {
    log.warn('Device WebSocket disconnected:', reason);
  });

  deviceSocket.on('error', (error) => {
    log.error('Device WebSocket error:', error);
  });

  // Forward local transcripts to cloud
  mediaLayer.on('transcript', (text: string, isFinal: boolean) => {
    if (deviceSocket && deviceSocket.connected) {
      deviceSocket.emit('voice:transcript', {
        text, isFinal, timestamp: new Date().toISOString()
      });
    }
  });

  deviceSocket.on('transcript', (data) => {
    mainWindow?.webContents.send('media:transcript', data);
  });

  deviceSocket.on('call_status', (data) => {
    mainWindow?.webContents.send('media:callStatus', data);
  });

  // brain:command → renderer
  deviceSocket.on('brain:command', (data) => {
    mainWindow?.webContents.send('brain:command', data);
  });

  // brain:audio → renderer + inject into armed BrowserView tabs
  deviceSocket.on('brain:audio', (data) => {
    mainWindow?.webContents.send('brain:audio', data);
    if (data.audio) {
      for (const tab of tabManager.getInternalTabs()) {
        if (tab.view && webrtcInjector.isArmed(tab.view.webContents.id)) {
          webrtcInjector.injectAudio(tab.view.webContents, data.audio);
        }
      }
    }
  });

  // goal_execute → AutoBrowse bridge
  deviceSocket.on('goal_execute', async (data) => {
    log.info('[Main] Received goal from cloud:', data.goal);
    const bridge = await getAutoBrowseBridge();
    if (!bridge.isAutoBrowseInitialized()) {
      deviceSocket?.emit('goal:result', {
        execution_id: data.execution_id, status: 'failed',
        goal_status: 'failed', error: 'AutoBrowse not initialized'
      });
      return;
    }
    try {
      const result = await bridge.executeGoal({
        execution_id: data.execution_id, goal: data.goal,
        inputs: data.inputs, constraints: data.constraints
      });
      deviceSocket?.emit('goal:result', {
        execution_id: data.execution_id, status: result.status,
        goal_status: result.goal_status, steps: result.steps,
        duration: result.duration, artifacts: result.artifacts
      });
      mainWindow?.webContents.send('brain:command', {
        type: 'goal_result', payload: result,
        execution_id: data.execution_id, timestamp: new Date().toISOString()
      });
    } catch (error) {
      log.error('[Main] Goal execution failed:', error);
      deviceSocket?.emit('goal:result', {
        execution_id: data.execution_id, status: 'failed',
        goal_status: 'failed', error: String(error)
      });
    }
  });

  // Agent socket (secondary channel)
  agentSocket = io(`${cloudUrl}/agent`, {
    auth: { token },
    transports: ['websocket']
  });

  agentSocket.on('connect', () => {
    log.info('Agent WebSocket connected');
  });

  agentSocket.on('disconnect', (reason) => {
    log.warn('Agent WebSocket disconnected:', reason);
  });

  agentSocket.on('error', (error) => {
    log.error('Agent WebSocket error:', error);
  });

  agentSocket.onAny((event, ...args) => {
    if (event.startsWith('command')) {
      mainWindow?.webContents.send('brain:command', { event, data: args });
    }
  });
}

export function disconnectSockets() {
  if (deviceSocket) { deviceSocket.disconnect(); deviceSocket = null; }
  if (agentSocket) { agentSocket.disconnect(); agentSocket = null; }
}
