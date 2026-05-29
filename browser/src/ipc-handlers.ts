import { ipcMain, app, session, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log';
import { webrtcInjector } from './webrtc-injector.js';
import { mediaLayer } from './media/media-layer.js';
import { transcriptMonitor } from './media/transcript-monitor.js';
import { eventLogger } from './media/event-logger.js';
import { runtimeStatus, mainWindow, setDebugMode } from './runtime-state.js';
import { getDeviceSocket, connectWebSockets, setupCommandPolling } from './cloud-connection.js';
import { getStartupLogPath, getMainLogPath, getLogsDir, getInstallDir } from './logger.js';
import type { TabManager } from './tab-manager.js';

// ===================== MEDIA LAYER WRAPPER =====================

export const mediaLayerWrapper = {
  initialize: async () => {
    eventLogger.info('media', 'initialize', {});
    return mediaLayer.initialize();
  },
  getCallStatus: () => mediaLayer.getCallStatus(),
  startCall: async (sessionId?: string) => {
    eventLogger.info('media', 'call_start', { sessionId });
    await mediaLayer.startCall(sessionId);
    transcriptMonitor.setMediaLayer(mediaLayer);
    transcriptMonitor.startMonitoring();
    eventLogger.info('media', 'call_started', { sessionId });
    return { success: true };
  },
  stopCall: async () => {
    eventLogger.info('media', 'call_stop', {});
    await mediaLayer.stopCall();
    transcriptMonitor.stopMonitoring();
    eventLogger.info('media', 'call_stopped', {});
    return { success: true };
  },
  speak: async (text: string, interruptible?: boolean) => {
    eventLogger.debug('media', 'tts_speak', { textLength: text.length, interruptible });
    return mediaLayer.speak(text, interruptible);
  },
  stopSpeaking: async () => mediaLayer.stopSpeaking(),
  mute: () => {
    eventLogger.info('media', 'mute', {});
    mediaLayer.mute();
  },
  unmute: () => {
    eventLogger.info('media', 'unmute', {});
    mediaLayer.unmute();
  },
  hold: async () => {
    eventLogger.info('media', 'hold', {});
    return mediaLayer.hold();
  },
  resume: async () => {
    eventLogger.info('media', 'resume', {});
    return mediaLayer.resume();
  },
  on: (event: string, callback: any) => mediaLayer.on(event, callback),
  emit: (event: string, data?: any) => mediaLayer.emit(event, data),
};

/**
 * Lazy-loaded auto-browse bridge (cached after first import).
 */
let autobrowseBridge: typeof import('./autobrowse-bridge.js') | null = null;

async function getAutoBrowseBridge() {
  if (!autobrowseBridge) {
    autobrowseBridge = await import('./autobrowse-bridge.js');
  }
  return autobrowseBridge;
}

// ===================== VENDOR LOGIN =====================

const vendorLoginState = {
  isLoggingIn: false,
  vendorId: null as string | null,
};

const bootstrappedVendorIds = new Set<string>();
let bootstrappedTeamId: string | null = null;

function decrypt(text: string): string {
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
    return text;
  }
}

