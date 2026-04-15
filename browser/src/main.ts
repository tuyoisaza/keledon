import { app, BrowserWindow, ipcMain, session, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import log from 'electron-log';
import { io, Socket } from 'socket.io-client';
import { autoUpdater } from 'electron-updater';

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
          log.info('[DeepLink] Auto-connect successful, keledon_id:', data.keledon_id);
          log.info('[DeepLink] Team:', data.team?.name, 'Vendors:', data.vendors?.length);

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

const mediaLayer = {
  initialize: async (_?: any) => {},
  getCallStatus: () => ({}),
  startCall: async (_?: any) => {},
  stopCall: async () => {},
  speak: async (_?: any, __?: any) => {},
  stopSpeaking: async () => {},
  mute: () => {},
  unmute: () => {},
  hold: async () => {},
  resume: async () => {},
  on: (_: any, __: any) => {},
  emit: (_: any, __?: any) => {}
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

    const bridge = await getAutoBrowseBridge();
    if (!bridge.isAutoBrowseInitialized()) {
      log.error('[Vendor] AutoBrowse not initialized, cannot login');
      return;
    }

    try {
      mainWindow?.webContents.loadURL(vendor.baseUrl);
    } catch (e) {
      log.warn('[Vendor] loadURL failed, using goal instead');
    }
    await new Promise(resolve => setTimeout(resolve, 2000));

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
  keledonId: null as string | null
};

const AUTO_CONNECT = process.env.AUTO_CONNECT === 'true';
const AUTO_PAIRING_CODE = process.env.PAIRING_CODE || '';
const AUTO_SESSION_ID = process.env.SESSION_ID || '';
const KELECTRON_KELEDON_ID = process.env.KELECTRON_KELEDON_ID || '';

const getCDPURL = (): string => {
  const window = mainWindow;
  if (!window) return '';
  
  const webContents = window.webContents;
  if (!webContents) return '';
  
  return webContents.getURL();
};

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'KELEDON Desktop Agent',
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false
    }
  });
  
  // Enable zoom and scaling
  mainWindow.webContents.setVisualZoomLevelLimits(1, 4);
  mainWindow.webContents.setZoomLevel(0);

  (async () => {
    const bridge = await getAutoBrowseBridge();
    bridge.setMainWindow(mainWindow);
  })();

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('Main window loaded');
    mainWindow?.webContents.executeJavaScript(`
      window.keledon = window.keledon || {};
      window.keledon.internal = { 
        cdpUrl: 'http://localhost:9222',
        version: '${app.getVersion()}'
      };
      window.keledon.copyLogs = function() {
        navigator.clipboard.writeText('Keledon Browser v' + window.keledon.internal.version);
      };
    `).catch(() => {});

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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

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
  
  deviceSocket.on('transcript', (data) => {
    mainWindow?.webContents.send('media:transcript', data);
  });
  
  deviceSocket.on('call_status', (data) => {
    mainWindow?.webContents.send('media:callStatus', data);
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
      runtimeStatus.teamName = data.team?.name || null;
      runtimeStatus.vendors = data.vendors || [];
      log.info('Connected to cloud, keledon_id:', data.keledon_id);

      connectWebSockets(config.cloudUrl, data.auth_token);

      if (data.vendors?.length > 0) {
        autoLoginToVendor(data.vendors[0]);
      }
      
      try {
        await mediaLayer.initialize({
          deviceConfig: {
            deviceId: runtimeStatus.deviceId,
            organizationId: data.organization_id,
            cloudUrl: config.cloudUrl,
            authToken: data.auth_token
          }
        });
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

ipcMain.handle('executor:getUrl', async () => {
  const bridge = await getAutoBrowseBridge();
  if (!bridge.isAutoBrowseInitialized()) {
    return { error: 'AutoBrowse not initialized' };
  }
  try {
    const state = await bridge.getBrowserState();
    return { url: state.url };
  } catch (error) {
    return { error: String(error) };
  }
});

ipcMain.handle('evidence:getLogs', async () => {
  const logPath = log.transports.file.getFile()?.path;
  if (logPath && fs.existsSync(logPath)) {
    return { logs: fs.readFileSync(logPath, 'utf-8') };
  }
  return { logs: '' };
});

ipcMain.handle('evidence:getScreenshots', async () => {
  return { screenshots: [] };
});

// Media Layer IPC handlers
ipcMain.handle('media:startCall', async (_event, sessionId: string) => {
  try {
    await mediaLayer.startCall(sessionId);
    runtimeStatus.sessionId = sessionId;
    return { success: true, sessionId };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('media:stopCall', async () => {
  try {
    await mediaLayer.stopCall();
    runtimeStatus.sessionId = null;
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('media:speak', async (_event, text: string, options?: { voice?: string; speed?: number }) => {
  try {
    await mediaLayer.speak(text, options);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('media:stopSpeaking', async () => {
  try {
    await mediaLayer.stopSpeaking();
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('media:getStatus', async () => {
  return mediaLayer.getCallStatus();
});

ipcMain.handle('media:mute', async () => {
  mediaLayer.mute();
  return { success: true };
});

ipcMain.handle('media:unmute', async () => {
  mediaLayer.unmute();
  return { success: true };
});

ipcMain.handle('media:hold', async () => {
  try {
    await mediaLayer.hold();
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('media:resume', async () => {
  try {
    await mediaLayer.resume();
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
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

log.info('KELEDON Desktop Agent main process initialized');