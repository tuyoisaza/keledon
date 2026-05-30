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

function buildWsCtx(cloudUrl: string, token: string): string {
  return `ws=${deriveWsUrl(cloudUrl)}/ws/runtime token=${cmdlog.truncate(token, 16, 0)} device=${cmdlog.truncate(runtimeStatus.deviceId, 8, 4)}`;
}

/**
 * Derive the WebSocket API URL from the cloudUrl. WebSocket connections go
 * directly to the API service instead of through the nginx proxy.
 */
function deriveWsUrl(cloudUrl: string): string {
  try {
    const u = new URL(cloudUrl);
    if (u.hostname === 'keledon.tuyoisaza.com') {
      return `https://keledonapi.tuyoisaza.com`;
    }
  } catch { /* fall through */ }
  return cloudUrl;
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

function decryptRuntimeVendorValue(text: string): string {
  try {
    const crypto = require('crypto');
    const ENCRYPTION_KEY = process.env.KELEDON_VENDOR_KEY || 'keledon-vendor-secret-key-32!';
    const [ivHex, encrypted] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    // Preserve legacy behavior from ipc-handlers.ts: if the value is already plain text,
    // return it unchanged. Command Activity Log never prints this raw value.
    return text;
  }
}

function enrichGoalExecuteDataFromRuntimeVendor(data: any): any {
  const enriched = { ...(data || {}) };
  const inputs = { ...(enriched.inputs || {}) };
  const vendorId = enriched.vendor_id || enriched.vendorId || inputs.vendor_id || inputs.vendorId;
  if (!vendorId || !Array.isArray(runtimeStatus.vendors)) {
    enriched.inputs = Object.keys(inputs).length > 0 ? inputs : enriched.inputs;
    return enriched;
  }

  const vendor = runtimeStatus.vendors.find((candidate: any) => candidate?.id === vendorId);
  if (!vendor) {
    enriched.inputs = Object.keys(inputs).length > 0 ? inputs : enriched.inputs;
    cmdlog.log('CMD', `goal_execute vendor enrichment skipped | vendor_id=${cmdlog.truncate(String(vendorId), 8, 4)} | reason=runtime vendor not found`);
    return enriched;
  }

  // Direct WebSocket goal_execute bypasses ipc-handlers.ts, so repeat the same local-only
  // credential enrichment here. The cloud command carries only vendor_id; the desktop's
  // pairing payload is the trusted source for URL and encrypted credentials.
  if (vendor.baseUrl && !inputs.url && !inputs.targetUrl) {
    inputs.url = vendor.baseUrl;
    inputs.targetUrl = vendor.baseUrl;
  }
  if (vendor.username && !inputs.username && !inputs.email && !inputs.login) {
    const username = decryptRuntimeVendorValue(vendor.username);
    inputs.username = username;
    inputs.email = username;
    inputs.login = username;
  }
  if (vendor.password && !inputs.password) {
    inputs.password = decryptRuntimeVendorValue(vendor.password);
  }
  if (vendor.apiKey && !inputs.apiKey) {
    inputs.apiKey = decryptRuntimeVendorValue(vendor.apiKey);
  }

  enriched.inputs = inputs;
  enriched.goal = vendor.startGoal || enriched.goal;
  cmdlog.log('CMD', `goal_execute vendor enrichment | vendor_id=${cmdlog.truncate(String(vendorId), 8, 4)} | url_present=${inputs.url ? 'yes' : 'no'} | username_present=${inputs.username ? 'yes' : 'no'} | password_present=${inputs.password ? 'yes' : 'no'} | startGoal_present=${vendor.startGoal ? 'yes' : 'no'}`);
  return enriched;
}

function summarizeGoalExecuteData(data: any): string {
  const inputs = data?.inputs || {};
  return `execution=${data?.execution_id || 'none'} | goal_len=${String(data?.goal || '').length} | vendor_id=${cmdlog.truncate(String(data?.vendor_id || data?.vendorId || inputs.vendor_id || inputs.vendorId || ''), 8, 4)} | url_present=${inputs.url || inputs.targetUrl ? 'yes' : 'no'} | username_present=${inputs.username || inputs.email || inputs.login ? 'yes' : 'no'} | password_present=${inputs.password ? 'yes' : 'no'}`;
}

function ensureBrowserViewForGoalExecution(tabManager: TabManager, bridge: any): void {
  const currentTabId = tabManager.getActiveTabId();
  const currentTabs = tabManager.getInternalTabs();
  const hasView = currentTabs.some((tab) => tab.id === currentTabId && tab.view !== null);
  if (hasView) {
    bridge.setTabs(tabManager.getInternalTabs(), tabManager.getActiveTabId());
    return;
  }

  cmdlog.log('CMD', 'goal_execute preparing BrowserView | active tab has no view, creating Goal Execution tab');
  const newTab = tabManager.createTab('Goal Execution', 'about:blank');
  if (newTab.view) {
    tabManager.setActiveTabId(newTab.id);
    tabManager.showTab(newTab.id);
  }
  bridge.setTabs(tabManager.getInternalTabs(), tabManager.getActiveTabId());
}

function ensureActiveGoalTab(tabManager: TabManager, bridge: any): void {
  ensureBrowserViewForGoalExecution(tabManager, bridge);
}

/**
 * Calculate exponential backoff delay for reconnection.
 * Sequence: 1s → 2s → 4s → 8s → 16s → 30s (capped)
 */
function getReconnectDelay(): number {
  const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectionAttempt);
  return Math.min(delay, MAX_RECONNECT_DELAY);
}

