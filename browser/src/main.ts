import { app, BrowserWindow, BrowserView, ipcMain, session, protocol, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import log from 'electron-log';
import { io, Socket } from 'socket.io-client';
import { autoUpdater } from 'electron-updater';

// === DIAGNOSTIC LOGGING SYSTEM ===
// Writes to {install_dir}/logs/ so logs are always findable
// even when the browser shows a black screen or no window

const getInstallPath = (): string => {
  if (app.isPackaged) {
    return path.dirname(process.execPath);
  }
  return process.cwd();
};

const INSTALL_DIR = getInstallPath();
// Use userData for logs (always writable, unlike Program Files)
const LOGS_DIR = path.join(app.getPath('userData'), 'logs');
const STARTUP_LOG = path.join(LOGS_DIR, 'startup.log');
const MAIN_LOG = path.join(LOGS_DIR, 'keledon-browser.log');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 5;

// Ensure logs directory exists
try {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
} catch (e) {
  // Last resort — try AppData
  // But install_dir/logs/ is the canonical location per v3_KELEDON_BROWSER.md
}

// Log rotation: rename old logs when size exceeds MAX_LOG_SIZE
const rotateLog = (logPath: string): void => {
  try {
    if (!fs.existsSync(logPath)) return;
    const stats = fs.statSync(logPath);
    if (stats.size < MAX_LOG_SIZE) return;

    // Shift existing rotated files: .4 -> delete, .3 -> .4, .2 -> .3, .1 -> .2
    for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
      const older = `${logPath}.${i}`;
      const newer = i === 1 ? logPath : `${logPath}.${i - 1}`;
      if (fs.existsSync(newer)) {
        if (i === MAX_LOG_FILES - 1 && fs.existsSync(older)) {
          fs.unlinkSync(older);
        }
        fs.renameSync(newer, `${logPath}.${i}`);
      }
    }
  } catch (e) {
    // Rotation failed — continue writing to current file
  }
};

