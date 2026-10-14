import { app, BrowserWindow } from 'electron';
import type { RuntimeStatus } from './types.js';
import { resolveDebugMode } from './debug-mode.js';

/**
 * Shared mutable state for the KELEDON browser main process.
 * This module is imported by ipc-handlers.ts, main.ts, and other modules
 * that need access to runtime state without passing it through call chains.
 */

export const runtimeStatus: RuntimeStatus = {
  status: 'idle',
  deviceId: process.env.KELEDON_DEVICE_ID || `device-${Date.now()}`,
  cloudUrl: process.env.CLOUD_URL || 'https://keledon.tuyoisaza.com',
  sessionId: null,
  authToken: null,
  pendingKeledonId: null,
  pendingPairingCode: null,
  teamId: null,
  teamName: null,
  language: 'en-US',
  vendors: [],
  keledonId: null,
  escalationTriggers: [],
  diagnostics: {
    lastDeepLinkReceivedAt: null,
    lastDeepLinkAction: null,
    lastDeepLinkHadRequiredParams: null,
    lastDeepLinkValidation: null,
    lastAutoConnectStatus: 'not_attempted',
    lastAutoConnectHttpStatus: null,
    lastAutoConnectError: null,
    lastLaunchKeledonId: null,
    lastLaunchCloudUrl: null,
    lastRendererLaunchBufferedAt: null,
    lastRendererLaunchDeliveredAt: null,
  },
};

export let mainWindow: BrowserWindow | null = null;
export function setMainWindow(win: BrowserWindow | null) { mainWindow = win; }

export let debugMode = resolveDebugMode(app.isPackaged, process.env.KELEDON_DEBUG);

/** Explicit logout clears tenant/session configuration and all cached runtime credentials. */
export function clearRuntimeSessionState(): void {
  runtimeStatus.authToken = null;
  runtimeStatus.sessionId = null;
  runtimeStatus.pendingKeledonId = null;
  runtimeStatus.pendingPairingCode = null;
  runtimeStatus.teamId = null;
  runtimeStatus.teamName = null;
  runtimeStatus.keledonId = null;
  runtimeStatus.vendors = [];
  runtimeStatus.escalationTriggers = [];
  runtimeStatus.language = 'en-US';
}
