import { BrowserWindow } from 'electron';
import { io, Socket } from 'socket.io-client';
import log from 'electron-log';
import { webrtcInjector } from './webrtc-injector.js';
import { startPolling, stopPolling, registerCommandHandler, type BrowserCommand, type CommandResult } from './command-poller.js';
import * as cmdlog from './cmdlog.js';
import { startCall, appendTranscript, processDecision, executeRpaFlowFromCommand, closeCall, setMainWindow as setCallMainWindow, getCurrentCall } from './call-handler.js';
import { setMainWindow as setRpaMainWindow } from './rpa-executor.js';
import { mediaLayer } from './media/media-layer.js';
import { transcriptMonitor } from './media/transcript-monitor.js';
import { eventLogger } from './media/event-logger.js';
import { runtimeStatus } from './runtime-state.js';
import type { RuntimeStatus } from './types.js';
import type { TabManager, Tab } from './tab-manager.js';

function buildWsCtx(cloudUrl: string, token: string): string {
  return `ws=${cloudUrl}/ws/runtime token=${cmdlog.truncate(token, 16, 0)} device=${cmdlog.truncate(runtimeStatus.deviceId, 8, 4)}`;
}

// ===================== SOCKET REFERENCES =====================

let deviceSocket: Socket | null = null;
let agentSocket: Socket | null = null;

export function getDeviceSocket() { return deviceSocket; }
export function getAgentSocket() { return agentSocket; }

// ===================== HEARTBEAT STATE =====================

const HEARTBEAT_INTERVAL_MS = 30000;  // ping every 30s
const HEARTBEAT_TIMEOUT_MS = 5000;    // 5s to respond
const HEARTBEAT_MAX_MISSED = 3;       // force reconnect after 3 missed

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let lastPongTime = 0;
let missedHeartbeats = 0;

// ===================== RECONNECTION STATE =====================

const INITIAL_RECONNECT_DELAY = 1000;   // 1s
const MAX_RECONNECT_DELAY = 30000;      // 30s max
let reconnectionAttempt = 0;

// ===================== MAIN WINDOW REF =====================

let currentMainWindow: BrowserWindow | null = null;

// ===================== HELPERS =====================

/**
 * Send connection status to the renderer via IPC.
 * The renderer side panel (built in a future task) consumes this channel.
 */
