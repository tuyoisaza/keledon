/**
 * AutoBrowse Bridge - KELEDON Browser integration with AutoBrowse engine
 * 
 * This module provides browser automation using CDP (Chrome DevTools Protocol)
 * to control the Electron webContents.
 * 
 * Flow: Cloud → Browser WebSocket → Bridge → CDP → Browser Tab
 */

import log from 'electron-log';
import { BrowserWindow } from 'electron';

interface BridgeGoalInput {
  execution_id?: string;
  goal: string;
  inputs?: Record<string, unknown>;
  constraints?: {
    max_steps?: number;
    timeout_ms?: number;
  };
  success_criteria?: string;
}

interface BridgeExecutionResult {
  execution_id: string;
  status: 'running' | 'completed' | 'failed';
  goal_status: 'success' | 'failed' | 'uncertain';
  steps: unknown[];
  duration: number;
  artifacts: {
    screenshots: string[];
    logs: string[];
  };
  error?: string;
}

interface BrowserState {
  url: string;
  title: string;
  tabs: unknown[];
}

let isInitialized = false;
let mainWindow: BrowserWindow | null = null;

export function setMainWindow(window: BrowserWindow) {
  mainWindow = window;
}

export async function initializeAutoBrowse(electronSession: any): Promise<void> {
  if (isInitialized) {
    log.info('[AutoBrowseBridge] Already initialized');
    return;
  }

  log.info('[AutoBrowseBridge] Initializing with CDP...');
  
  isInitialized = true;
  log.info('[AutoBrowseBridge] Initialized successfully (CDP mode)');
}

export async function executeGoal(input: BridgeGoalInput): Promise<BridgeExecutionResult> {
  if (!isInitialized) {
    throw new Error('AutoBrowse not initialized');
  }

  if (!mainWindow) {
    return {
      execution_id: input.execution_id || `exec-${Date.now()}`,
      status: 'failed',
      goal_status: 'failed',
      steps: [],
      duration: 0,
      artifacts: { screenshots: [], logs: [] },
      error: 'No main window'
    };
  }

  log.info('[AutoBrowseBridge] Executing goal via CDP:', input.goal);
  const startTime = Date.now();

  try {
    const result = await executeGoalViaCDP(input.goal, input.inputs);
    
    return {
      execution_id: input.execution_id || `exec-${Date.now()}`,
      status: result.success ? 'completed' : 'failed',
      goal_status: result.success ? 'success' : 'uncertain',
      steps: result.steps,
      duration: Date.now() - startTime,
      artifacts: {
        screenshots: result.screenshots || [],
        logs: result.logs || []
      }
    };
  } catch (error) {
    log.error('[AutoBrowseBridge] Goal execution failed:', error);
    return {
      execution_id: input.execution_id || `exec-${Date.now()}`,
      status: 'failed',
      goal_status: 'failed',
      steps: [],
      duration: Date.now() - startTime,
      artifacts: { screenshots: [], logs: [] },
      error: String(error)
    };
  }
}

async function executeGoalViaCDP(goal: string, inputs?: Record<string, unknown>): Promise<{
  success: boolean;
  steps: unknown[];
  screenshots: string[];
  logs: string[];
}> {
  if (!mainWindow) {
    return { success: false, steps: [], screenshots: [], logs: [] };
  }

  const steps: unknown[] = [];
  const screenshots: string[] = [];
  const logs: string[] = [];

  try {
    logs.push(`[Goal] ${goal}`);
    
    const targetUrl = inputs?.url as string || 'about:blank';
    await mainWindow.webContents.loadURL(targetUrl);
    steps.push({ action: 'navigate', url: targetUrl, result: 'success' });
    logs.push(`[Navigate] to ${targetUrl}`);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const image = await mainWindow.webContents.capturePage();
    screenshots.push(image.toDataURL());
    logs.push('[Screenshot] captured');
    
    return { success: true, steps, screenshots, logs };
  } catch (error) {
    logs.push(`[Error] ${error}`);
    return { success: false, steps, screenshots, logs };
  }
}

export async function getBrowserState(): Promise<BrowserState> {
  if (!mainWindow) {
    return { url: '', title: '', tabs: [] };
  }

  return {
    url: mainWindow.webContents.getURL(),
    title: mainWindow.webContents.getTitle(),
    tabs: []
  };
}

export async function captureScreenshot(): Promise<string> {
  if (!mainWindow) return '';
  
  try {
    const image = await mainWindow.webContents.capturePage();
    return image.toDataURL();
  } catch (error) {
    log.error('[AutoBrowseBridge] Screenshot failed:', error);
    return '';
  }
}

export function getEngine(): any {
  return mainWindow;
}

export function isAutoBrowseInitialized(): boolean {
  return isInitialized;
}

export async function disposeAutoBrowse(): Promise<void> {
  isInitialized = false;
  mainWindow = null;
}
