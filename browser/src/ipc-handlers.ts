import { ipcMain, app, session, BrowserWindow, Notification as ElectronNotification } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log';
import { webrtcInjector } from './webrtc-injector.js';
import { mediaLayerWrapper } from './ipc-media-handlers.js';
import { transcriptMonitor } from './media/transcript-monitor.js';
import { eventLogger } from './media/event-logger.js';
import { runtimeStatus, mainWindow, setDebugMode } from './runtime-state.js';
import { getDeviceSocket, connectWebSockets, setupCommandPolling } from './cloud-connection.js';
import { getStartupLogPath, getMainLogPath, getLogsDir, getInstallDir } from './logger.js';
import type { TabManager } from './tab-manager.js';
import {
  vendorLoginState,
  bootstrappedVendorIds,
  bootstrappedTeamId,
  setBootstrappedTeamId,
  mergeRuntimeVendorCredentials,
  logVendorLogin,
} from './ipc-vendor-state.js';
import { enrichGoalInputsFromRuntimeVendor, autoLoginToVendor, bootstrapTeamVendors } from './ipc-vendor-login.js';
import { showEscalation, checkEscalationTriggers } from './ipc-escalation.js';
import { getAutoBrowseBridge, initializeAutoBrowseEngine } from './ipc-bridge.js';
import { registerEvidenceIpcHandlers } from './ipc-evidence-handlers.js';
import { registerMediaIpcHandlers } from './ipc-media-handlers.js';

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
          console.warn('[Main] mediaLayerWrapper.initialize skipped:', e);
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
      const providedInputs = typeof goal === 'string' ? context : goal.inputs || context;
      const goalInput = {
        execution_id: typeof goal === 'string' ? `exec-${Date.now()}` : goal.execution_id || `exec-${Date.now()}`,
        goal: normalizedGoal,
        inputs: typeof goal === 'string' ? providedInputs : enrichGoalInputsFromRuntimeVendor(goal, providedInputs),
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

  // --- Executor: Abort Current Goal ---
  ipcMain.on('executor:abortGoal', () => {
    log.info('Aborting current goal execution');
    getAutoBrowseBridge().then(bridge => {
      bridge.abortCurrentExecution();
    }).catch(err => {
      log.error('Failed to abort goal:', err);
    });
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

  // --- Tabs: Chrome Overlay State ---
  // BrowserView is a native child view that draws above renderer DOM, so CSS z-index
  // cannot lift KELEDON controls over a loaded page. The renderer reports when
  // first-party overlays are open and the main process moves/detaches the active
  // BrowserView so settings, command logs, and other KELEDON browser features stay visible.
  ipcMain.handle('tabs:setChromeOverlayState', async (_event, state: { rightInset?: number; hideContent?: boolean; reason?: string }) => {
    tabManager.setChromeOverlayState(state || {});
    return { success: true };
  });

  // --- Tabs: DevTools toggle ---
  ipcMain.handle('tabs:openDevTools', async () => {
    tabManager.openDevTools();
    return { success: true };
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

  // --- Command Log ---
  ipcMain.handle('cmdlog:getLog', async () => {
    const { getLog } = await import('./cmdlog.js');
    return getLog();
  });

  ipcMain.handle('cmdlog:clearLog', async () => {
    const { clearLog } = await import('./cmdlog.js');
    clearLog();
    return { cleared: true };
  });

  // --- Notifications: Forward page Notification API to native OS notifications ---
  ipcMain.on('show-notification', (_event, data: { title: string; body?: string; icon?: string; silent?: boolean }) => {
    try {
      const notif = new ElectronNotification({
        title: data.title || 'KELEDON',
        body: data.body || '',
        silent: data.silent ?? false,
      });
      notif.on('click', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        }
      });
      notif.show();
    } catch (e) {
      log.error('[Notifications] Failed to show notification:', e);
    }
  });

  // ===================== MEDIA LAYER EVENT FORWARDING =====================

  mediaLayerWrapper.on('transcript', (text: string, isFinal: boolean) => {
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

  mediaLayerWrapper.on('call-status', (status: 'idle' | 'in-call' | 'on-hold') => {
    eventLogger.info('media', 'call_status_change', { status });
    mainWindow?.webContents.send('media:callStatus', {
      status,
      ...mediaLayerWrapper.getCallStatus(),
    });
  });

  mediaLayerWrapper.on('error', (error: Error) => {
    eventLogger.error('media', 'media_error', {
      message: error.message,
      stack: error.stack,
    });
  });

  mediaLayerWrapper.on('media:transcript', (data) => {
    mainWindow?.webContents.send('media:transcript', data);
  });

  mediaLayerWrapper.on('call:started', (data) => {
    mainWindow?.webContents.send('call:started', data);
  });

  mediaLayerWrapper.on('call:ended', (data) => {
    mainWindow?.webContents.send('call:ended', data);
  });

  mediaLayerWrapper.on('media:error', (data) => {
    mainWindow?.webContents.send('media:error', data);
  });

  registerEvidenceIpcHandlers(
    getStartupLogPath,
    getMainLogPath,
    getLogsDir,
    INSTALL_DIR,
    eventLogger,
  );
  registerMediaIpcHandlers(ipcMain, runtimeStatus, getDeviceSocket);
}

// ===================== EXPORTS =====================

export { autoLoginToVendor, bootstrapTeamVendors } from './ipc-vendor-login.js';
export { showEscalation, checkEscalationTriggers } from './ipc-escalation.js';
export { initializeAutoBrowseEngine, getAutoBrowseBridge } from './ipc-bridge.js';