function sendStatusToRenderer(status: string, detail?: string) {
  if (currentMainWindow && !currentMainWindow.isDestroyed()) {
    try {
      currentMainWindow.webContents.send('connection:status', {
        status,
        detail: detail || '',
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Renderer may not be ready yet
    }
  }
}

/**
 * Calculate exponential backoff delay for reconnection.
 * Sequence: 1s → 2s → 4s → 8s → 16s → 30s (capped)
 */
function getReconnectDelay(): number {
  const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectionAttempt);
  return Math.min(delay, MAX_RECONNECT_DELAY);
}

// ===================== HEARTBEAT =====================

/**
 * Start application-level heartbeat on a socket.
 * Sends `heartbeat:ping` every 30s; expects `heartbeat:pong` within 5s.
 * After 3 consecutive missed heartbeats, force a reconnection cycle.
 */
function startHeartbeat(socket: Socket): void {
  stopHeartbeat();
  lastPongTime = Date.now();
  missedHeartbeats = 0;

  // Remove any stale listener first
  socket.off('heartbeat:pong');
  socket.on('heartbeat:pong', () => {
    lastPongTime = Date.now();
    missedHeartbeats = 0;
  });

  heartbeatTimer = setInterval(() => {
    if (!socket.connected) {
      missedHeartbeats++;
      eventLogger.debug('heartbeat', 'skipped_not_connected', {
        missedCount: missedHeartbeats,
      });
      return;
    }

    // Send heartbeat ping with timestamp
    socket.emit('heartbeat:ping', { timestamp: Date.now() });
    eventLogger.debug('heartbeat', 'ping_sent', { timestamp: Date.now() });

    // Check if pong arrived within the expected window
    const timeSinceLastPong = Date.now() - lastPongTime;
    if (timeSinceLastPong > HEARTBEAT_INTERVAL_MS + HEARTBEAT_TIMEOUT_MS) {
      missedHeartbeats++;
      eventLogger.warn('heartbeat', 'missed', {
        missedCount: missedHeartbeats,
        timeSinceLastPong,
      });

      if (missedHeartbeats >= HEARTBEAT_MAX_MISSED) {
        eventLogger.error('heartbeat', 'failed', {
          missedHeartbeats: missedHeartbeats,
          action: 'forcing_reconnect',
        });
        log.error('[Heartbeat] No pong received for', missedHeartbeats,
          'cycles — forcing reconnection');
        missedHeartbeats = 0;
        socket.disconnect().connect();
      }
    }
  }, HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat(): void {
  if (heartbeatTimer !== null) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

// ===================== SOCKET CREATORS =====================

/**
 * Create the device WebSocket (primary channel to cloud).
 * Includes heartbeat, exponential backoff reconnection, session re-emit,
 * status IPC, and all message event handlers.
 */
function createDeviceSocket(
  cloudUrl: string,
  token: string,
  tabManager: TabManager,
  getAutoBrowseBridge: () => Promise<any>,
  onConnected?: () => Promise<void> | void,
): Socket {
  const socket = io(`${cloudUrl}/ws/runtime`, {
    auth: { token, device_id: runtimeStatus.deviceId },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: INITIAL_RECONNECT_DELAY,
    reconnectionDelayMax: MAX_RECONNECT_DELAY,
    reconnectionAttempts: Infinity,
    randomizationFactor: 0.1,
    timeout: 10000,
  }) as Socket;

  // ------ connect ------
  socket.on('connect', () => {
    reconnectionAttempt = 0;
    runtimeStatus.status = 'connected';
    const wsCtx = buildWsCtx(cloudUrl, token);
    cmdlog.log('WS', `→ WebSocket CONNECTED | ctx: ${wsCtx} | transport: ${socket.io?.engine?.transport?.name || 'unknown'} | session: ${runtimeStatus.sessionId ? 'active (' + runtimeStatus.sessionId + ')' : 'none'}`);
    log.info('Device WebSocket connected');
    eventLogger.info('connection', 'device_connected', {
      deviceId: runtimeStatus.deviceId,
      cloudUrl,
    });
    sendStatusToRenderer('connected');

    // Re-emit session:start if we still have an active session
    // (the session survived the disconnect, so we rejoin it)
    if (runtimeStatus.sessionId) {
      socket.emit('session:start', {
        session_id: runtimeStatus.sessionId,
        team_id: runtimeStatus.teamId || 'default-team',
      });
      cmdlog.log('WS', `→ Emitted session:start | session_id: ${runtimeStatus.sessionId} | team_id: ${runtimeStatus.teamId || 'default-team'}`);
      log.info('Re-joined session after reconnect:', runtimeStatus.sessionId);
      eventLogger.info('connection', 'session_rejoin', {
        sessionId: runtimeStatus.sessionId,
      });
      sendStatusToRenderer('connected', `Session ${runtimeStatus.sessionId} active`);
    }

    startHeartbeat(socket);

    if (onConnected) {
      void Promise.resolve(onConnected()).catch((error) => {
        log.warn('[Connection] Post-connect callback failed:', error);
      });
    }
  });

  // ------ disconnect ------
  socket.on('disconnect', (reason) => {
    runtimeStatus.status = 'disconnected';
    const wsCtx = buildWsCtx(cloudUrl, token);
    cmdlog.log('WS', `← WebSocket DISCONNECTED | reason: ${reason} | ctx: ${wsCtx} | reconnection attempts: ${reconnectionAttempt}`);
    log.warn('Device WebSocket disconnected:', reason);
    eventLogger.warn('connection', 'device_disconnected', { reason });
    stopHeartbeat();
    sendStatusToRenderer('disconnected', reason);
  });

  // ------ connect_error (reconnection in progress) ------
  socket.on('connect_error', (error) => {
    reconnectionAttempt++;
    runtimeStatus.status = 'reconnecting';
    const delay = getReconnectDelay();
    const wsCtx = buildWsCtx(cloudUrl, token);
    const transport = socket.io?.engine?.transport?.name || 'unknown';
    cmdlog.log('WS', `← WebSocket CONNECT_ERROR | attempt: ${reconnectionAttempt} | retry in: ${delay}ms | error: ${error.message} | ctx: ${wsCtx} | transport: ${transport}`);
    log.warn(
      `Device WebSocket connect error (attempt ${reconnectionAttempt}), ` +
      `retrying in ${delay}ms: ${error.message}`,
    );
    eventLogger.warn('connection', 'device_connect_error', {
      attempt: reconnectionAttempt,
      nextDelay: delay,
      error: error.message,
    });
    sendStatusToRenderer('reconnecting', `Attempt ${reconnectionAttempt}...`);
  });

  // ------ error ------
  socket.on('error', (error) => {
    log.error('Device WebSocket error:', error);
    eventLogger.error('connection', 'device_error', { error: String(error) });
  });

  // ------ message handlers ------
  registerMessageHandlers(socket, tabManager, getAutoBrowseBridge);

  return socket;
}

/**
 * Register all application-level message handlers on the device socket.
 * Extracted for clarity; mirrors the original handler layout.
 */
function registerMessageHandlers(
  socket: Socket,
  tabManager: TabManager,
  getAutoBrowseBridge: () => Promise<any>,
): void {
  // Forward local transcripts to cloud
  mediaLayer.on('transcript', (text: string, isFinal: boolean) => {
    if (socket.connected) {
      socket.emit('voice:transcript', {
        text, isFinal, timestamp: new Date().toISOString(),
      });
    }
  });

  // Incoming transcript → renderer
  socket.on('transcript', (data) => {
    currentMainWindow?.webContents.send('media:transcript', data);
  });

  // Call status updates → renderer
  socket.on('call_status', (data) => {
    currentMainWindow?.webContents.send('media:callStatus', data);
  });

  // brain:command → renderer
  socket.on('brain:command', (data) => {
    currentMainWindow?.webContents.send('brain:command', data);
  });

  // brain:audio → renderer + inject into armed BrowserView tabs
  socket.on('brain:audio', (data) => {
    currentMainWindow?.webContents.send('brain:audio', data);
    if (data.audio) {
      for (const tab of tabManager.getInternalTabs()) {
        if (tab.view && webrtcInjector.isArmed(tab.view.webContents.id)) {
          webrtcInjector.injectAudio(tab.view.webContents, data.audio);
        }
      }
    }
  });

  // goal_execute → AutoBrowse bridge
  socket.on('goal_execute', async (data) => {
    cmdlog.log('CMD', `goal_execute received: ${data.goal?.substring(0, 80)}`);
    log.info('[Main] Received goal from cloud:', data.goal);
    const bridge = await getAutoBrowseBridge();
    if (!bridge.isAutoBrowseInitialized()) {
      socket.emit('goal:result', {
        execution_id: data.execution_id, status: 'failed',
        goal_status: 'failed', error: 'AutoBrowse not initialized',
      });
      return;
    }
    try {
      const result = await bridge.executeGoal({
        execution_id: data.execution_id, goal: data.goal,
        inputs: data.inputs, constraints: data.constraints,
      });
      socket.emit('goal:result', {
        execution_id: data.execution_id, status: result.status,
        goal_status: result.goal_status, steps: result.steps,
        duration: result.duration, artifacts: result.artifacts,
      });
      currentMainWindow?.webContents.send('brain:command', {
        type: 'goal_result', payload: result,
        execution_id: data.execution_id, timestamp: new Date().toISOString(),
      });
    } catch (error) {
      log.error('[Main] Goal execution failed:', error);
      socket.emit('goal:result', {
        execution_id: data.execution_id, status: 'failed',
        goal_status: 'failed', error: String(error),
      });
    }
  });
}

/**
 * Create the agent WebSocket (secondary channel for agent commands).
 * Uses the same reconnection config as the device socket.
 */
function createAgentSocket(cloudUrl: string, token: string): Socket {
  const socket = io(`${cloudUrl}/agent`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: INITIAL_RECONNECT_DELAY,
    reconnectionDelayMax: MAX_RECONNECT_DELAY,
    reconnectionAttempts: Infinity,
    randomizationFactor: 0.1,
    timeout: 10000,
  }) as Socket;

  socket.on('connect', () => {
    log.info('Agent WebSocket connected');
    eventLogger.info('connection', 'agent_connected', {});
  });

  socket.on('disconnect', (reason) => {
    log.warn('Agent WebSocket disconnected:', reason);
    eventLogger.warn('connection', 'agent_disconnected', { reason });
  });

  socket.on('error', (error) => {
    log.error('Agent WebSocket error:', error);
    eventLogger.error('connection', 'agent_error', { error: String(error) });
  });

  socket.onAny((event, ...args) => {
    if (event.startsWith('command')) {
      currentMainWindow?.webContents.send('brain:command', { event, data: args });
    }
  });

  return socket;
}

// ===================== PUBLIC API =====================

/**
 * Connect both device and agent WebSockets to the cloud.
 *
 * Preserves the original function signature for full backward compatibility.
 * The `runtimeStatus` parameter is accepted but not used directly —
 * the singleton from `./runtime-state.js` is the authoritative source.
 */
export function connectWebSockets(
  cloudUrl: string,
  token: string,
  _runtimeStatus: RuntimeStatus,
  tabManager: TabManager,
  mainWindow: BrowserWindow | null,
  getAutoBrowseBridge: () => Promise<any>,
  onConnected?: () => Promise<void> | void,
): void {
  // Disconnect any existing sockets first (idempotent)
  disconnectSockets();

  currentMainWindow = mainWindow;
  cmdlog.setMainWindow(mainWindow);

  runtimeStatus.status = 'connecting';
  sendStatusToRenderer('connecting');
  eventLogger.info('connection', 'connecting', { cloudUrl });

  cmdlog.log('WS', `→ Connecting WebSockets | cloud: ${cloudUrl} | device: ${cmdlog.truncate(runtimeStatus.deviceId, 8, 4)} | token: ${cmdlog.truncate(token, 16, 0)} | transports: [websocket, polling]`);

  deviceSocket = createDeviceSocket(cloudUrl, token, tabManager, getAutoBrowseBridge, onConnected);
  agentSocket = createAgentSocket(cloudUrl, token);
}

/**
 * Disconnect both WebSockets and clean up all state.
 * Idempotent — safe to call multiple times.
 */
export function disconnectSockets() {
  stopHeartbeat();
  stopPolling();

  cmdlog.log('WS', `← Disconnecting WebSockets | device socket: ${deviceSocket ? 'active' : 'none'} | agent socket: ${agentSocket ? 'active' : 'none'} | reconnectionAttempt: ${reconnectionAttempt}`);

  if (deviceSocket) {
    deviceSocket.removeAllListeners();
    deviceSocket.disconnect();
    deviceSocket = null;
  }
  if (agentSocket) {
    agentSocket.removeAllListeners();
    agentSocket.disconnect();
    agentSocket = null;
  }

  runtimeStatus.status = 'disconnected';
  currentMainWindow = null;
  reconnectionAttempt = 0;
  missedHeartbeats = 0;
  lastPongTime = 0;
}

// ===================== PHASE 6: Command Polling Integration =====================

/**
 * Set up Phase 6 command handlers and start polling.
 * Called after WebSockets are connected and auth is established.
 */
export function setupCommandPolling(mainWindow: BrowserWindow | null): void {
  const deviceId = cmdlog.truncate(runtimeStatus.deviceId, 8, 4);
  const tokenPre = cmdlog.truncate(runtimeStatus.authToken, 16, 0);
  const cloudUrl = runtimeStatus.cloudUrl || '(unset)';
  const sessionId = runtimeStatus.sessionId || 'none';
  cmdlog.log('SYS', `Setting up command handlers and starting polling | device: ${deviceId} | token: ${tokenPre} | cloud: ${cloudUrl} | session: ${sessionId}`);
  setCallMainWindow(mainWindow);
  setRpaMainWindow(mainWindow);

  // Register command handlers
  registerCommandHandler('call_start', async (command: BrowserCommand): Promise<CommandResult> => {
    cmdlog.log('CMD', `call_start → session ${command.payload.session_id}`);
    const sessionId = (command.payload.session_id as string) || '';
    if (!sessionId) {
      return { command_id: command.id, status: 'failed', error: 'No session_id', timestamp: new Date().toISOString() };
    }
    startCall(sessionId);
    return { command_id: command.id, status: 'success', output: { sessionId }, timestamp: new Date().toISOString() };
  });

  registerCommandHandler('call_transcript', async (command: BrowserCommand): Promise<CommandResult> => {
    const text = (command.payload.text as string) || '';
    const isFinal = (command.payload.is_final as boolean) || false;
    cmdlog.log('CMD', `call_transcript → ${text.substring(0, 60)}${isFinal ? ' (final)' : ' (partial)'}`);
    appendTranscript(text, isFinal);
    return { command_id: command.id, status: 'success', timestamp: new Date().toISOString() };
  });

  registerCommandHandler('call_decide', async (command: BrowserCommand): Promise<CommandResult> => {
    cmdlog.log('CMD', `call_decide → processing decision`);
    processDecision(command.payload);
    return { command_id: command.id, status: 'success', timestamp: new Date().toISOString() };
  });

  registerCommandHandler('rpa_flow', async (command: BrowserCommand): Promise<CommandResult> => {
    const payload = command.payload as { flow_id?: string; name?: string; steps?: Array<{ step_id?: string; action: string; selector?: string; value?: string; url?: string; description?: string; timeout?: number; direction?: string }> };
    if (!payload.steps || payload.steps.length === 0) {
      cmdlog.log('CMD', `rpa_flow (${command.id}) → no steps, failed`);
      return { command_id: command.id, status: 'failed', error: 'No RPA steps', timestamp: new Date().toISOString() };
    }
    // Cast steps to RpaStep[] — action is validated at execution time
    const steps = payload.steps as Array<{ step_id?: string; action: 'navigate' | 'click' | 'fill' | 'extract' | 'wait' | 'screenshot' | 'scroll' | 'press_key' | 'select' | 'hover' | 'wait_for' | 'submit' | 'assert'; selector?: string; value?: string; url?: string; description?: string; timeout?: number; direction?: string }>;
    cmdlog.log('CMD', `rpa_flow (${command.id}) → ${steps.length} steps: ${steps.map(s => s.action).join(', ')}`);
    const result = await executeRpaFlowFromCommand({
      flow_id: payload.flow_id,
      name: payload.name,
      steps,
    });
    return {
      command_id: command.id,
      status: result.status === 'completed' ? 'success' : 'failed',
      output: { flow_result: result },
      timestamp: new Date().toISOString(),
    };
  });

  registerCommandHandler('call_close', async (command: BrowserCommand): Promise<CommandResult> => {
    const reason = (command.payload.reason as string) || 'Cloud requested close';
    cmdlog.log('CMD', `call_close → ${reason}`);
    closeCall(reason);
    return { command_id: command.id, status: 'success', timestamp: new Date().toISOString() };
  });

  registerCommandHandler('call_escalate', async (command: BrowserCommand): Promise<CommandResult> => {
    const reason = (command.payload.reason as string) || 'Escalation requested';
    cmdlog.log('CMD', `call_escalate → ${reason}`);
    log.info(`[CommandPoller] Escalation: ${reason}`);
    return { command_id: command.id, status: 'success', output: { reason }, timestamp: new Date().toISOString() };
  });

  registerCommandHandler('status_query', async (command: BrowserCommand): Promise<CommandResult> => {
    cmdlog.log('CMD', `status_query → reporting device state`);
    return {
      command_id: command.id,
      status: 'success',
      output: {
        deviceId: runtimeStatus.deviceId,
        callState: getCurrentCallState(),
        status: runtimeStatus.status,
      },
      timestamp: new Date().toISOString(),
    };
  });

  // Start polling
  startPolling();
  cmdlog.log('SYS', 'Command polling initialized and running');
  log.info('[Connection] Phase 6 command polling initialized');
}

function getCurrentCallState(): Record<string, unknown> | null {
  const call = getCurrentCall();
  if (!call) return null;
  return {
    sessionId: call.sessionId,
    state: call.state,
    duration_ms: Date.now() - call.startTime,
  };
}

// Re-export for use in other modules
export { getCurrentCall } from './call-handler.js';
