import { BrowserWindow } from 'electron';
import { io, Socket } from 'socket.io-client';
import log from 'electron-log';
import crypto from 'crypto';
import { webrtcInjector } from './webrtc-injector.js';
import { startPolling, stopPolling, registerCommandHandler, type BrowserCommand, type CommandResult } from './command-poller.js';
import * as cmdlog from './cmdlog.js';
import { startCall, appendTranscript, processDecision, executeRpaFlowFromCommand, closeCall, setMainWindow as setCallMainWindow, getCurrentCall } from './call-handler.js';
import { setMainWindow as setRpaMainWindow } from './rpa-executor.js';
import { setRpaProviderConfig } from './rpa-provider.js';
import { mediaLayer } from './media/media-layer.js';
import { transcriptMonitor } from './media/transcript-monitor.js';
import { eventLogger } from './media/event-logger.js';
import { runtimeStatus } from './runtime-state.js';
import type { RuntimeStatus } from './types.js';
import type { TabManager, Tab } from './tab-manager.js';
import { sendStatusToRenderer, buildWsCtx, deriveWsUrl, decryptRuntimeVendorValue, enrichGoalExecuteDataFromRuntimeVendor, summarizeGoalExecuteData, ensureBrowserViewForGoalExecution, ensureActiveGoalTab, findMatchingVendorFromGoal, getReconnectDelay, decryptRuntimeVendorSecret, enrichCloudGoalInputsFromRuntimeVendor } from './cloud-helpers.js';


/**
 * Derive the WebSocket API URL from the cloudUrl. WebSocket connections go
 * directly to the API service instead of through the nginx proxy.
 */

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

// ===================== GOAL EXECUTION DEDUP =====================
const inflightExecutions = new Set<string>();
let goalExecutionLock = false;

// ===================== MAIN WINDOW REF =====================

