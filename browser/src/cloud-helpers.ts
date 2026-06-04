import log from 'electron-log';
import crypto from 'crypto';
import * as cmdlog from './cmdlog.js';
import type { TabManager } from './tab-manager.js';
import { runtimeStatus } from './runtime-state.js';

export function buildWsCtx(cloudUrl: string, token: string): string {
  return `ws=${deriveWsUrl(cloudUrl)}/ws/runtime token=${cmdlog.truncate(token, 16, 0)} device=${cmdlog.truncate(runtimeStatus.deviceId, 8, 4)}`;
}
export function deriveWsUrl(cloudUrl: string): string {
  try {
    const u = new URL(cloudUrl);
    if (u.hostname === 'keledon.tuyoisaza.com') {
      return `https://keledonapi.tuyoisaza.com`;
    }
  } catch { /* fall through */ }
  return cloudUrl;
}
// ===================== HELPERS =====================

/**
 * Send connection status to the renderer via IPC.
 * The renderer side panel (built in a future task) consumes this channel.
 */
export function sendStatusToRenderer(mainWindow: any | null, status: string, detail?: string) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.webContents.send('connection:status', {
        status,
        detail: detail || '',
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Renderer may not be ready yet
    }
  }
}

export function decryptRuntimeVendorValue(text: string): string {
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
    // Preserve legacy behavior from ipc-handlers.ts: if the value is already plain text,
    // return it unchanged. Command Activity Log never prints this raw value.
    return text;
  }
}

export function enrichGoalExecuteDataFromRuntimeVendor(data: any): any {
  const enriched = { ...(data || {}) };
  const inputs = { ...(enriched.inputs || {}) };
  const vendorId = enriched.vendor_id || enriched.vendorId || inputs.vendor_id || inputs.vendorId;
  if (!vendorId || !Array.isArray(runtimeStatus.vendors)) {
    enriched.inputs = Object.keys(inputs).length > 0 ? inputs : enriched.inputs;
    return enriched;
  }

  const vendor = runtimeStatus.vendors.find((candidate: any) => candidate?.id === vendorId);
  if (!vendor) {
    enriched.inputs = Object.keys(inputs).length > 0 ? inputs : enriched.inputs;
    cmdlog.log('CMD', `goal_execute vendor enrichment skipped | vendor_id=${cmdlog.truncate(String(vendorId), 8, 4)} | reason=runtime vendor not found`);
    return enriched;
  }

  // Direct WebSocket goal_execute bypasses ipc-handlers.ts, so repeat the same local-only
  // credential enrichment here. The cloud command carries only vendor_id; the desktop's
  // pairing payload is the trusted source for URL and encrypted credentials.
  if (vendor.baseUrl && !inputs.url && !inputs.targetUrl) {
    inputs.url = vendor.baseUrl;
    inputs.targetUrl = vendor.baseUrl;
  }
  if (vendor.username && !inputs.username && !inputs.email && !inputs.login) {
    const username = decryptRuntimeVendorValue(vendor.username);
    inputs.username = username;
    inputs.email = username;
    inputs.login = username;
  }
  if (vendor.password && !inputs.password) {
    inputs.password = decryptRuntimeVendorValue(vendor.password);
  }
  if (vendor.apiKey && !inputs.apiKey) {
    inputs.apiKey = decryptRuntimeVendorValue(vendor.apiKey);
  }

  enriched.inputs = inputs;
  enriched.goal = vendor.startGoal || enriched.goal;
  cmdlog.log('CMD', `goal_execute vendor enrichment | vendor_id=${cmdlog.truncate(String(vendorId), 8, 4)} | url_present=${inputs.url ? 'yes' : 'no'} | username_present=${inputs.username ? 'yes' : 'no'} | password_present=${inputs.password ? 'yes' : 'no'} | startGoal_present=${vendor.startGoal ? 'yes' : 'no'}`);
  return enriched;
}

export function summarizeGoalExecuteData(data: any): string {
  const inputs = data?.inputs || {};
  return `execution=${data?.execution_id || 'none'} | goal_len=${String(data?.goal || '').length} | vendor_id=${cmdlog.truncate(String(data?.vendor_id || data?.vendorId || inputs.vendor_id || inputs.vendorId || ''), 8, 4)} | url_present=${inputs.url || inputs.targetUrl ? 'yes' : 'no'} | username_present=${inputs.username || inputs.email || inputs.login ? 'yes' : 'no'} | password_present=${inputs.password ? 'yes' : 'no'}`;
}

export function ensureBrowserViewForGoalExecution(tabManager: TabManager, bridge: any): void {
  const currentTabId = tabManager.getActiveTabId();
  const currentTabs = tabManager.getInternalTabs();
  const hasView = currentTabs.some((tab) => tab.id === currentTabId && tab.view !== null);
  if (hasView) {
    bridge.setTabs(tabManager.getInternalTabs(), tabManager.getActiveTabId());
    return;
  }

  cmdlog.log('CMD', 'goal_execute preparing BrowserView | active tab has no view, creating Goal Execution tab');
  const newTab = tabManager.createTab('Goal Execution', 'about:blank');
  if (newTab.view) {
    tabManager.setActiveTabId(newTab.id);
    tabManager.showTab(newTab.id);
  }
  bridge.setTabs(tabManager.getInternalTabs(), tabManager.getActiveTabId());
}