async function autoLoginToVendor(vendor: any, tabManager: TabManager): Promise<boolean> {
  if (vendorLoginState.isLoggingIn || !vendor.baseUrl) {
    log.warn('[Vendor] Skipping login - already logging in or no baseUrl');
    return false;
  }

  vendorLoginState.isLoggingIn = true;
  vendorLoginState.vendorId = vendor.id;

  try {
    const username = vendor.username ? decrypt(vendor.username) : null;
    const password = vendor.password ? decrypt(vendor.password) : null;
    const apiKey = vendor.apiKey ? decrypt(vendor.apiKey) : null;

    log.info('[Vendor] Auto-login to:', vendor.name, vendor.baseUrl);

    // Create NEW TAB for vendor instead of replacing main window
    tabManager.createTab(vendor.name, vendor.baseUrl);

    const bridge = await getAutoBrowseBridge();
    if (!bridge.isAutoBrowseInitialized()) {
      log.error('[Vendor] AutoBrowse not initialized, cannot login');
      return false;
    }

    // Wait for tab to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    let loginGoal = '';
    if (username && password) {
      loginGoal = `Login to ${vendor.name} with username "${username}" and password "${password}"`;
    } else if (apiKey) {
      loginGoal = `Login to ${vendor.name} using API key`;
    }

    if (!loginGoal) {
      log.warn('[Vendor] No login credentials available for:', vendor.name);
      return false;
    }

    log.info('[Vendor] Executing login goal:', loginGoal);
    const result = await bridge.executeGoal({
      execution_id: `vendor-login-${Date.now()}`,
      goal: loginGoal,
      inputs: { username, password, apiKey },
      constraints: { max_steps: 20, timeout_ms: 60000 },
    });

    log.info('[Vendor] Login result:', result.goal_status);
    mainWindow?.webContents.send('vendor:login', {
      vendorId: vendor.id,
      vendorName: vendor.name,
      status: result.goal_status,
      timestamp: new Date().toISOString(),
    });
    return result.goal_status === 'success';
  } catch (error) {
    log.error('[Vendor] Auto-login error:', error);
    return false;
  } finally {
    vendorLoginState.isLoggingIn = false;
  }
}

export async function bootstrapTeamVendors(tabManager: TabManager): Promise<void> {
  const teamId = runtimeStatus.teamId;
  if (!teamId) {
    log.info('[Vendor] No team loaded yet; skipping vendor bootstrap');
    return;
  }

  if (bootstrappedTeamId !== teamId) {
    bootstrappedVendorIds.clear();
    bootstrappedTeamId = teamId;
  }

  let vendors = Array.isArray(runtimeStatus.vendors) ? [...runtimeStatus.vendors] : [];

  try {
    const response = await fetch(`${runtimeStatus.cloudUrl}/api/crud/vendors/${teamId}`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        vendors = data;
        runtimeStatus.vendors = data;
        log.info('[Vendor] Loaded vendors from cloud:', data.length);
      }
    } else {
      log.warn('[Vendor] Vendor query failed:', response.status, response.statusText);
    }
  } catch (error) {
    log.warn('[Vendor] Vendor query errored; falling back to launch payload vendors:', error);
  }

  const runnableVendors = vendors.filter((vendor: any) => vendor?.id && vendor?.baseUrl && vendor.isActive !== false);
  if (runnableVendors.length === 0) {
    log.info('[Vendor] No runnable vendors found for team:', teamId);
    return;
  }

  log.info('[Vendor] Bootstrapping vendor connections for team:', teamId, 'count:', runnableVendors.length);
  for (const vendor of runnableVendors) {
    if (bootstrappedVendorIds.has(vendor.id)) {
      continue;
    }
    const success = await autoLoginToVendor(vendor, tabManager);
    if (success) {
      bootstrappedVendorIds.add(vendor.id);
    }
  }
}

// ===================== ESCALATION =====================

