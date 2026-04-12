import { app, BrowserWindow, ipcMain, session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import log from 'electron-log';
import { io, Socket } from 'socket.io-client';
import { mediaLayer } from '../../runtime/src/media/media-layer.js';

let autoBrowseExecutor: any = null;
let StructuredGoal: any = null;

let deviceSocket: Socket | null = null;
let agentSocket: Socket | null = null;
let debugMode = false;

async function loadAutoBrowse() {
  try {
    const module = await import('../../autobrowse/src/executor.js');
    autoBrowseExecutor = module.autoBrowseExecutor || module.AutoBrowseExecutor 
      ? new (module.AutoBrowseExecutor || module.default)() 
      : module;
    StructuredGoal = module.StructuredGoal;
  } catch (e) {
    try {
      const module = await import('../autobrowse-service/src/executor.js');
      autoBrowseExecutor = module.autoBrowseExecutor || module.AutoBrowseExecutor 
        ? new (module.AutoBrowseExecutor || module.default)() 
        : module;
      StructuredGoal = module.StructuredGoal;
    } catch (e2) {
      console.warn('[Main] AutoBrowse not available:', e2.message);
    }
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
};

const initializeAutoBrowse = async (): Promise<void> => {
  try {
    await loadAutoBrowse();
    if (!autoBrowseExecutor) {
      log.warn('AutoBrowse not loaded, skipping initialization');
      return;
    }
    
    const cdpUrl = process.env.CDP_URL || 'http://localhost:9222';
    log.info(`Connecting AutoBrowse to CDP: ${cdpUrl}`);
    
    await autoBrowseExecutor.connectOverCDP({ cdpUrl });
    log.info('AutoBrowse connected over CDP');
  } catch (error) {
    log.warn('AutoBrowse CDP connection failed, using fallback:', error);
    try {
      await autoBrowseExecutor.launch({ headless: false });
    } catch (launchError) {
      log.error('AutoBrowse launch failed:', launchError);
    }
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
  if (process.platform !== 'darwin') {
    app.quit();
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
      
      await mediaLayer.initialize({
        deviceConfig: {
          deviceId: runtimeStatus.deviceId,
          organizationId: data.organization_id,
          cloudUrl: config.cloudUrl,
          authToken: data.auth_token
        }
      });
      
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

ipcMain.handle('executor:executeGoal', async (_event, goal: StructuredGoal, context?: Record<string, unknown>) => {
  log.info('Executing goal:', goal.objective);
  
  if (!autoBrowseExecutor) {
    return { error: 'AutoBrowse not loaded' };
  }
  
  try {
    const result = await autoBrowseExecutor.executeGoal(goal, {
      sessionId: runtimeStatus.sessionId || 'unknown',
      flowId: context?.flowId as string || 'default',
      targetUrl: context?.targetUrl as string || getCDPURL(),
      metadata: context
    });
    
    log.info('Goal execution completed:', result.goal_status);
    return result;
  } catch (error) {
    log.error('Goal execution failed:', error);
    return {
      execution_id: `exec-${Date.now()}`,
      goal: goal.objective,
      goal_status: 'failed' as const,
      results: [],
      summary: { total_steps: 0, successful_steps: 0, failed_steps: 1, uncertain_steps: 0, execution_time_ms: 0 },
      final_state: { url: getCDPURL(), screenshots: [] },
      timestamp: new Date().toISOString(),
      error: String(error)
    };
  }
});

ipcMain.handle('executor:executeSteps', async (_event, steps: unknown[], context?: Record<string, unknown>) => {
  log.info('Executing steps:', steps.length);
  
  if (!autoBrowseExecutor) {
    return { error: 'AutoBrowse not loaded' };
  }
  
  const goal: StructuredGoal = {
    objective: 'Execute predefined steps',
    target_app: (context?.targetApp as 'salesforce' | 'genesys' | 'web' | 'custom') || 'web',
    target_url: context?.targetUrl as string,
    constraints: {
      max_steps: steps.length,
      timeout_ms: context?.timeoutMs as number
    }
  };
  
  try {
    const result = await autoBrowseExecutor.executeGoal(goal, {
      sessionId: runtimeStatus.sessionId || 'unknown',
      flowId: context?.flowId as string || 'default',
      targetUrl: context?.targetUrl as string
    });
    
    return result;
  } catch (error) {
    return { error: String(error) };
  }
});

ipcMain.handle('executor:getScreenshot', async () => {
  if (!autoBrowseExecutor) {
    return { error: 'AutoBrowse not loaded' };
  }
  try {
    const screenshot = await autoBrowseExecutor.captureScreenshot();
    return { screenshot };
  } catch (error) {
    return { error: String(error) };
  }
});

ipcMain.handle('executor:getUrl', async () => {
  if (!autoBrowseExecutor) {
    return { error: 'AutoBrowse not loaded' };
  }
  try {
    const url = await autoBrowseExecutor.getPageURL();
    return { url };
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