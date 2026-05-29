import { app, BrowserWindow, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import log from 'electron-log';
import { autoUpdater } from 'electron-updater';

import { earlyLog, writeCrashLog, getLogsDir, getMainLogPath, getStartupLogPath } from './logger.js';
import { runtimeStatus, mainWindow, setMainWindow } from './runtime-state.js';
import { TabManager } from './tab-manager.js';
import { connectWebSockets, setupCommandPolling } from './cloud-connection.js';
import { handleDeepLink, flushPendingDeepLinkLaunch } from './deep-link.js';
import { registerIpcHandlers, bootstrapTeamVendors, initializeAutoBrowseEngine, getAutoBrowseBridge } from './ipc-handlers.js';
import { transcriptMonitor } from './media/transcript-monitor.js';

// ===================== TAB MANAGER =====================
const tabManager = new TabManager();

// ===================== STARTUP =====================
earlyLog('========================================');
earlyLog('[START] KELEDON Browser starting...');
earlyLog(`[INFO] App packaged: ${app.isPackaged}`);
earlyLog(`[INFO] Exec path: ${process.execPath}`);
earlyLog(`[INFO] Args: ${JSON.stringify(process.argv)}`);
earlyLog(`[INFO] Electron: ${process.versions.electron}`);
earlyLog(`[INFO] Chrome: ${process.versions.chrome}`);
earlyLog(`[INFO] Node: ${process.versions.node}`);
earlyLog(`[INFO] OS: ${os.platform()} ${os.release()} ${os.arch()}`);
earlyLog(`[INFO] Memory: ${Math.round(os.freemem() / 1024 / 1024)}MB free / ${Math.round(os.totalmem() / 1024 / 1024)}MB total`);
earlyLog(`[INFO] CPU: ${os.cpus()[0]?.model || 'unknown'} (${os.cpus().length} cores)`);

// ===================== PROCESS ERROR HANDLING =====================
process.on('uncaughtException', (error) => {
  earlyLog(`[FATAL] Uncaught Exception: ${error.message}`);
  earlyLog(error.stack || 'No stack');
  writeCrashLog(error);
  app.exit(1);
});

process.on('unhandledRejection', (reason) => {
  earlyLog(`[FATAL] Unhandled Rejection: ${reason}`);
  writeCrashLog(reason instanceof Error ? reason : new Error(String(reason)));
});

// ===================== PROTOCOL + CDP =====================
const registerProtocol = () => {
  try {
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('keledon', process.execPath, [path.resolve(process.argv[1])]);
      }
    } else { app.setAsDefaultProtocolClient('keledon'); }
    log.info('[DeepLink] Protocol registered');
  } catch (error) { log.error('[DeepLink] Failed to register protocol:', error); }
};
registerProtocol();

const CDP_PORT = parseInt(process.env.KELEDON_CDP_PORT || '9222', 10);
app.commandLine.appendSwitch('remote-debugging-port', String(CDP_PORT));
earlyLog(`[CDP] Debug port enabled on ${CDP_PORT}`);

app.whenReady().then(() => { registerProtocol(); });