function showEscalation(type: 'trigger' | 'failure', data: {
  triggerWord?: string;
  message: string;
  step?: string;
  retryCount?: number;
  transcript?: string;
}) {
  log.warn('[Escalation]', type, data);
  eventLogger.warn('escalation', `escalation_${type}`, { type, ...data });

  if (mainWindow) {
    mainWindow.webContents.send('escalation:show', { type, data });
  }

  // If via WebSocket, emit to brain
  const deviceSocket = getDeviceSocket();
  if (deviceSocket && deviceSocket.connected) {
    deviceSocket.emit('escalation:alert', {
      type,
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}

function checkEscalationTriggers(text: string): boolean {
  const lowerText = text.toLowerCase();
  for (const trigger of runtimeStatus.escalationTriggers) {
    if (lowerText.includes(trigger.toLowerCase())) {
      return true;
    }
  }
  return false;
}

// ===================== AUTO-BROWSE ENGINE =====================

async function initializeAutoBrowseEngine(): Promise<void> {
  const bridge = await getAutoBrowseBridge();
  if (bridge.isAutoBrowseInitialized()) {
    log.info('[Main] AutoBrowse engine already initialized');
    return;
  }

  try {
    const electronSession = session.defaultSession;
    if (!electronSession) {
      throw new Error('Default session not available');
    }

    const electronSessionData = {
      defaultSession: {
        debuggerWebSocketUrl: process.env.CDP_URL || 'ws://localhost:9222',
      },
    };

    await bridge.initializeAutoBrowse(electronSessionData as any);
    log.info('[Main] AutoBrowse engine initialized successfully');
  } catch (error) {
    log.error('[Main] Failed to initialize AutoBrowse:', error);
    throw error;
  }
}

// ===================== IPC HANDLER REGISTRATION =====================

export function registerIpcHandlers(tabManager: TabManager): void {
  const INSTALL_DIR = getInstallDir();

  // --- Device Info ---
  ipcMain.handle('device:getInfo', async () => ({
    deviceId: runtimeStatus.deviceId,
    version: app.getVersion(),
    platform: process.platform,
    osRelease: `${process.platform} ${process.arch}`,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    logsDir: getLogsDir(),
    mainLogPath: getMainLogPath(),
    startupLogPath: getStartupLogPath(),
  }));

  // --- Runtime Status ---
  ipcMain.handle('runtime:getStatus', async () => ({
    status: runtimeStatus.status,
    connected: runtimeStatus.status === 'connected',
    deviceId: runtimeStatus.deviceId,
    sessionId: runtimeStatus.sessionId,
    cloudUrl: runtimeStatus.cloudUrl,
    keledonId: runtimeStatus.keledonId,
    pendingKeledonId: runtimeStatus.pendingKeledonId,
    teamId: runtimeStatus.teamId,
    teamName: runtimeStatus.teamName,
    vendorCount: runtimeStatus.vendors.length,
    diagnostics: { ...runtimeStatus.diagnostics },
  }));

  // --- Runtime Connect ---
  ipcMain.handle('runtime:connect', async (_event, config: { cloudUrl: string; token: string; keledonId?: string }) => {
    // Prevent duplicate connection — deep-link.ts already paired & connected
    if (runtimeStatus.authToken && (runtimeStatus.status === 'connected' || runtimeStatus.status === 'connecting')) {
      log.info('[Runtime] Already connected/connecting, skipping duplicate connect');
      runtimeStatus.status = 'connected';
      return { success: true, alreadyConnected: true };
    }
    log.info('Connecting to cloud:', config.cloudUrl);
    eventLogger.info('runtime', 'connect_start', { cloudUrl: config.cloudUrl, keledonId: config.keledonId });

    runtimeStatus.status = 'connecting';
    runtimeStatus.cloudUrl = config.cloudUrl;
    runtimeStatus.diagnostics.lastAutoConnectStatus = 'not_attempted';
    runtimeStatus.diagnostics.lastAutoConnectHttpStatus = null;
    runtimeStatus.diagnostics.lastAutoConnectError = null;

    try {
      const response = await fetch(`${config.cloudUrl}/api/devices/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: runtimeStatus.deviceId,
          machine_id: runtimeStatus.deviceId,
          pairing_code: config.token,
          platform: process.platform,
          name: 'KELEDON Desktop Agent',
          keledon_id: config.keledonId || null,
        }),
      });

      runtimeStatus.diagnostics.lastAutoConnectHttpStatus = response.status;

      if (response.ok) {
        const data = await response.json();

        // Cloud controller returns HTTP 200 with { error: '...' } on failure
        if (data.error) {
          runtimeStatus.diagnostics.lastAutoConnectStatus = 'pair_error';
          runtimeStatus.diagnostics.lastAutoConnectError = data.error;
          throw new Error(data.error);
        }

        runtimeStatus.status = 'connected';
        runtimeStatus.authToken = data.auth_token;
        runtimeStatus.deviceId = data.device_id;  // Use the server's DB UUID for WebSocket auth
        runtimeStatus.sessionId = data.keledon_id || null;
        runtimeStatus.keledonId = data.keledon_id || null;
        runtimeStatus.teamId = data.team?.id || null;
        eventLogger.info('runtime', 'connect_success', { keledonId: data.keledon_id, teamId: data.team?.id });
        runtimeStatus.teamName = data.team?.name || null;
        runtimeStatus.vendors = data.vendors || [];
        runtimeStatus.escalationTriggers = data.team?.escalationTriggers || [];
        runtimeStatus.diagnostics.lastAutoConnectStatus = 'ok';
        runtimeStatus.diagnostics.lastAutoConnectError = null;
        transcriptMonitor.setTriggers(runtimeStatus.escalationTriggers);
        log.info('Connected to cloud, keledon_id:', data.keledon_id);

        connectWebSockets(
          config.cloudUrl,
          data.auth_token,
          runtimeStatus,
          tabManager,
          mainWindow,
          getAutoBrowseBridge,
          () => bootstrapTeamVendors(tabManager),
        );

        try {
          await mediaLayerWrapper.initialize();
        } catch (e) {
          console.warn('[Main] mediaLayer.initialize skipped:', e);
        }

        // Phase 6: Start command polling after WebSocket connection
        setupCommandPolling(mainWindow);

        return { success: true, deviceId: runtimeStatus.deviceId };
      } else {
        runtimeStatus.diagnostics.lastAutoConnectStatus = 'http_error';
        runtimeStatus.diagnostics.lastAutoConnectError = `HTTP ${response.status}`;
        throw new Error(`Cloud connection failed: ${response.status}`);
      }
    } catch (error) {
      runtimeStatus.status = 'disconnected';
      if (runtimeStatus.diagnostics.lastAutoConnectStatus !== 'http_error' &&
          runtimeStatus.diagnostics.lastAutoConnectStatus !== 'pair_error') {
        runtimeStatus.diagnostics.lastAutoConnectStatus = 'exception';
        runtimeStatus.diagnostics.lastAutoConnectError = String(error instanceof Error ? error.message : error);
      }
      log.error('Cloud connection error:', error);
      return { success: false, error: String(error) };
    }
  });

  // --- Runtime Disconnect ---
  ipcMain.handle('runtime:disconnect', async () => {
    runtimeStatus.status = 'disconnected';
    const deviceSocket = getDeviceSocket();
    if (runtimeStatus.sessionId && deviceSocket) {
      deviceSocket.emit('session:end');
    }
    runtimeStatus.sessionId = null;
    return { success: true };
  });

  // --- Runtime Start Session ---
  ipcMain.handle('runtime:startSession', async (_event, sessionId: string, teamId?: string) => {
    runtimeStatus.sessionId = sessionId;
    const deviceSocket = getDeviceSocket();
    if (deviceSocket?.connected) {
      deviceSocket.emit('session:start', {
        session_id: sessionId,
        team_id: teamId || 'default-team',
      });
      log.info('Session started:', sessionId);
      return { success: true, sessionId };
    }
    return { success: false, error: 'Not connected to cloud' };
  });

  // --- Executor: Execute Goal ---
  ipcMain.handle('executor:executeGoal', async (_event, goal: any, context?: Record<string, unknown>) => {
    const normalizedGoal = typeof goal === 'string'
      ? goal
      : goal?.objective || goal?.goal || '';
    if (!normalizedGoal) {
      return { error: 'Goal is required' };
    }

    log.info('Executing goal:', normalizedGoal);
    const bridge = await getAutoBrowseBridge();
    if (!bridge.isAutoBrowseInitialized()) {
      return { error: 'AutoBrowse not initialized' };
    }

    // Ensure there's a BrowserView available for execution
    const currentTabId = tabManager.getActiveTabId();
    const currentTabs = tabManager.getInternalTabs();
    const hasView = currentTabs.some(t => t.id === currentTabId && t.view !== null);
    if (!hasView) {
      log.info('[Main] No active BrowserView — creating a new tab for goal execution');
      const newTab = tabManager.createTab('Goal Execution', 'about:blank');
      if (newTab.view) {
        tabManager.setActiveTabId(newTab.id);
        tabManager.showTab(newTab.id);
        // Sync tabs to bridge directly (avoids race with broadcastTabs async import)
        bridge.setTabs(tabManager.getInternalTabs(), tabManager.getActiveTabId());
      }
    }

    try {
      const goalInput = {
        execution_id: typeof goal === 'string' ? `exec-${Date.now()}` : goal.execution_id || `exec-${Date.now()}`,
        goal: normalizedGoal,
        inputs: typeof goal === 'string' ? context : goal.inputs || context,
        constraints: {
          max_steps: typeof goal === 'string' ? undefined : goal.max_steps || goal.constraints?.max_steps,
          timeout_ms: typeof goal === 'string' ? undefined : goal.timeout_ms || goal.constraints?.timeout_ms,
        },
        success_criteria: typeof goal === 'string' ? undefined : goal.success_criteria,
      };
      const result = await bridge.executeGoal(goalInput);
      log.info('Goal execution completed:', result.goal_status);
      return result;
    } catch (error) {
      log.error('Goal execution failed:', error);
      return {
        execution_id: `exec-${Date.now()}`,
        goal: normalizedGoal,
        goal_status: 'failed',
        steps: [],
        duration: 0,
        artifacts: { screenshots: [], logs: [] },
        error: String(error),
      };
    }
  });

  // --- Executor: Execute Steps ---
  ipcMain.handle('executor:executeSteps', async (_event, steps: unknown[]) => {
    log.info('Executing steps:', steps.length);
    const bridge = await getAutoBrowseBridge();
    if (!bridge.isAutoBrowseInitialized()) {
      return { error: 'AutoBrowse not initialized' };
    }
    try {
      return await bridge.executeSteps(steps as any[]);
    } catch (error) {
      return { error: String(error) };
    }
  });

  // --- Executor: Get Screenshot ---
  ipcMain.handle('executor:getScreenshot', async () => {
    const bridge = await getAutoBrowseBridge();
    if (!bridge.isAutoBrowseInitialized()) {
      return { error: 'AutoBrowse not initialized' };
    }
    try {
      const screenshot = await bridge.captureScreenshot();
      return { screenshot };
    } catch (error) {
      return { error: String(error) };
    }
  });

  // --- Evidence: Get Logs ---
  ipcMain.handle('evidence:getLogs', async () => {
    const parts: string[] = [];
    const startupPath = getStartupLogPath();
    const mainPath = getMainLogPath();
    if (fs.existsSync(startupPath)) {
      parts.push('=== STARTUP LOG ===\n');
      parts.push(fs.readFileSync(startupPath, 'utf-8'));
    }
    if (fs.existsSync(mainPath)) {
      parts.push('\n=== RUNTIME LOG ===\n');
      parts.push(fs.readFileSync(mainPath, 'utf-8'));
    }
    return { logs: parts.join('') || 'No logs found', logPath: getLogsDir() };
  });

  // --- Evidence: Copy All Logs ---
  ipcMain.handle('evidence:copyAllLogs', async () => {
    const parts: string[] = [
      `KELEDON Browser Log Dump`,
      `Time: ${new Date().toISOString()}`,
      `Version: ${app.getVersion()}`,
      `Install: ${INSTALL_DIR}`,
      `\n`,
    ];
    const startupPath = getStartupLogPath();
    const mainPath = getMainLogPath();
    if (fs.existsSync(startupPath)) {
      parts.push('=== STARTUP LOG ===\n');
      parts.push(fs.readFileSync(startupPath, 'utf-8'));
    }
    if (fs.existsSync(mainPath)) {
      parts.push('\n=== RUNTIME LOG ===\n');
      parts.push(fs.readFileSync(mainPath, 'utf-8'));
    }
    try {
      const logsDir = getLogsDir();
      const crashFiles = fs.readdirSync(logsDir).filter(f => f.startsWith('crash-'));
      for (const cf of crashFiles.slice(-3)) {
        parts.push(`\n=== ${cf} ===\n`);
        parts.push(fs.readFileSync(path.join(logsDir, cf), 'utf-8'));
      }
    } catch (_) {}
    return { logs: parts.join('') };
  });

  // --- Evidence: Event Logs ---
  ipcMain.handle('evidence:getEventLogs', async (_event, filter?: { level?: string; category?: string; limit?: number }) => {
    const logs = eventLogger.getLogs(filter as any);
    const stats = eventLogger.getStats();
    return { logs, stats };
  });

  ipcMain.handle('evidence:clearEventLogs', async () => {
    eventLogger.clear();
    return { success: true };
  });

  ipcMain.handle('evidence:getLogCategories', async () => {
    return { categories: eventLogger.getCategories() };
  });

  ipcMain.handle('evidence:getScreenshots', async () => {
    return { screenshots: [] };
  });

  // --- Media: Start Call ---
  ipcMain.handle('media:startCall', async (_event, sessionId: string) => {
    try {
      await mediaLayerWrapper.startCall(sessionId);
      runtimeStatus.sessionId = sessionId;
      return { success: true, sessionId };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // --- Media: Stop Call ---
  ipcMain.handle('media:stopCall', async () => {
    try {
      await mediaLayerWrapper.stopCall();
      runtimeStatus.sessionId = null;
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // --- Media: Speak ---
  ipcMain.handle('media:speak', async (_event, text: string, interruptible: boolean = true) => {
    try {
      await mediaLayerWrapper.speak(text, interruptible);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // --- Media: Stop Speaking ---
  ipcMain.handle('media:stopSpeaking', async () => {
    try {
      await mediaLayerWrapper.stopSpeaking();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // --- Media: Get Status ---
  ipcMain.handle('media:getStatus', async () => {
    return mediaLayerWrapper.getCallStatus();
  });

  // --- Media: Mute ---
  ipcMain.handle('media:mute', async () => {
    mediaLayerWrapper.mute();
    return { success: true };
  });

  // --- Media: Unmute ---
  ipcMain.handle('media:unmute', async () => {
    mediaLayerWrapper.unmute();
    return { success: true };
  });

  // --- Media: Hold ---
  ipcMain.handle('media:hold', async () => {
    try {
      await mediaLayerWrapper.hold();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // --- Media: Resume ---
  ipcMain.handle('media:resume', async () => {
    try {
      await mediaLayerWrapper.resume();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // --- Media: Hangup ---
  ipcMain.handle('media:hangup', async () => {
    try {
      await mediaLayer.stopCall();
      runtimeStatus.sessionId = null;
      const deviceSocket = getDeviceSocket();
      if (deviceSocket) {
        deviceSocket.emit('session:end');
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // --- Brain: Set Debug Mode ---
  ipcMain.handle('brain:setDebugMode', async (_event, enabled: boolean) => {
    setDebugMode(enabled);
    return { success: true };
  });

  // --- Escalation: Action (handle) ---
  ipcMain.handle('escalation:action', async (_event, action: 'continue' | 'fix' | 'abort', data?: any) => {
    log.info('[Escalation] Action:', action);

    if (action === 'continue') {
      log.info('[Escalation] Continuing session');
      return { success: true, action: 'continue' };
    } else if (action === 'fix') {
      log.info('[Escalation] Fix requested');
      return { success: true, action: 'fix' };
    } else if (action === 'abort') {
      log.info('[Escalation] Aborting session');
      await mediaLayerWrapper.stopCall();
      const deviceSocket = getDeviceSocket();
      if (deviceSocket && deviceSocket.connected) {
        deviceSocket.emit('escalation:abort', {
          reason: data?.reason || 'manual_abort',
          timestamp: new Date().toISOString(),
        });
      }
      return { success: true, action: 'abort' };
    }

    return { success: false };
  });

  // --- Escalation: Action (on) ---
  ipcMain.on('escalation:action', (_event, action: string, data?: any) => {
    log.info('[Escalation] User action:', action, data);
    const deviceSocket = getDeviceSocket();
    if (deviceSocket && deviceSocket.connected) {
      deviceSocket.emit('escalation:response', {
        action,
        data,
        timestamp: new Date().toISOString(),
      });
    }
    mainWindow?.webContents.send('escalation:handled', { action, data });
  });

  // --- Tabs: Create ---
  ipcMain.handle('tabs:create', async (_event, name: string, url: string) => {
    const tab = tabManager.createTab(name, url);
    return { id: tab.id, name: tab.name, url: tab.url };
  });

  // --- Tabs: List ---
  ipcMain.handle('tabs:list', async () => {
    return tabManager.getTabs();
  });

  // --- Tabs: Switch ---
  ipcMain.handle('tabs:switch', async (_event, tabId: string) => {
    tabManager.showTab(tabId);
    return { success: true };
  });

  // --- Tabs: Close ---
  ipcMain.handle('tabs:close', async (_event, tabId: string) => {
    tabManager.closeTab(tabId);
    return { success: true };
  });

  // --- Tabs: Get Active ---
  ipcMain.handle('tabs:getActive', async () => {
    return tabManager.getActiveTabId();
  });

  // --- Tabs: Navigate ---
  ipcMain.handle('tabs:navigate', async (_event, url: string) => {
    const activeTabId = tabManager.getActiveTabId();
    const tabs = tabManager.getInternalTabs();
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab?.view) {
      tab.url = url;
      tab.view.webContents.loadURL(url);
      tabManager.broadcastTabs();
      return { success: true };
    }
    return { success: false };
  });

  // --- Tabs: Go Back ---
  ipcMain.handle('tabs:goBack', async () => {
    const activeTabId = tabManager.getActiveTabId();
    const tabs = tabManager.getInternalTabs();
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab?.view && tab.view.webContents.canGoBack()) {
      tab.view.webContents.goBack();
      return { success: true };
    }
    return { success: false };
  });

  // --- Tabs: Go Forward ---
  ipcMain.handle('tabs:goForward', async () => {
    const activeTabId = tabManager.getActiveTabId();
    const tabs = tabManager.getInternalTabs();
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab?.view && tab.view.webContents.canGoForward()) {
      tab.view.webContents.goForward();
      return { success: true };
    }
    return { success: false };
  });

  // --- Tabs: Reload ---
  ipcMain.handle('tabs:reload', async () => {
    const activeTabId = tabManager.getActiveTabId();
    const tabs = tabManager.getInternalTabs();
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab?.view) {
      tab.view.webContents.reload();
      return { success: true };
    }
    return { success: false };
  });

  // --- Tabs: Get URL ---
  ipcMain.handle('tabs:getUrl', async () => {
    const activeTabId = tabManager.getActiveTabId();
    const tabs = tabManager.getInternalTabs();
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab?.view) {
      return { url: tab.view.webContents.getURL(), title: tab.view.webContents.getTitle() };
    }
    return { url: '', title: '' };
  });

  // --- Executor: Get CDP URL ---
  ipcMain.handle('executor:getCDPUrl', async () => {
    if (!mainWindow) return '';
    const wc = mainWindow.webContents;
    if (!wc) return '';
    const debugUrl = (session as any).defaultSession?.debuggerWebSocketUrl;
    return debugUrl || '';
  });

  // --- Executor: Get URL ---
  ipcMain.handle('executor:getUrl', async () => {
    const activeTabId = tabManager.getActiveTabId();
    const tabs = tabManager.getInternalTabs();
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab?.view) {
      return tab.view.webContents.getURL();
    }
    if (mainWindow) {
      return mainWindow.webContents.getURL();
    }
    return '';
  });

  // --- WebRTC: Arm ---
  ipcMain.handle('webrtc:arm', async (_event, tabId: string) => {
    const tabs = tabManager.getInternalTabs();
    const activeTabId = tabManager.getActiveTabId();
    const tab = tabs.find(t => t.id === tabId) || tabs.find(t => t.id === activeTabId);
    if (!tab?.view) {
      return { success: false, error: 'No active BrowserView tab found' };
    }
    const sessionId = runtimeStatus.sessionId || `inject_${Date.now()}`;
    const result = await webrtcInjector.arm(tab.view.webContents, sessionId, true);
    log.info(`[WebRTC] Arm result for tab ${tabId}: ${JSON.stringify(result)}`);
    return result;
  });

  // --- WebRTC: Inject Audio ---
  ipcMain.handle('webrtc:inject-audio', async (_event, audioBase64: string) => {
    const tabs = tabManager.getInternalTabs();
    const activeTabId = tabManager.getActiveTabId();
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab?.view) return { success: false, error: 'No active tab' };
    await webrtcInjector.injectAudio(tab.view.webContents, audioBase64);
    return { success: true };
  });

  // --- WebRTC: Disarm ---
  ipcMain.handle('webrtc:disarm', async (_event, tabId?: string) => {
    const tabs = tabManager.getInternalTabs();
    const activeTabId = tabManager.getActiveTabId();
    const tab = tabs.find(t => t.id === (tabId || activeTabId));
    if (!tab?.view) return { success: false, error: 'No active tab' };
    await webrtcInjector.disarm(tab.view.webContents);
    return { success: true };
  });

  // --- WebRTC: Status ---
  ipcMain.handle('webrtc:status', async () => {
    const tabs = tabManager.getInternalTabs();
    const activeTabId = tabManager.getActiveTabId();
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab?.view) return { armed: false };
    return { armed: webrtcInjector.isArmed(tab.view.webContents.id) };
  });

  // ===================== MEDIA LAYER EVENT FORWARDING =====================

  mediaLayer.on('transcript', (text: string, isFinal: boolean) => {
    eventLogger.debug('media', isFinal ? 'transcript_final' : 'transcript_interim', {
      textLength: text.length,
      isFinal,
    });
    mainWindow?.webContents.send('media:transcript', {
      text,
      isFinal,
      timestamp: new Date().toISOString(),
    });
  });

  mediaLayer.on('call-status', (status: 'idle' | 'in-call' | 'on-hold') => {
    eventLogger.info('media', 'call_status_change', { status });
    mainWindow?.webContents.send('media:callStatus', {
      status,
      ...mediaLayerWrapper.getCallStatus(),
    });
  });

  mediaLayer.on('error', (error: Error) => {
    eventLogger.error('media', 'media_error', {
      message: error.message,
      stack: error.stack,
    });
  });

  mediaLayer.on('media:transcript', (data) => {
    mainWindow?.webContents.send('media:transcript', data);
  });

  mediaLayer.on('call:started', (data) => {
    mainWindow?.webContents.send('call:started', data);
  });

  mediaLayer.on('call:ended', (data) => {
    mainWindow?.webContents.send('call:ended', data);
  });

  mediaLayer.on('media:error', (data) => {
    mainWindow?.webContents.send('media:error', data);
  });
}

// ===================== EXPORTS =====================

export { autoLoginToVendor, initializeAutoBrowseEngine, showEscalation, getAutoBrowseBridge };