function decryptRuntimeVendorSecret(text: string): string {
  try {
    const encryptionKey = process.env.KELEDON_VENDOR_KEY || 'keledon-vendor-secret-key-32!';
    const [ivHex, encrypted] = String(text).split(':');
    if (!ivHex || !encrypted) return text;
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return text;
  }
}

function enrichCloudGoalInputsFromRuntimeVendor(goal: any, baseInputs: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  const inputs = { ...(baseInputs || {}) };
  const vendorId = goal?.vendor_id || goal?.vendorId || goal?.metadata?.vendor_id || goal?.metadata?.vendorId || inputs.vendor_id || inputs.vendorId;
  if (!vendorId || !Array.isArray(runtimeStatus.vendors)) {
    return Object.keys(inputs).length > 0 ? inputs : baseInputs;
  }

  const vendor = runtimeStatus.vendors.find((candidate: any) => candidate?.id === vendorId);
  if (!vendor) {
    cmdlog.log('CMD', `goal_execute vendor credentials unavailable | vendor_id: ${cmdlog.truncate(String(vendorId), 8, 4)} | vendors_loaded: ${runtimeStatus.vendors.length}`);
    return Object.keys(inputs).length > 0 ? inputs : baseInputs;
  }

  // Direct Socket.IO goal_execute commands intentionally carry only vendor_id. The desktop
  // already has the encrypted runtime vendor payload from pairing/bootstrap, so enrich here
  // before AutoBrowse plans the goal. Do not log raw decrypted values.
  if (vendor.username && !inputs.username && !inputs.email && !inputs.login) {
    const username = decryptRuntimeVendorSecret(vendor.username);
    inputs.username = username;
    inputs.email = username;
    inputs.login = username;
  }
  if (vendor.password && !inputs.password) {
    inputs.password = decryptRuntimeVendorSecret(vendor.password);
  }
  if (vendor.apiKey && !inputs.apiKey) {
    inputs.apiKey = decryptRuntimeVendorSecret(vendor.apiKey);
  }

  cmdlog.log('CMD', `goal_execute enriched runtime vendor inputs | vendor_id: ${cmdlog.truncate(String(vendorId), 8, 4)} | keys: ${Object.keys(inputs).sort().join(',') || 'none'}`);
  return Object.keys(inputs).length > 0 ? inputs : baseInputs;
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
  // goal_execute → AutoBrowse bridge
  socket.on('goal_execute', async (data) => {
    const enrichedData = enrichGoalExecuteDataFromRuntimeVendor(data);
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
      ensureActiveGoalTab(tabManager, bridge);
      ensureBrowserViewForGoalExecution(tabManager, bridge);
      const enrichedInputs = enrichCloudGoalInputsFromRuntimeVendor(data, data.inputs) || enrichedData.inputs;
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
  sendStatusToRenderer('connecting');
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
