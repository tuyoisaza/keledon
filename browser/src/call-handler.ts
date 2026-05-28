/**
 * Call Handler - KELEDON Browser call handling state machine
 *
 * Manages the call lifecycle:
 *   standby → call_received → listening → transcribing → thinking → reporting → executing → standby
 *
 * The browser is "blind" — it only knows what the Cloud tells it via commands.
 */

import log from 'electron-log';
import { BrowserWindow } from 'electron';
import { executeRpaFlow, type RpaFlow, type RpaFlowResult } from './rpa-executor.js';
import { mediaLayer } from './media/media-layer.js';
import { transcriptMonitor } from './media/transcript-monitor.js';
import { runtimeStatus } from './runtime-state.js';

export type CallState =
  | 'standby'
  | 'call_received'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'reporting'
  | 'executing'
  | 'closing';

export interface CallContext {
  sessionId: string;
  state: CallState;
  startTime: number;
  transcript: string[];
  lastDecision?: Record<string, unknown>;
  rpaResult?: RpaFlowResult;
  error?: string;
}

let currentCall: CallContext | null = null;
let mainWindow: BrowserWindow | null = null;

export function setMainWindow(window: BrowserWindow | null): void {
  mainWindow = window;
}

export function getCurrentCall(): CallContext | null {
  return currentCall;
}

export function getState(): CallState {
  return currentCall?.state || 'standby';
}

function setState(state: CallState): void {
  if (currentCall) {
    currentCall.state = state;
    log.info(`[CallHandler] State → ${state} (session: ${currentCall.sessionId})`);

    // Notify renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('call:state', {
        sessionId: currentCall.sessionId,
        state,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

// ===================== Call Lifecycle =====================

export function startCall(sessionId: string): void {
  if (currentCall) {
    log.warn(`[CallHandler] Call already active (${currentCall.sessionId}), closing first`);
    closeCall('New call received while active');
  }

  currentCall = {
    sessionId,
    state: 'call_received',
    startTime: Date.now(),
    transcript: [],
  };

  log.info(`[CallHandler] Call started: ${sessionId}`);
  mediaLayer.startCall().catch(err => log.error('[CallHandler] Failed to start call capture:', err));
  setState('listening');
}

export function appendTranscript(text: string, isFinal: boolean = false): void {
  if (!currentCall) {
    log.warn('[CallHandler] No active call to append transcript');
    return;
  }

  currentCall.transcript.push(text);
  log.info(`[CallHandler] Transcript appended: "${text.substring(0, 50)}..."`);
  setState('transcribing');

  // Notify renderer
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('call:transcript', {
      sessionId: currentCall.sessionId,
      text,
      isFinal,
      timestamp: new Date().toISOString(),
    });
  }
}

export function processDecision(decision: Record<string, unknown>): void {
  if (!currentCall) {
    log.warn('[CallHandler] No active call to process decision');
    return;
  }

  currentCall.lastDecision = decision;
  setState('thinking');

  log.info(`[CallHandler] Decision received: ${JSON.stringify(decision).substring(0, 100)}`);
}

export async function executeRpaFlowFromCommand(flow: RpaFlow): Promise<RpaFlowResult> {
  if (!currentCall) {
    log.warn('[CallHandler] No active call for RPA execution');
    return {
      flow_id: flow.flow_id,
      status: 'failed',
      steps: [],
      total_duration_ms: 0,
      error: 'No active call',
    };
  }

  setState('executing');
  const result = await executeRpaFlow(flow);
  currentCall.rpaResult = result;
  setState('reporting');

  log.info(`[CallHandler] RPA flow completed: ${result.status}`);
  return result;
}

export function closeCall(reason?: string): void {
  if (!currentCall) {
    return;
  }

  setState('closing');
  mediaLayer.stopCall().catch(err => log.error('[CallHandler] Failed to stop call capture:', err));

  const summary = {
    sessionId: currentCall.sessionId,
    state: currentCall.state,
    duration_ms: Date.now() - currentCall.startTime,
    transcriptLength: currentCall.transcript.length,
    rpaResult: currentCall.rpaResult,
    reason,
  };

  log.info(`[CallHandler] Call closed: ${JSON.stringify(summary)}`);

  currentCall = null;
  setState('standby');
}

export function isCallActive(): boolean {
  return currentCall !== null;
}

// ===================== Transcript Listener =====================

let transcriptListener: (() => void) | null = null;

export function startTranscriptListener(callback: (text: string, isFinal: boolean) => void): void {
  stopTranscriptListener();

  transcriptListener = () => {
    if (currentCall?.state === 'listening') {
      // Transcript is being captured by mediaLayer and sent to cloud
      // This is a local listener for call state tracking
    }
  };

  // Hook into media layer transcript events
  mediaLayer.on('transcript', (text: string, isFinal: boolean) => {
    if (currentCall) {
      callback(text, isFinal);
    }
  });

  log.info('[CallHandler] Transcript listener started');
}

export function stopTranscriptListener(): void {
  transcriptListener = null;
  log.info('[CallHandler] Transcript listener stopped');
}