// ===================== SINGLE INSTANCE =====================
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) { app.quit(); }
else {
  app.on('second-instance', (_event, commandLine) => {
    const url = commandLine.find(arg => arg.startsWith('keledon://'));
    if (url) { handleDeepLink(url, tabManager); }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ===================== WINDOW =====================
async function autoConnect(): Promise<void> {
  const AUTO_CONNECT = process.env.AUTO_CONNECT === 'true';
  const AUTO_PAIRING_CODE = process.env.PAIRING_CODE || '';
  if (!AUTO_CONNECT || !AUTO_PAIRING_CODE) return;
  log.info('Auto-connecting to cloud...');
  try {
    const res = await fetch(`${runtimeStatus.cloudUrl}/api/devices/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: runtimeStatus.deviceId, machine_id: runtimeStatus.deviceId,
        pairing_code: AUTO_PAIRING_CODE, platform: process.platform,
        name: 'KELEDON Desktop Agent', keledon_id: process.env.KELECTRON_KELEDON_ID || null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      runtimeStatus.status = 'connected';
      runtimeStatus.authToken = data.auth_token;
      runtimeStatus.deviceId = data.device_id;  // Use server's DB UUID for WebSocket auth
      runtimeStatus.sessionId = data.keledon_id || null;
      runtimeStatus.keledonId = data.keledon_id || null;
      runtimeStatus.teamId = data.team?.id || null;
      runtimeStatus.teamName = data.team?.name || null;
      runtimeStatus.vendors = data.vendors || [];
      runtimeStatus.escalationTriggers = data.team?.escalationTriggers || [];
      transcriptMonitor.setTriggers(runtimeStatus.escalationTriggers);
      log.info('Auto-connect successful, keledon_id:', data.keledon_id);
      connectWebSockets(
        runtimeStatus.cloudUrl,
        data.auth_token,
        runtimeStatus,
        tabManager,
        mainWindow,
        getAutoBrowseBridge,
        () => bootstrapTeamVendors(tabManager),
      );
      // Phase 6: Start command polling after WebSocket connection
      setupCommandPolling(mainWindow);
      runtimeStatus.vendors = data.vendors || [];
      const AUTO_SESSION_ID = process.env.SESSION_ID || '';
      if (AUTO_SESSION_ID) { runtimeStatus.sessionId = AUTO_SESSION_ID; log.info('Auto-join session:', AUTO_SESSION_ID); }
    } else { log.error('Auto-connect failed:', res.status); }
  } catch (error) { log.error('Auto-connect error:', error); }
}

function createWindow(): void {
  const displays = screen.getAllDisplays();
  earlyLog(`[WINDOW] Creating main window...`);

  const win = new BrowserWindow({
    width: 1200, height: 800, minWidth: 800, minHeight: 600,
    title: 'KELEDON Browser', backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false, webSecurity: false,
    },
  });

  setMainWindow(win);
  tabManager.setMainWindow(win);
  win.webContents.setVisualZoomLevelLimits(1, 4);
  win.webContents.setZoomLevel(0);

  win.webContents.setWindowOpenHandler(({ url }) => {
    tabManager.createTab('New Tab', url);
    return { action: 'deny' };
  });

  (async () => {
    const bridge = await getAutoBrowseBridge();
    bridge.setMainWindow(win);
    bridge.setTabs(tabManager.getInternalTabs(), tabManager.getActiveTabId());
  })();

  log.transports.file.resolvePathFn = () => getMainLogPath();

  const rendererPath = path.join(__dirname, '../renderer/index.html');
  win.loadFile(rendererPath);

  // Renderer lifecycle
  win.webContents.on('did-finish-load', () => {
    earlyLog('[WINDOW] did-finish-load — renderer loaded successfully');
    log.info('Main window loaded');
    const logPathEscaped = getStartupLogPath().replace(/\\\\/g, '\\\\\\\\');
    win.webContents.executeJavaScript(`
      window.keledon = window.keledon || {};
      window.keledon.internal = {
        cdpUrl: 'http://localhost:9222',
        version: '${app.getVersion()}',
        logPath: '${logPathEscaped}',
        startupLogPath: '${logPathEscaped}',
        mainLogPath: '${getMainLogPath().replace(/\\\\/g, '\\\\\\\\')}',
        logsDir: '${getLogsDir().replace(/\\\\/g, '\\\\\\\\')}',
        installDir: '${getLogsDir().replace(/\\\\/g, '\\\\\\\\')}'
      };
    `).catch(err => earlyLog(`[WINDOW] Failed to inject runtime info: ${err}`));
    flushPendingDeepLinkLaunch();
    console.log('Keledon Browser v' + app.getVersion() + ' ready');
    autoConnect();
  });

  win.webContents.on('did-fail-load', (_event, ec, desc, url) => {
    earlyLog(`[WINDOW] did-fail-load — errorCode=${ec} desc="${desc}" url="${url}"`);
    writeCrashLog(new Error(`Renderer failed to load: ${ec} ${desc} (${url})`));
  });
  win.webContents.on('render-process-gone', (_event, details) => {
    earlyLog(`[WINDOW] render-process-gone — reason=${details.reason} exitCode=${details.exitCode}`);
    writeCrashLog(new Error(`Renderer process gone: reason=${details.reason} exitCode=${details.exitCode}`));
  });
  app.on('gpu-process-crashed' as any, (_event: any, killed: boolean) => {
    earlyLog(`[GPU] GPU process crashed! killed=${killed}`);
    writeCrashLog(new Error(`GPU process crashed (killed=${killed})`));
  });
  win.on('closed', () => { setMainWindow(null); });
  win.on('resize', () => { tabManager.resizeTabs(); });

  // Keyboard shortcuts
  win.webContents.on('before-input-event', (_event, input) => {
    if (input.type !== 'keyDown') return;
    const ctrl = input.control || input.meta;
    if (ctrl && input.key === 't') { win.webContents.send('shortcut:newTab'); }
    if (ctrl && input.key === 'w' && tabManager.getActiveTabId() !== 'home') { tabManager.closeTab(tabManager.getActiveTabId()); }
    if (ctrl && input.key === 'Tab') {
      const tabs = tabManager.getInternalTabs();
      const idx = tabs.findIndex(t => t.id === tabManager.getActiveTabId());
      if (idx >= 0 && tabs.length > 0) { tabManager.showTab(tabs[(idx + 1) % tabs.length].id); }
    }
    if (input.key === 'F5') {
      const tabs = tabManager.getInternalTabs();
      const tab = tabs.find(t => t.id === tabManager.getActiveTabId());
      if (tab?.view) { tab.view.webContents.reload(); }
    }
    if (ctrl && input.key === 'l') { win.webContents.send('shortcut:focusUrlBar'); }
    if (ctrl && input.key === 'f') { win.webContents.send('shortcut:findInPage'); }
  });
}

// ===================== APP LIFECYCLE =====================
log.initialize();
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('KELEDON Desktop Agent starting...');

app.on('ready', async () => {
  createWindow();
  registerIpcHandlers(tabManager);

  try { await initializeAutoBrowseEngine(); log.info('[Main] AutoBrowse initialized via bridge'); }
  catch (error) { log.warn('AutoBrowse CDP connection failed:', error); }

  const deepLinkArg = process.argv.find(arg => arg.startsWith('keledon://'));
  if (deepLinkArg) { handleDeepLink(deepLinkArg, tabManager); }

  autoUpdater.logger = log;
  autoUpdater.checkForUpdatesAndNotify().catch(err => log.warn('[AutoUpdater] Check for updates failed:', err));

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => {
  const { disconnectSockets } = require('./cloud-connection.js');
  disconnectSockets();
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  const { disconnectSockets } = require('./cloud-connection.js');
  disconnectSockets();
});

log.info('KELEDON Desktop Agent main process initialized');
