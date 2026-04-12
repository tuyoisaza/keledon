import { app, BrowserWindow, ipcMain, session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import log from 'electron-log';
import { io, Socket } from 'socket.io-client';

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
  cloudUrl: '',
  sessionId: null as string | null,
  authToken: null as string | null
};

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

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('Main window loaded');
    mainWindow?.webContents.executeJavaScript(`
      window.keledon = window.keledon || {};
      window.keledon.internal = { cdpUrl: 'http://localhost:9222' };
    `).catch(() => {});
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

ipcMain.handle('runtime:connect', async (_event, config: { cloudUrl: string; token: string }) => {
  log.info('Connecting to cloud:', config.cloudUrl);
  
  runtimeStatus.status = 'connecting';
  runtimeStatus.cloudUrl = config.cloudUrl;
  
  try {
    const response = await fetch(`${config.cloudUrl}/api/devices/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: runtimeStatus.deviceId,
        pairing_code: config.token
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      runtimeStatus.status = 'connected';
      runtimeStatus.authToken = data.auth_token;
      log.info('Connected to cloud successfully');
      
      connectWebSockets(config.cloudUrl, data.auth_token);
      
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
  runtimeStatus.sessionId = null;
  return { success: true };
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