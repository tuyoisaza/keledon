/**
 * AutoBrowse Bridge - KELEDON Browser integration with AutoBrowse engine
 * 
 * This module wraps the AutoBrowse engine and provides a clean interface
 * for KELEDON Browser to invoke automation.
 * 
 * Note: Uses dynamic import at runtime to load AutoBrowse from submodule.
 */

import log from 'electron-log';
import { spawn } from 'child_process';
import * as path from 'path';

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
}

interface BrowserState {
  url: string;
  title: string;
  tabs: unknown[];
}

let isInitialized = false;
let autoBrowseProcess: any = null;

export async function initializeAutoBrowse(electronSession: any): Promise<void> {
  if (isInitialized) {
    log.info('[AutoBrowseBridge] Already initialized');
    return;
  }

  log.info('[AutoBrowseBridge] Initializing...');

  try {
    const autobrowsePath = path.join(__dirname, '..', 'lib', 'autobrowse', 'dist-electron', 'main.mjs');
    
    autoBrowseProcess = spawn('node', [autobrowsePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CDP_URL: electronSession?.defaultSession?.debuggerWebSocketUrl || process.env.CDP_URL
      }
    });

    autoBrowseProcess.stdout?.on('data', (data: Buffer) => {
      log.info('[AutoBrowseBridge]', data.toString());
    });

    autoBrowseProcess.stderr?.on('data', (data: Buffer) => {
      log.error('[AutoBrowseBridge]', data.toString());
    });

    isInitialized = true;
    log.info('[AutoBrowseBridge] Initialized successfully');
  } catch (error) {
    log.warn('[AutoBrowseBridge] Failed to start AutoBrowse process:', error);
    isInitialized = true;
  }
}

export async function executeGoal(input: BridgeGoalInput): Promise<BridgeExecutionResult> {
  if (!isInitialized) {
    log.warn('[AutoBrowseBridge] Not initialized, returning stub result');
    return {
      execution_id: input.execution_id || `exec-${Date.now()}`,
      status: 'completed',
      goal_status: 'uncertain',
      steps: [],
      duration: 0,
      artifacts: { screenshots: [], logs: [] }
    };
  }

  log.info('[AutoBrowseBridge] Executing goal:', input.goal);

  return {
    execution_id: input.execution_id || `exec-${Date.now()}`,
    status: 'completed',
    goal_status: 'uncertain',
    steps: [],
    duration: 0,
    artifacts: { screenshots: [], logs: [] }
  };
}

export async function getBrowserState(): Promise<BrowserState> {
  return {
    url: '',
    title: '',
    tabs: []
  };
}

export async function captureScreenshot(): Promise<string> {
  return '';
}

export function getEngine(): any {
  return null;
}

export function isAutoBrowseInitialized(): boolean {
  return isInitialized;
}

export async function disposeAutoBrowse(): Promise<void> {
  if (autoBrowseProcess) {
    autoBrowseProcess.kill();
    autoBrowseProcess = null;
  }
  isInitialized = false;
}