let currentMainWindow: BrowserWindow | null = null;


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
  const wsUrl = deriveWsUrl(cloudUrl);
  const socket = io(`${wsUrl}/ws/runtime`, {
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
    sendStatusToRenderer(currentMainWindow, 'connected');

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
      sendStatusToRenderer(currentMainWindow, 'connected', `Session ${runtimeStatus.sessionId} active`);
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
    sendStatusToRenderer(currentMainWindow, 'disconnected', reason);
  });

  // ------ connect_error (reconnection in progress) ------
  socket.on('connect_error', (error) => {
    reconnectionAttempt++;
    runtimeStatus.status = 'reconnecting';
    const delay = getReconnectDelay(reconnectionAttempt, INITIAL_RECONNECT_DELAY, MAX_RECONNECT_DELAY);
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
    sendStatusToRenderer(currentMainWindow, 'reconnecting', `Attempt ${reconnectionAttempt}...`);
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
    const commandType = data?.type || data?.data?.type || 'unknown';
    cmdlog.log('CMD', `brain:command received | type: ${commandType} | execution: ${data?.data?.execution_id || data?.execution_id || 'none'}`);
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
  // v0.3.50: deduplicate by execution_id to prevent concurrent handlers on the same BrowserView
  socket.on('goal_execute', async (data) => {
    const executionId = data?.execution_id || data?.id || '';

    // Deduplicate: if this execution is already being processed, skip silently
    if (executionId && inflightExecutions.has(executionId)) {
      cmdlog.log('CMD', `goal_execute skipped (duplicate) | execution=${cmdlog.truncate(String(executionId), 8, 4)}`);
      return;
    }

    // General concurrency lock: only one goal_execute at a time
    if (goalExecutionLock) {
      cmdlog.log('CMD', 'goal_execute queued (lock held, will process next)');
      // We don't queue — the cloud will retry. Dedup by execution_id handles the common case.
    }

    if (executionId) {
      inflightExecutions.add(executionId);
    }
    goalExecutionLock = true;

    try {
      // If no vendor_id, try to match a runtime vendor from goal text so the enrichment
      // functions can pull credentials and startGoal below. v0.3.47:
      // bridges cloud-originated bare goals with the desktop's paired vendor config.
      let goalData = data;
      if (!data.vendor_id && !data.vendorId && !data.inputs?.vendor_id && !data.inputs?.vendorId) {
        const matchedVendor = findMatchingVendorFromGoal(data.goal || '');
        if (matchedVendor) {
          goalData = { ...data, vendor_id: matchedVendor.id };
        }
      }
      const enrichedData = enrichGoalExecuteDataFromRuntimeVendor(goalData);
      cmdlog.log('CMD', `goal_execute received | ${summarizeGoalExecuteData(enrichedData)}`);
      log.info('[Main] Received goal from cloud:', { execution_id: enrichedData.execution_id, goalLength: String(enrichedData.goal || '').length });
      const bridge = await getAutoBrowseBridge();
      if (!bridge.isAutoBrowseInitialized()) {
        socket.emit('goal:result', {
          execution_id: enrichedData.execution_id, status: 'failed',
          goal_status: 'failed', error: 'AutoBrowse not initialized',
        });
        return;
      }
      try {
        // v0.3.50: deduplication ensures single execution — create the Goal Execution BrowserView
        // v0.3.51: removed redundant second ensureBrowserViewForGoalExecution call (ensureActiveGoalTab already calls it)
        ensureActiveGoalTab(tabManager, bridge);
        const enrichedInputs = enrichCloudGoalInputsFromRuntimeVendor(goalData, goalData.inputs) || enrichedData.inputs;
        Object.assign(enrichedInputs, { ...(enrichedData.inputs || {}), ...(enrichedInputs || {}) });
        enrichedData.inputs = enrichedInputs;
        const enrichedGoalData = {
          execution_id: enrichedData.execution_id, goal: enrichedData.goal,
          inputs: enrichedInputs, constraints: enrichedData.constraints,
        };
        const result = await bridge.executeGoal(enrichedGoalData);
        cmdlog.log('CMD', `goal_execute result: execution=${enrichedData.execution_id || 'none'} | status=${result.status} | goal_status=${result.goal_status} | steps=${result.steps?.length ?? 0}`);
        socket.emit('goal:result', {
          execution_id: enrichedData.execution_id, status: result.status,
          goal_status: result.goal_status, steps: result.steps,
          duration: result.duration, artifacts: result.artifacts,
        });
        currentMainWindow?.webContents.send('brain:command', {
          type: 'goal_result', payload: result,
          execution_id: enrichedData.execution_id, timestamp: new Date().toISOString(),
        });
      } catch (error) {
        log.error('[Main] Goal execution failed:', error);
        cmdlog.log('ERR', `goal_execute failed | execution=${enrichedData.execution_id || 'none'} | error=${String(error)}`);
        socket.emit('goal:result', {
          execution_id: enrichedData.execution_id, status: 'failed',
          goal_status: 'failed', error: String(error),
        });
      }
    } finally {
      if (executionId) {
        inflightExecutions.delete(executionId);
      }
      goalExecutionLock = false;
    }
  });
}


/**
 * Create the agent WebSocket (secondary channel for agent commands).
 * Uses the same reconnection config as the device socket.
 */
function createAgentSocket(cloudUrl: string, token: string): Socket {
  const wsUrl = deriveWsUrl(cloudUrl);
  const socket = io(`${wsUrl}/agent`, {
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
  sendStatusToRenderer(currentMainWindow, 'connecting');
  eventLogger.info('connection', 'connecting', { cloudUrl });

  cmdlog.log('WS', `→ Connecting WebSockets | cloud: ${cloudUrl} | device: ${cmdlog.truncate(runtimeStatus.deviceId, 8, 4)} | token: ${cmdlog.truncate(token, 16, 0)} | transports: [websocket, polling]`);

  deviceSocket = createDeviceSocket(cloudUrl, token, tabManager, getAutoBrowseBridge, onConnected);
  agentSocket = createAgentSocket(cloudUrl, token);

  // Fetch RPA provider config from cloud (non-blocking)
  fetchRpaConfig(cloudUrl, token).catch((err) =>
    log.warn('[RpaProvider] Failed to fetch config:', err),
  );
}

/**
 * Fetch the RPA provider config for this device and apply it.
 */
async function fetchRpaConfig(cloudUrl: string, token: string): Promise<void> {
  const deviceId = runtimeStatus.deviceId;
  if (!deviceId) {
    log.warn('[RpaProvider] No device ID, using default config');
    return;
  }
  const url = `${cloudUrl}/api/devices/${encodeURIComponent(deviceId)}/rpa-config`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    log.warn(`[RpaProvider] Config fetch failed (${res.status}), using defaults`);
    return;
  }
  const config = await res.json();
  setRpaProviderConfig(config);
  log.info(`[RpaProvider] Config loaded from cloud: chain=[${config.chain?.join(', ') || 'default'}]`);
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

// Re-export from command polling module
export { setupCommandPolling } from './cloud-command-polling.js';
export { getCurrentCall } from './call-handler.js';