export function ensureActiveGoalTab(tabManager: TabManager, bridge: any): void {
  ensureBrowserViewForGoalExecution(tabManager, bridge);
}

/**
 * When the cloud sends a goal_execute without a vendor_id, try to match a runtime
 * vendor by scanning the goal text for the vendor's name, URL domain, or other hints.
 * v0.3.47: bridges cloud-originated bare goals with the desktop's paired
 * vendor configuration so credentials are available at plan time.
 */
export function findMatchingVendorFromGoal(goal: string): any | null {
  if (!goal || !Array.isArray(runtimeStatus.vendors)) return null;
  const goalLower = goal.toLowerCase();

  for (const vendor of runtimeStatus.vendors) {
    if (!vendor?.id || !vendor?.baseUrl || vendor.isActive === false) continue;

    // Check if goal mentions the vendor name
    if (vendor.name && goalLower.includes(vendor.name.toLowerCase())) {
      cmdlog.log('CMD', `goal_execute vendor match by name | vendor_id=${cmdlog.truncate(String(vendor.id), 8, 4)} | name=${vendor.name}`);
      return vendor;
    }

    // Check if goal mentions the vendor's base URL domain
    try {
      const hostname = new URL(vendor.baseUrl).hostname.replace(/^www\./, '');
      const domainParts = hostname.split('.');
      // Match on the registered domain (e.g. "google" from "accounts.google.com")
      const primaryDomain = domainParts.length >= 2 ? domainParts[domainParts.length - 2] : domainParts[0];
      if (goalLower.includes(primaryDomain)) {
        cmdlog.log('CMD', `goal_execute vendor match by domain | vendor_id=${cmdlog.truncate(String(vendor.id), 8, 4)} | domain=${primaryDomain}`);
        return vendor;
      }
    } catch { /* URL parse error */ }
  }

  // Single-vendor short-circuit: if there's exactly one runnable vendor, assume it's the target
  const runnable = runtimeStatus.vendors.filter((v: any) => v?.id && v?.baseUrl && v.isActive !== false);
  if (runnable.length === 1) {
    cmdlog.log('CMD', `goal_execute vendor match by single-vendor fallback | vendor_id=${cmdlog.truncate(String(runnable[0].id), 8, 4)}`);
    return runnable[0];
  }

  return null;
}

/**
 * Calculate exponential backoff delay for reconnection.
 * Sequence: 1s → 2s → 4s → 8s → 16s → 30s (capped)
 */
export function getReconnectDelay(attempt: number, initialDelay: number, maxDelay: number): number {
  const delay = initialDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

export function decryptRuntimeVendorSecret(text: string): string {
  try {
    const encryptionKey = process.env.KELEDON_VENDOR_KEY || 'keledon-vendor-secret-key-32!';
    const [ivHex, encrypted] = String(text).split(':');
    if (!ivHex || !encrypted) return text;
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(encryptionKey, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return text;
  }
}

export function enrichCloudGoalInputsFromRuntimeVendor(goal: any, baseInputs: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  const inputs = { ...(baseInputs || {}) };
  const vendorId = goal?.vendor_id || goal?.vendorId || goal?.metadata?.vendor_id || goal?.metadata?.vendorId || inputs.vendor_id || inputs.vendorId;
  if (!vendorId || !Array.isArray(runtimeStatus.vendors)) {
    return Object.keys(inputs).length > 0 ? inputs : baseInputs;
  }

  const vendor = runtimeStatus.vendors.find((candidate: any) => candidate?.id === vendorId);
  if (!vendor) {
    cmdlog.log('CMD', `goal_execute vendor credentials unavailable | vendor_id: ${cmdlog.truncate(String(vendorId), 8, 4)} | vendors_loaded: ${runtimeStatus.vendors.length}`);
    return Object.keys(inputs).length > 0 ? inputs : baseInputs;
  }

  // Direct Socket.IO goal_execute commands intentionally carry only vendor_id. The desktop
  // already has the encrypted runtime vendor payload from pairing/bootstrap, so enrich here
  // before AutoBrowse plans the goal. Do not log raw decrypted values.
  if (vendor.username && !inputs.username && !inputs.email && !inputs.login) {
    const username = decryptRuntimeVendorSecret(vendor.username);
    inputs.username = username;
    inputs.email = username;
    inputs.login = username;
  }
  if (vendor.password && !inputs.password) {
    inputs.password = decryptRuntimeVendorSecret(vendor.password);
  }
  if (vendor.apiKey && !inputs.apiKey) {
    inputs.apiKey = decryptRuntimeVendorSecret(vendor.apiKey);
  }

  cmdlog.log('CMD', `goal_execute enriched runtime vendor inputs | vendor_id: ${cmdlog.truncate(String(vendorId), 8, 4)} | keys: ${Object.keys(inputs).sort().join(',') || 'none'}`);
  return Object.keys(inputs).length > 0 ? inputs : baseInputs;
}

// ===================== HEARTBEAT =====================