// Early log — writes to startup.log before Electron is ready
const earlyLog = (msg: string): void => {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${msg}\n`;
  try {
    rotateLog(STARTUP_LOG);
    fs.appendFileSync(STARTUP_LOG, logLine);
  } catch (e) {
    // Cannot write to install dir — try fallback
    try {
      fs.appendFileSync(path.join(os.tmpdir(), 'keledon-startup.log'), logLine);
    } catch (_) { /* truly cannot log */ }
  }
  console.log(logLine.trimEnd());
};

// Write crash log with full system state
const writeCrashLog = (error: Error | string): void => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const crashFile = path.join(LOGS_DIR, `crash-${timestamp}.log`);
  const errorStr = error instanceof Error
    ? `${error.message}\n\nStack:\n${error.stack || 'No stack'}`
    : String(error);

  const crashContent = [
    `KELEDON Browser Crash Report`,
    `Time: ${new Date().toISOString()}`,
    `Version: ${app.getVersion?.() || 'unknown'}`,
    `Electron: ${process.versions.electron || 'unknown'}`,
    `Chrome: ${process.versions.chrome || 'unknown'}`,
    `Node: ${process.versions.node || 'unknown'}`,
    `OS: ${os.platform()} ${os.release()} ${os.arch()}`,
    `Memory: ${Math.round(os.freemem() / 1024 / 1024)}MB free / ${Math.round(os.totalmem() / 1024 / 1024)}MB total`,
    `Uptime: ${Math.round(process.uptime())}s`,
    `Args: ${JSON.stringify(process.argv)}`,
    ``,
    `Error:`,
    errorStr,
  ].join('\n');

  try {
    fs.writeFileSync(crashFile, crashContent);
    earlyLog(`[CRASH] Crash log written to ${crashFile}`);
  } catch (e) {
    earlyLog(`[CRASH] Failed to write crash log: ${e}`);
  }
};

// Catch all unhandled errors — write crash log
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

// === STARTUP LOGGING ===
earlyLog('========================================');
earlyLog('[START] KELEDON Browser starting...');
earlyLog(`[INFO] App packaged: ${app.isPackaged}`);
earlyLog(`[INFO] Exec path: ${process.execPath}`);
earlyLog(`[INFO] Install path: ${INSTALL_DIR}`);
earlyLog(`[INFO] Logs directory: ${LOGS_DIR}`);
earlyLog(`[INFO] Args: ${JSON.stringify(process.argv)}`);
earlyLog(`[INFO] Electron: ${process.versions.electron}`);
earlyLog(`[INFO] Chrome: ${process.versions.chrome}`);
earlyLog(`[INFO] Node: ${process.versions.node}`);
earlyLog(`[INFO] OS: ${os.platform()} ${os.release()} ${os.arch()}`);
earlyLog(`[INFO] Memory: ${Math.round(os.freemem() / 1024 / 1024)}MB free / ${Math.round(os.totalmem() / 1024 / 1024)}MB total`);
earlyLog(`[INFO] CPU: ${os.cpus()[0]?.model || 'unknown'} (${os.cpus().length} cores)`);

// Register keledon:// protocol - try multiple times
const registerProtocol = () => {
  try {
    if (process.defaultApp) {
      if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('keledon', process.execPath, [path.resolve(process.argv[1])]);
      }
    } else {
      app.setAsDefaultProtocolClient('keledon');
    }
    log.info('[DeepLink] Protocol registered');
  } catch (error) {
    log.error('[DeepLink] Failed to register protocol:', error);
  }
};

// Try to register protocol
registerProtocol();

// Enable CDP debug port for Playwright/AutoBrowse automation
const CDP_PORT = parseInt(process.env.KELEDON_CDP_PORT || '9222', 10);
app.commandLine.appendSwitch('remote-debugging-port', String(CDP_PORT));
earlyLog(`[CDP] Debug port enabled on ${CDP_PORT}`);

// Also register when app is ready
app.whenReady().then(() => {
  registerProtocol();
});

// Handle deep link on Windows/Linux
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    const url = commandLine.find(arg => arg.startsWith('keledon://'));
    if (url) {
      handleDeepLink(url);
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function handleDeepLink(url: string) {
  log.info('[DeepLink] Received:', url);
  try {
    const parsed = new URL(url);
    const action = parsed.hostname;
    
    // Handle test deep links
    if (action === 'test') {
      const instructions = parsed.searchParams.get('instructions') || 'No instructions provided';
      const timestamp = parsed.searchParams.get('timestamp') || Date.now().toString();
      log.info('[DeepLink] TEST mode received at', timestamp);
      log.info('[DeepLink] Instructions:', instructions);
      
      // Send to renderer
      if (mainWindow) {
        mainWindow.webContents.send('keledon:launch', { 
          keledonId: 'test',
          code: timestamp,
          cloudUrl: 'https://keledon.tuyoisaza.com',
          action: 'test',
          instructions 
        });
      }
      return;
    }
    
    // Handle launch deep links
    const keledonId = parsed.searchParams.get('keledonId');
    const code = parsed.searchParams.get('code');
    const userId = parsed.searchParams.get('userId');
    const timestamp = parsed.searchParams.get('timestamp');
    const signature = parsed.searchParams.get('signature');
    const cloudUrl = parsed.searchParams.get('cloudUrl') || 'https://keledon.tuyoisaza.com';

    if (!keledonId || !code || !userId || !timestamp || !signature) {
      log.error('[DeepLink] Missing required params');
      return;
    }

    // Validate timestamp (max 60 seconds old)
    const linkTime = parseInt(timestamp);
    const now = Date.now();
    if (now - linkTime > 60000) {
      log.error('[DeepLink] Link expired');
      return;
    }

    // Validate signature
    const payload = `${keledonId}:${userId}:${timestamp}`;
    const expectedSignature = crypto.createHmac('sha256', process.env.KELEDON_LAUNCH_SECRET || 'keledon-default-secret')
      .update(payload)
      .digest('hex')
      .substring(0, 16);

    if (signature !== expectedSignature) {
      log.error('[DeepLink] Invalid signature');
      return;
    }

    log.info('[DeepLink] Valid launch request for keledon:', keledonId);
    log.info('[DeepLink] Cloud URL:', cloudUrl);
    log.info('[DeepLink] Pairing code:', code);

    // Auto-connect with the pairing code
    runtimeStatus.pendingKeledonId = keledonId;
    runtimeStatus.pendingPairingCode = code;
    
    // Trigger auto-connect with all data
    if (mainWindow) {
      mainWindow.webContents.send('keledon:launch', { 
        keledonId, 
        code,
        cloudUrl,
        action: 'auto-connect'
      });
    }

    // Also trigger immediate auto-connect
    (async () => {
      try {
        const response = await fetch(`${runtimeStatus.cloudUrl}/api/devices/pair`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: runtimeStatus.deviceId,
            machine_id: runtimeStatus.deviceId,
            pairing_code: code,
            platform: process.platform,
            name: 'KELEDON Desktop Agent',
            keledon_id: keledonId
          })
        });

        if (response.ok) {
          const data = await response.json();
          runtimeStatus.status = 'connected';
          runtimeStatus.authToken = data.auth_token;
          runtimeStatus.sessionId = data.keledon_id || null;
          runtimeStatus.keledonId = data.keledon_id || null;
          runtimeStatus.teamId = data.team?.id || null;
          runtimeStatus.teamName = data.team?.name || null;
          runtimeStatus.vendors = data.vendors || [];
          runtimeStatus.escalationTriggers = data.team?.escalationTriggers || [];
          log.info('[DeepLink] Auto-connect successful, keledon_id:', data.keledon_id);
          log.info('[DeepLink] Team:', data.team?.name, 'Vendors:', data.vendors?.length, 'EscalationTriggers:', runtimeStatus.escalationTriggers.length);

          connectWebSockets(runtimeStatus.cloudUrl, data.auth_token);

          if (data.vendors?.length > 0) {
            autoLoginToVendor(data.vendors[0]);
          }
        } else {
          log.error('[DeepLink] Auto-connect failed:', response.status);
        }
      } catch (error) {
        log.error('[DeepLink] Auto-connect error:', error);
      }
    })();
  } catch (error) {
    log.error('[DeepLink] Error parsing URL:', error);
  }
}

// Extend runtimeStatus for pending launch
let autobrowseBridge: typeof import('./autobrowse-bridge.js') | null = null;

async function getAutoBrowseBridge() {
  if (!autobrowseBridge) {
    autobrowseBridge = await import('./autobrowse-bridge.js');
  }
  return autobrowseBridge;
}

import { mediaLayer } from './media/media-layer.js';
import { transcriptMonitor } from './media/transcript-monitor.js';
import { eventLogger } from './media/event-logger.js';

const mediaLayerWrapper = {
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
  emit: (event: string, data?: any) => mediaLayer.emit(event, data)
};

let autoBrowseExecutor: any = null;
let StructuredGoal: any = null;

let deviceSocket: Socket | null = null;
let agentSocket: Socket | null = null;
let debugMode = false;

const vendorLoginState = {
  isLoggingIn: false,
  vendorId: null as string | null
};

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

async function autoLoginToVendor(vendor: any) {
  if (vendorLoginState.isLoggingIn || !vendor.baseUrl) {
    log.warn('[Vendor] Skipping login - already logging in or no baseUrl');
    return;
  }

  vendorLoginState.isLoggingIn = true;
  vendorLoginState.vendorId = vendor.id;

  try {
    const username = vendor.username ? decrypt(vendor.username) : null;
    const password = vendor.password ? decrypt(vendor.password) : null;
    const apiKey = vendor.apiKey ? decrypt(vendor.apiKey) : null;

    log.info('[Vendor] Auto-login to:', vendor.name, vendor.baseUrl);

    // Create NEW TAB for vendor instead of replacing main window
    createTab(vendor.name, vendor.baseUrl);

    const bridge = await getAutoBrowseBridge();
    if (!bridge.isAutoBrowseInitialized()) {
      log.error('[Vendor] AutoBrowse not initialized, cannot login');
      return;
    }

    // Wait for tab to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    let loginGoal = '';
    if (username && password) {
      loginGoal = `Login to ${vendor.name} with username "${username}" and password "${password}"`;
    } else if (apiKey) {
      loginGoal = `Login to ${vendor.name} using API key`;
    }

    if (loginGoal) {
      log.info('[Vendor] Executing login goal:', loginGoal);
      const result = await bridge.executeGoal({
        execution_id: `vendor-login-${Date.now()}`,
        goal: loginGoal,
        inputs: { username, password, apiKey },
        constraints: { max_steps: 20, timeout_ms: 60000 }
      });

      log.info('[Vendor] Login result:', result.goal_status);
      mainWindow?.webContents.send('vendor:login', {
        vendorId: vendor.id,
        vendorName: vendor.name,
        status: result.goal_status,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    log.error('[Vendor] Auto-login error:', error);
  } finally {
    vendorLoginState.isLoggingIn = false;
  }
}

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
        debuggerWebSocketUrl: process.env.CDP_URL || 'ws://localhost:9222'
      }
    };

    await bridge.initializeAutoBrowse(electronSessionData as any);
    log.info('[Main] AutoBrowse engine initialized successfully');
  } catch (error) {
    log.error('[Main] Failed to initialize AutoBrowse:', error);
    throw error;
  }
}

log.initialize();
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

log.info('KELEDON Desktop Agent starting...');

let mainWindow: BrowserWindow | null = null;
let mainWebContents: Electron.WebContents | null = null;

// Tab management
interface Tab {
  id: string;
  name: string;
  url: string;
  view: Electron.BrowserView | null;
}
let tabs: Tab[] = [];
let activeTabId: string = 'home';
const HOME_URL = 'file://' + path.join(__dirname, '../renderer/index.html');

let runtimeStatus = {
  status: 'idle' as 'idle' | 'connecting' | 'connected' | 'disconnected',
  deviceId: process.env.KELEDON_DEVICE_ID || `device-${Date.now()}`,
  cloudUrl: process.env.CLOUD_URL || 'https://keledon.tuyoisaza.com',
  sessionId: null as string | null,
  authToken: null as string | null,
  pendingKeledonId: null as string | null,
  pendingPairingCode: null as string | null,
  teamId: null as string | null,
  teamName: null as string | null,
  vendors: [] as any[],
  keledonId: null as string | null,
  escalationTriggers: [] as string[]
};

const AUTO_CONNECT = process.env.AUTO_CONNECT === 'true';
const AUTO_PAIRING_CODE = process.env.PAIRING_CODE || '';
const AUTO_SESSION_ID = process.env.SESSION_ID || '';
const KELECTRON_KELEDON_ID = process.env.KELECTRON_KELEDON_ID || '';

// Initialize transcript monitor with empty triggers initially
transcriptMonitor.setTriggers(runtimeStatus.escalationTriggers);

// Listen for escalation events from transcript monitor
transcriptMonitor.on('escalation', (match) => {
  eventLogger.warn('escalation', 'keyword_detected', { trigger: match.trigger, transcript: match.transcript });
  
  showEscalation('trigger', {
    triggerWord: match.trigger,
    message: `Detected escalation keyword: "${match.trigger}"`,
    transcript: match.transcript
  });
  
  // Send to cloud
  if (deviceSocket && deviceSocket.connected) {
    deviceSocket.emit('escalation:trigger', {
      trigger: match.trigger,
      transcript: match.transcript,
      timestamp: match.timestamp
    });
    eventLogger.info('escalation', 'escalation_sent_to_cloud', { trigger: match.trigger });
  }
});

// ========== ESCALATION FUNCTIONS ==========
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
  if (deviceSocket && deviceSocket.connected) {
    deviceSocket.emit('escalation:alert', {
      type,
      ...data,
      timestamp: new Date().toISOString()
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

// ========== TAB MANAGEMENT ==========
// Chrome-like: height of tab bar (38px) + nav bar (42px) = 80px
const CHROME_HEIGHT = 80;

function createTab(name: string, url: string): Tab {
  const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  eventLogger.info('tabs', 'tab_create', { id, name, url });
  
  if (!mainWindow) {
    return { id, name, url, view: null };
  }

  const view = new BrowserView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false
    }
  });

  // Wire up webContents events so the renderer stays in sync
  view.webContents.on('did-navigate', (_event: Electron.Event, navigatedUrl: string) => {
    // Update the tab's stored URL
    const tab = tabs.find(t => t.id === id);
    if (tab) {
      tab.url = navigatedUrl;
    }
    // Update the URL bar in renderer
    mainWindow?.webContents.send('tabs:updated', getTabs());
    // Sync to AutoBrowse bridge
    broadcastTabs();
    log.info(`[Tabs] did-navigate: ${id} -> ${navigatedUrl}`);
  });

  view.webContents.on('page-title-updated', (_event: Electron.Event, title: string) => {
    // Update the tab name in the tab bar
    const tab = tabs.find(t => t.id === id);
    if (tab) {
      tab.name = title || name;
    }
    mainWindow?.webContents.send('tabs:updated', getTabs());
    log.info(`[Tabs] page-title-updated: ${id} -> ${title}`);
  });

  view.webContents.on('did-start-loading', () => {
    mainWindow?.webContents.send('tabs:updated', getTabs());
  });

  view.webContents.on('did-stop-loading', () => {
    mainWindow?.webContents.send('tabs:updated', getTabs());
  });

  view.webContents.on('did-fail-load', (_event: Electron.Event, errorCode: number, errorDesc: string, validatedURL: string) => {
    if (errorCode !== -3) { // -3 is ERR_ABORTED, common during redirects
      log.warn(`[Tabs] did-fail-load: ${id} error=${errorCode} desc=${errorDesc} url=${validatedURL}`);
    }
    mainWindow?.webContents.send('tabs:updated', getTabs());
  });

  // Intercept new-window requests from BrowserView (links with target="_blank")
  view.webContents.setWindowOpenHandler(({ url }) => {
    createTab('New Tab', url);
    return { action: 'deny' };
  });

  view.webContents.loadURL(url);
  
  const tab: Tab = { id, name, url, view };
  tabs.push(tab);
  eventLogger.info('tabs', 'tab_created', { id, name, url });
  
  if (activeTabId === 'home' || !tabs.find(t => t.id === activeTabId)) {
    activeTabId = id;
    showTab(id);
  }

  log.info('[Tabs] Created tab:', name, id);
  broadcastTabs();

  return tab;
}

function showTab(tabId: string) {
  if (!mainWindow) return;

  // Remove current BrowserView first
  const currentView = mainWindow.getBrowserView();
  if (currentView) {
    try { mainWindow.removeBrowserView(currentView); } catch (e) {}
  }

  if (tabId === 'home') {
    // No BrowserView for home tab — renderer shows new tab page
    activeTabId = 'home';
    broadcastTabs();
    return;
  }

  const tab = tabs.find(t => t.id === tabId);
  if (!tab || !tab.view) {
    log.warn('[Tabs] showTab: tab not found or no view:', tabId);
    activeTabId = tabId;
    broadcastTabs();
    return;
  }

  mainWindow.addBrowserView(tab.view);
  const contentSize = mainWindow.getContentSize();
  tab.view.setBounds({
    x: 0,
    y: CHROME_HEIGHT,
    width: contentSize[0],
    height: contentSize[1] - CHROME_HEIGHT
  });

  // Make sure the BrowserView is focused
  tab.view.webContents.focus();

  activeTabId = tabId;
  log.info('[Tabs] Switched to:', tab.name);
  broadcastTabs();
}

function closeTab(tabId: string) {
  const tab = tabs.find(t => t.id === tabId);
  if (!tab) return;
  
  if (tab.view && mainWindow) {
    try {
      mainWindow.removeBrowserView(tab.view);
    } catch (e) {}
  }
  
  tabs = tabs.filter(t => t.id !== tabId);
  
  if (activeTabId === tabId) {
    const nextTab = tabs[0] || { id: 'home', name: 'Home', url: HOME_URL, view: null };
    activeTabId = nextTab.id;
    showTab(nextTab.id);
  }
  
  log.info('[Tabs] Closed tab:', tabId);
  broadcastTabs();
}

function getTabs() {
  return tabs.map(t => ({
    id: t.id,
    name: t.name,
    url: t.view ? t.view.webContents.getURL() : t.url,
    active: t.id === activeTabId,
    loading: t.view ? t.view.webContents.isLoading() : false,
    canGoBack: t.view ? t.view.webContents.canGoBack() : false,
    canGoForward: t.view ? t.view.webContents.canGoForward() : false
  }));
}

function broadcastTabs() {
  if (mainWindow) {
    mainWindow.webContents.send('tabs:updated', getTabs());
  }
  // Sync tab state to AutoBrowse bridge
  (async () => {
    try {
      const bridge = await getAutoBrowseBridge();
      bridge.setTabs(tabs, activeTabId);
    } catch { /* bridge not loaded yet */ }
  })();
}

function resizeTabs() {
  if (!mainWindow) return;
  const contentSize = mainWindow.getContentSize();
  for (const tab of tabs) {
    if (tab.view) {
      tab.view.setBounds({
        x: 0,
        y: CHROME_HEIGHT,
        width: contentSize[0],
        height: contentSize[1] - CHROME_HEIGHT
      });
    }
  }
}

// ========== CDP SETUP ==========
const getCurrentUrl = (): string => {
  const win = mainWindow;
  if (!win) return '';
  return win.webContents.getURL() || '';
};

const createWindow = (): void => {
  // Log screen info for black-screen diagnosis
  const displays = screen.getAllDisplays();
  earlyLog(`[WINDOW] Creating main window...`);
  earlyLog(`[WINDOW] Displays: ${displays.length} — Primary: ${displays[0]?.size.width}x${displays[0]?.size.height} scale=${displays[0]?.scaleFactor}`);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'KELEDON Browser',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false
    }
  });

  earlyLog(`[WINDOW] BrowserWindow created: ${mainWindow.getBounds().width}x${mainWindow.getBounds().height}`);
  
  // Enable zoom and scaling
  mainWindow.webContents.setVisualZoomLevelLimits(1, 4);
  mainWindow.webContents.setZoomLevel(0);

  // Handle new window requests from BrowserView (links with target="_blank")
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open external links in a new tab instead of a new window
    createTab('New Tab', url);
    return { action: 'deny' };
  });

  (async () => {
    const bridge = await getAutoBrowseBridge();
    bridge.setMainWindow(mainWindow);
    bridge.setTabs(tabs, activeTabId);
  })();

  // Configure electron-log to write to install_dir/logs/
  log.transports.file.resolvePathFn = () => MAIN_LOG;

  const rendererPath = path.join(__dirname, '../renderer/index.html');
  earlyLog(`[WINDOW] Loading renderer: ${rendererPath}`);
  earlyLog(`[WINDOW] Renderer exists: ${fs.existsSync(rendererPath)}`);
  mainWindow.loadFile(rendererPath);

  // === DIAGNOSTIC: Track renderer load success/failure ===
  mainWindow.webContents.on('did-finish-load', () => {
    earlyLog('[WINDOW] did-finish-load — renderer loaded successfully');
    log.info('Main window loaded');
    
    // Inject runtime info including log path for Copy Logs
    const logPathEscaped = STARTUP_LOG.replace(/\\/g, '\\\\');
    mainWindow?.webContents.executeJavaScript(`
      window.keledon = window.keledon || {};
      window.keledon.internal = { 
        cdpUrl: 'http://localhost:9222',
        version: '${app.getVersion()}',
        logPath: '${logPathEscaped}',
        installDir: '${INSTALL_DIR.replace(/\\/g, '\\\\')}'
      };
    `).catch((err) => {
      earlyLog(`[WINDOW] Failed to inject runtime info: ${err}`);
    });

    // Show version in console
    console.log('Keledon Browser v' + app.getVersion() + ' ready');

    // Auto-connect if configured
    if (AUTO_CONNECT && AUTO_PAIRING_CODE) {
      log.info('Auto-connecting to cloud...');
      (async () => {
        try {
          const response = await fetch(`${runtimeStatus.cloudUrl}/api/devices/pair`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              device_id: runtimeStatus.deviceId,
              machine_id: runtimeStatus.deviceId,
              pairing_code: AUTO_PAIRING_CODE,
              platform: process.platform,
              name: 'KELEDON Desktop Agent',
              keledon_id: process.env.KELECTRON_KELEDON_ID || null
            })
          });

          if (response.ok) {
            const data = await response.json();
            runtimeStatus.status = 'connected';
            runtimeStatus.authToken = data.auth_token;
            runtimeStatus.sessionId = data.keledon_id || null;
            runtimeStatus.keledonId = data.keledon_id || null;
            runtimeStatus.teamId = data.team?.id || null;
            runtimeStatus.teamName = data.team?.name || null;
            runtimeStatus.vendors = data.vendors || [];
            runtimeStatus.escalationTriggers = data.team?.escalationTriggers || [];
            transcriptMonitor.setTriggers(runtimeStatus.escalationTriggers);
            log.info('Auto-connect successful, keledon_id:', data.keledon_id);

            connectWebSockets(runtimeStatus.cloudUrl, data.auth_token);

            if (data.vendors?.length > 0) {
              autoLoginToVendor(data.vendors[0]);
            }

            if (AUTO_SESSION_ID) {
              runtimeStatus.sessionId = AUTO_SESSION_ID;
              log.info('Auto-join session:', AUTO_SESSION_ID);
            }
          } else {
            log.error('Auto-connect failed:', response.status);
          }
        } catch (error) {
          log.error('Auto-connect error:', error);
        }
      })();
    }
  });

  // === DIAGNOSTIC: Catch renderer load failures (black screen cause) ===
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    earlyLog(`[WINDOW] did-fail-load — errorCode=${errorCode} desc="${errorDescription}" url="${validatedURL}"`);
    writeCrashLog(new Error(`Renderer failed to load: ${errorCode} ${errorDescription} (${validatedURL})`));
  });

  // === DIAGNOSTIC: Catch renderer crashes ===
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    earlyLog(`[WINDOW] render-process-gone — reason=${details.reason} exitCode=${details.exitCode}`);
    writeCrashLog(new Error(`Renderer process gone: reason=${details.reason} exitCode=${details.exitCode}`));
  });

  // === DIAGNOSTIC: GPU process crash (common cause of black screen) ===
  app.on('gpu-process-crashed' as any, (_event: any, killed: boolean) => {
    earlyLog(`[GPU] GPU process crashed! killed=${killed}`);
    writeCrashLog(new Error(`GPU process crashed (killed=${killed})`));
  });

mainWindow.on('closed', () => {
  mainWindow = null;
  mainWebContents = null;
});

// Window resize handler for tabs
mainWindow.on('resize', () => {
  resizeTabs();
});

// === CHROME-LIKE KEYBOARD SHORTCUTS ===
mainWindow.webContents.on('before-input-event', (_event, input) => {
  if (input.type !== 'keyDown') return;
  const ctrl = input.control || input.meta;

  // Ctrl+T — New tab
  if (ctrl && input.key === 't') {
    mainWindow?.webContents.send('shortcut:newTab');
  }
  // Ctrl+W — Close active tab
  if (ctrl && input.key === 'w') {
    if (activeTabId !== 'home') {
      closeTab(activeTabId);
    }
  }
  // Ctrl+Tab — Next tab
  if (ctrl && input.key === 'Tab') {
    const idx = tabs.findIndex(t => t.id === activeTabId);
    if (idx >= 0 && tabs.length > 0) {
      const nextIdx = (idx + 1) % tabs.length;
      showTab(tabs[nextIdx].id);
    }
  }
  // F5 — Refresh active tab
  if (input.key === 'F5') {
    const tab = tabs.find(t => t.id === activeTabId);
    if (tab?.view) {
      tab.view.webContents.reload();
    }
  }
  // Ctrl+L — Focus URL bar (send to renderer)
  if (ctrl && input.key === 'l') {
    mainWindow?.webContents.send('shortcut:focusUrlBar');
  }
  // Ctrl+F — Find in page (active tab)
  if (ctrl && input.key === 'f') {
    mainWindow?.webContents.send('shortcut:findInPage');
  }
});

earlyLog('[WINDOW] Main window created and configured');
log.info('Main window created');
};

const connectWebSockets = (cloudUrl: string, token: string): void => {
  deviceSocket = io(`${cloudUrl}/ws/runtime`, {
    auth: { token, device_id: runtimeStatus.deviceId },
    transports: ['websocket']
  });
  
  deviceSocket.on('connect', () => {
    log.info('Device WebSocket connected');
    
    // Join a session if we have one
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
        text,
        isFinal,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  deviceSocket.on('transcript', (data) => {
    mainWindow?.webContents.send('media:transcript', data);
  });
  
  deviceSocket.on('call_status', (data) => {
    mainWindow?.webContents.send('media:callStatus', data);
  });

  // Forward cloud brain commands to renderer (voice:transcript → DecisionEngine → brain:command)
  deviceSocket.on('brain:command', (data) => {
    mainWindow?.webContents.send('brain:command', data);
  });

  deviceSocket.on('goal_execute', async (data) => {
    log.info('[Main] Received goal from cloud:', data.goal);
    
    const bridge = await getAutoBrowseBridge();
    if (!bridge.isAutoBrowseInitialized()) {
      deviceSocket?.emit('goal:result', {
        execution_id: data.execution_id,
        status: 'failed',
        goal_status: 'failed',
        error: 'AutoBrowse not initialized'
      });
      return;
    }

    try {
      const result = await bridge.executeGoal({
        execution_id: data.execution_id,
        goal: data.goal,
        inputs: data.inputs,
        constraints: data.constraints
      });

      deviceSocket?.emit('goal:result', {
        execution_id: data.execution_id,
        status: result.status,
        goal_status: result.goal_status,
        steps: result.steps,
        duration: result.duration,
        artifacts: result.artifacts
      });

      mainWindow?.webContents.send('brain:command', {
        type: 'goal_result',
        payload: result,
        execution_id: data.execution_id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      log.error('[Main] Goal execution failed:', error);
      deviceSocket?.emit('goal:result', {
        execution_id: data.execution_id,
        status: 'failed',
        goal_status: 'failed',
        error: String(error)
      });
    }
  });

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
};

const initializeAutoBrowse = async (): Promise<void> => {
  try {
    await initializeAutoBrowseEngine();
    log.info('[Main] AutoBrowse initialized via bridge');
  } catch (error) {
    log.warn('AutoBrowse CDP connection failed:', error);
  }
};

app.on('ready', async () => {
  createWindow();
  
  await initializeAutoBrowse();
  
  // Check for deep link in argv on startup
  const deepLinkArg = process.argv.find(arg => arg.startsWith('keledon://'));
  if (deepLinkArg) {
    log.info('[DeepLink] Found in argv:', deepLinkArg);
    handleDeepLink(deepLinkArg);
  }
  
  // Initialize auto-updater
  autoUpdater.logger = log;
  autoUpdater.checkForUpdatesAndNotify().catch(err => {
    log.warn('[AutoUpdater] Check for updates failed:', err);
  });
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (deviceSocket) {
    deviceSocket.disconnect();
    deviceSocket = null;
  }
  if (agentSocket) {
    agentSocket.disconnect();
    agentSocket = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (deviceSocket) {
    deviceSocket.disconnect();
    deviceSocket = null;
  }
  if (agentSocket) {
    agentSocket.disconnect();
    agentSocket = null;
  }
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
  app.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason);
});

ipcMain.handle('device:getInfo', async () => {
  return {
    deviceId: runtimeStatus.deviceId,
    version: app.getVersion(),
    platform: process.platform,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  };
});

ipcMain.handle('runtime:getStatus', async () => {
  return {
    status: runtimeStatus.status,
    deviceId: runtimeStatus.deviceId,
    sessionId: runtimeStatus.sessionId,
    cloudUrl: runtimeStatus.cloudUrl
  };
});

ipcMain.handle('runtime:connect', async (_event, config: { cloudUrl: string; token: string; keledonId?: string }) => {
  log.info('Connecting to cloud:', config.cloudUrl);
  eventLogger.info('runtime', 'connect_start', { cloudUrl: config.cloudUrl, keledonId: config.keledonId });
  
  runtimeStatus.status = 'connecting';
  runtimeStatus.cloudUrl = config.cloudUrl;
  
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
        keledon_id: config.keledonId || null
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      runtimeStatus.status = 'connected';
      runtimeStatus.authToken = data.auth_token;
      runtimeStatus.sessionId = data.keledon_id || null;
      runtimeStatus.keledonId = data.keledon_id || null;
      runtimeStatus.teamId = data.team?.id || null;
      eventLogger.info('runtime', 'connect_success', { keledonId: data.keledon_id, teamId: data.team?.id });
      runtimeStatus.teamName = data.team?.name || null;
      runtimeStatus.vendors = data.vendors || [];
      runtimeStatus.escalationTriggers = data.team?.escalationTriggers || [];
      transcriptMonitor.setTriggers(runtimeStatus.escalationTriggers);
      log.info('Connected to cloud, keledon_id:', data.keledon_id);

      connectWebSockets(config.cloudUrl, data.auth_token);

      if (data.vendors?.length > 0) {
        autoLoginToVendor(data.vendors[0]);
      }
      
      try {
        await mediaLayerWrapper.initialize();
      } catch (e) {
        console.warn('[Main] mediaLayer.initialize skipped:', e);
      }
      
      return { success: true, deviceId: runtimeStatus.deviceId };
    } else {
      throw new Error(`Cloud connection failed: ${response.status}`);
    }
  } catch (error) {
    runtimeStatus.status = 'disconnected';
    log.error('Cloud connection error:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('runtime:disconnect', async () => {
  runtimeStatus.status = 'disconnected';
  if (runtimeStatus.sessionId && deviceSocket) {
    deviceSocket.emit('session:end');
  }
  runtimeStatus.sessionId = null;
  return { success: true };
});

ipcMain.handle('runtime:startSession', async (_event, sessionId: string, teamId?: string) => {
  runtimeStatus.sessionId = sessionId;
  
  if (deviceSocket?.connected) {
    deviceSocket.emit('session:start', {
      session_id: sessionId,
      team_id: teamId || 'default-team'
    });
    log.info('Session started:', sessionId);
    return { success: true, sessionId };
  }
  
  return { success: false, error: 'Not connected to cloud' };
});

ipcMain.handle('executor:executeGoal', async (_event, goal: any, context?: Record<string, unknown>) => {
  log.info('Executing goal:', goal.objective || goal.goal);
  
  const bridge = await getAutoBrowseBridge();
  if (!bridge.isAutoBrowseInitialized()) {
    return { error: 'AutoBrowse not initialized' };
  }
  
  try {
    const goalInput = {
      execution_id: goal.execution_id || `exec-${Date.now()}`,
      goal: goal.objective || goal.goal,
      inputs: goal.inputs || context,
      constraints: {
        max_steps: goal.max_steps || goal.constraints?.max_steps,
        timeout_ms: goal.timeout_ms || goal.constraints?.timeout_ms
      },
      success_criteria: goal.success_criteria
    };
    
    const result = await bridge.executeGoal(goalInput);
    
    log.info('Goal execution completed:', result.goal_status);
    return result;
  } catch (error) {
    log.error('Goal execution failed:', error);
    return {
      execution_id: `exec-${Date.now()}`,
      goal: goal.objective || goal.goal,
      goal_status: 'failed',
      steps: [],
      duration: 0,
      artifacts: { screenshots: [], logs: [] },
      error: String(error)
    };
  }
});

ipcMain.handle('executor:executeSteps', async (_event, steps: unknown[], context?: Record<string, unknown>) => {
  log.info('Executing steps:', steps.length);
  
  const bridge = await getAutoBrowseBridge();
  if (!bridge.isAutoBrowseInitialized()) {
    return { error: 'AutoBrowse not initialized' };
  }
  
  const goalInput = {
    execution_id: `exec-${Date.now()}`,
    goal: 'Execute predefined steps',
    inputs: { steps, ...context },
    constraints: {
      max_steps: steps.length,
      timeout_ms: context?.timeoutMs as number
    }
  };
  
  try {
    const result = await bridge.executeGoal(goalInput);
    return result;
  } catch (error) {
    return { error: String(error) };
  }
});

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

ipcMain.handle('evidence:getLogs', async () => {
  const parts: string[] = [];
  // Read startup log
  if (fs.existsSync(STARTUP_LOG)) {
    parts.push('=== STARTUP LOG ===\n');
    parts.push(fs.readFileSync(STARTUP_LOG, 'utf-8'));
  }
  // Read main runtime log
  if (fs.existsSync(MAIN_LOG)) {
    parts.push('\n=== RUNTIME LOG ===\n');
    parts.push(fs.readFileSync(MAIN_LOG, 'utf-8'));
  }
  return { logs: parts.join('') || 'No logs found', logPath: LOGS_DIR };
});

ipcMain.handle('evidence:copyAllLogs', async () => {
  const parts: string[] = [
    `KELEDON Browser Log Dump`,
    `Time: ${new Date().toISOString()}`,
    `Version: ${app.getVersion()}`,
    `Install: ${INSTALL_DIR}`,
    `\n`
  ];
  if (fs.existsSync(STARTUP_LOG)) {
    parts.push('=== STARTUP LOG ===\n');
    parts.push(fs.readFileSync(STARTUP_LOG, 'utf-8'));
  }
  if (fs.existsSync(MAIN_LOG)) {
    parts.push('\n=== RUNTIME LOG ===\n');
    parts.push(fs.readFileSync(MAIN_LOG, 'utf-8'));
  }
  // Include crash logs
  try {
    const crashFiles = fs.readdirSync(LOGS_DIR).filter(f => f.startsWith('crash-'));
    for (const cf of crashFiles.slice(-3)) {
      parts.push(`\n=== ${cf} ===\n`);
      parts.push(fs.readFileSync(path.join(LOGS_DIR, cf), 'utf-8'));
    }
  } catch (_) {}
  return { logs: parts.join('') };
});

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

// Media Layer IPC handlers
ipcMain.handle('media:startCall', async (_event, sessionId: string) => {
  try {
    await mediaLayerWrapper.startCall(sessionId);
    runtimeStatus.sessionId = sessionId;
    return { success: true, sessionId };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('media:stopCall', async () => {
  try {
    await mediaLayerWrapper.stopCall();
    runtimeStatus.sessionId = null;
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('media:speak', async (_event, text: string, interruptible: boolean = true) => {
  try {
    await mediaLayerWrapper.speak(text, interruptible);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('media:stopSpeaking', async () => {
  try {
    await mediaLayerWrapper.stopSpeaking();
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('media:getStatus', async () => {
  return mediaLayerWrapper.getCallStatus();
});

ipcMain.handle('media:mute', async () => {
  mediaLayerWrapper.mute();
  return { success: true };
});

ipcMain.handle('media:unmute', async () => {
  mediaLayerWrapper.unmute();
  return { success: true };
});

ipcMain.handle('media:hold', async () => {
  try {
    await mediaLayerWrapper.hold();
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('media:resume', async () => {
  try {
    await mediaLayerWrapper.resume();
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// Set up media layer event forwarding
mediaLayer.on('transcript', (text: string, isFinal: boolean) => {
  eventLogger.debug('media', isFinal ? 'transcript_final' : 'transcript_interim', { textLength: text.length, isFinal });
  mainWindow?.webContents.send('media:transcript', {
    text,
    isFinal,
    timestamp: new Date().toISOString()
  });
});

mediaLayer.on('call-status', (status: 'idle' | 'in-call' | 'on-hold') => {
  eventLogger.info('media', 'call_status_change', { status });
  mainWindow?.webContents.send('media:callStatus', {
    status,
    ...mediaLayerWrapper.getCallStatus()
  });
});

mediaLayer.on('error', (error: Error) => {
  eventLogger.error('media', 'media_error', { message: error.message, stack: error.stack });
});

ipcMain.handle('brain:setDebugMode', async (_event, enabled: boolean) => {
  debugMode = enabled;
  return { success: true };
});

ipcMain.handle('media:hangup', async () => {
  try {
    await mediaLayer.stopCall();
    runtimeStatus.sessionId = null;
    if (deviceSocket) {
      deviceSocket.emit('session:end');
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// Listen to media layer events and forward to renderer
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

// Escalation action handler
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
    if (deviceSocket && deviceSocket.connected) {
      deviceSocket.emit('escalation:abort', {
        reason: data?.reason || 'manual_abort',
        timestamp: new Date().toISOString()
      });
    }
    return { success: true, action: 'abort' };
  }
  
  return { success: false };
});

// ========== TAB IPC HANDLERS ==========
ipcMain.handle('tabs:create', async (_event, name: string, url: string) => {
  const tab = createTab(name, url);
  return { id: tab.id, name: tab.name, url: tab.url };
});

ipcMain.handle('tabs:list', async () => {
  return getTabs();
});

ipcMain.handle('tabs:switch', async (_event, tabId: string) => {
  showTab(tabId);
  return { success: true };
});

ipcMain.handle('tabs:close', async (_event, tabId: string) => {
  closeTab(tabId);
  return { success: true };
});

ipcMain.handle('tabs:getActive', async () => {
  return activeTabId;
});

ipcMain.handle('tabs:navigate', async (_event, url: string) => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab?.view) {
    tab.url = url;
    tab.view.webContents.loadURL(url);
    broadcastTabs();
    return { success: true };
  }
  return { success: false };
});

// ========== CDP IPC HANDLER ==========
ipcMain.handle('executor:getCDPUrl', async () => {
  if (!mainWindow) return '';
  const wc = mainWindow.webContents;
  if (!wc) return '';
  
  // Enable debugger for CDP - access via session module
  const debugUrl = (session as any).defaultSession?.debuggerWebSocketUrl;
  return debugUrl || '';
});

log.info('KELEDON Desktop Agent main process initialized');

// ========== ESCALATION IPC HANDLERS ==========
ipcMain.on('escalation:action', (_event, action: string, data?: any) => {
  log.info('[Escalation] User action:', action, data);
  
  // Send to brain via WebSocket if connected
  if (deviceSocket && deviceSocket.connected) {
    deviceSocket.emit('escalation:response', {
      action,
      data,
      timestamp: new Date().toISOString()
    });
  }
  
  // Notify renderer
  mainWindow?.webContents.send('escalation:handled', { action, data });
});

// ========== EXECUTOR URL HANDLER ==========
ipcMain.handle('executor:getUrl', async () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab?.view) {
    return tab.view.webContents.getURL();
  }
  if (mainWindow) {
    return mainWindow.webContents.getURL();
  }
  return '';
});

// ========== TAB NAVIGATION HANDLERS (Chrome-like) ==========
ipcMain.handle('tabs:goBack', async () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab?.view && tab.view.webContents.canGoBack()) {
    tab.view.webContents.goBack();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('tabs:goForward', async () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab?.view && tab.view.webContents.canGoForward()) {
    tab.view.webContents.goForward();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('tabs:reload', async () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab?.view) {
    tab.view.webContents.reload();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('tabs:getUrl', async () => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab?.view) {
    return { url: tab.view.webContents.getURL(), title: tab.view.webContents.getTitle() };
  }
  return { url: '', title: '' };
});