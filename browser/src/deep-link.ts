import { normalizeTrustedCloudUrl } from './cloud-trust.js';
import * as crypto from 'crypto';
import log from 'electron-log';
import { runtimeStatus, mainWindow } from './runtime-state.js';
import type { TabManager } from './tab-manager.js';

export type LaunchPayload = {
  keledonId: string;
  code?: string;
  cloudUrl?: string;
  action: 'auto-connect' | 'test';
  instructions?: string;
};

let pendingRendererLaunch: LaunchPayload | null = null;

function nowIso(): string { return new Date().toISOString(); }

function safeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function rememberLaunchForRenderer(payload: LaunchPayload): void {
  pendingRendererLaunch = payload;
  runtimeStatus.diagnostics.lastRendererLaunchBufferedAt = nowIso();
}

function sendLaunchToRenderer(payload: LaunchPayload): void {
  rememberLaunchForRenderer(payload);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('keledon:launch', payload);
    runtimeStatus.diagnostics.lastRendererLaunchDeliveredAt = nowIso();
    log.info('[DeepLink] Launch payload delivered to renderer:', payload.action, payload.keledonId);
  } else {
    log.info('[DeepLink] Launch payload buffered until renderer is ready:', payload.action, payload.keledonId);
  }
}

export function flushPendingDeepLinkLaunch(): void {
  if (!pendingRendererLaunch || !mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send('keledon:launch', pendingRendererLaunch);
  runtimeStatus.diagnostics.lastRendererLaunchDeliveredAt = nowIso();
  log.info('[DeepLink] Buffered launch payload flushed to renderer:', pendingRendererLaunch.action, pendingRendererLaunch.keledonId);
}

export function getDeepLinkDiagnostics() {
  return { ...runtimeStatus.diagnostics };
}

export function handleDeepLink(url: string, tabManager: TabManager): void {
  log.info('[DeepLink] Launch protocol received');
  runtimeStatus.diagnostics.lastDeepLinkReceivedAt = nowIso();
  runtimeStatus.diagnostics.lastAutoConnectStatus = 'not_attempted';
  runtimeStatus.diagnostics.lastAutoConnectHttpStatus = null;
  runtimeStatus.diagnostics.lastAutoConnectError = null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'keledon:' || !['launch', 'test'].includes(parsed.hostname)) throw new Error('Unsupported launch protocol');
    const action = parsed.hostname;
    runtimeStatus.diagnostics.lastDeepLinkAction = action || null;

    if (action === 'test') {
      const instructions = parsed.searchParams.get('instructions') || 'No instructions provided';
      const timestamp = parsed.searchParams.get('timestamp') || Date.now().toString();
      runtimeStatus.diagnostics.lastDeepLinkHadRequiredParams = true;
      runtimeStatus.diagnostics.lastDeepLinkValidation = 'ok';
      runtimeStatus.diagnostics.lastLaunchKeledonId = 'test';
      runtimeStatus.diagnostics.lastLaunchCloudUrl = 'https://keledon.tuyoisaza.com';
      log.info('[DeepLink] TEST mode received at', timestamp);
      log.info('[DeepLink] Instructions:', instructions);
      sendLaunchToRenderer({
        keledonId: 'test', code: timestamp,
        cloudUrl: 'https://keledon.tuyoisaza.com', action: 'test', instructions,
      });
      return;
    }

    const keledonId = parsed.searchParams.get('keledonId');
    const code = parsed.searchParams.get('code');
    const userId = parsed.searchParams.get('userId');
    const timestamp = parsed.searchParams.get('timestamp');
    const signature = parsed.searchParams.get('signature');
    const cloudUrl = normalizeTrustedCloudUrl(parsed.searchParams.get('cloudUrl') || process.env.CLOUD_URL || 'https://keledon.tuyoisaza.com');
    const hadRequiredParams = Boolean(keledonId && code && userId && timestamp && signature);

    runtimeStatus.diagnostics.lastDeepLinkHadRequiredParams = hadRequiredParams;
    runtimeStatus.diagnostics.lastLaunchKeledonId = keledonId || null;
    runtimeStatus.diagnostics.lastLaunchCloudUrl = cloudUrl;

    if (!hadRequiredParams || !keledonId || !code || !userId || !timestamp || !signature) {
      runtimeStatus.diagnostics.lastDeepLinkValidation = 'missing_params';
      log.error('[DeepLink] Missing required params'); return;
    }

    const linkTime = /^\d+$/.test(timestamp) ? Number(timestamp) : NaN;
    // Pairing codes are valid for 7 days in the DB; use a generous window
    // (7 days in ms) so that browser protocol handler delays don't invalidate them.
    const PAIRING_CODE_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;
    if (!Number.isFinite(linkTime) || linkTime > Date.now() + 60000 || Date.now() - linkTime > PAIRING_CODE_VALIDITY_MS) {
      runtimeStatus.diagnostics.lastDeepLinkValidation = 'expired';
      log.error('[DeepLink] Link expired'); return;
    }

    const secret = process.env.KELEDON_LAUNCH_SECRET || process.env.KELDEON_LAUNCH_SECRET;
    if (secret) {
      const payload = JSON.stringify([keledonId, userId, timestamp, code, cloudUrl]);
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex').substring(0, 16);
      if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        runtimeStatus.diagnostics.lastDeepLinkValidation = 'invalid_signature';
        return;
      }
      runtimeStatus.diagnostics.lastDeepLinkValidation = 'ok';
    } else {
      // Packaged clients prove the one-time code to their pinned Cloud; no local shared secret is claimed.
      runtimeStatus.diagnostics.lastDeepLinkValidation = 'server_validation_required';
    }

    log.info('[DeepLink] Launch request for keledon:', keledonId);
    runtimeStatus.cloudUrl = cloudUrl;
    runtimeStatus.pendingKeledonId = keledonId;
    runtimeStatus.pendingPairingCode = code;

    // Delegate pairing to the renderer via runtime:connect IPC handler.
    // The main process must NOT call POST /api/devices/pair here — the renderer
    // triggers that single-handedly via the connect button click, preventing
    // the race condition where both main process and renderer consume the
    // same one-time pairing code.
    sendLaunchToRenderer({ keledonId, code, cloudUrl, action: 'auto-connect' });
  } catch (error) {
    runtimeStatus.diagnostics.lastDeepLinkValidation = 'parse_error';
    runtimeStatus.diagnostics.lastAutoConnectStatus = 'not_attempted';
    runtimeStatus.diagnostics.lastAutoConnectError = safeError(error);
    log.error('[DeepLink] Error parsing URL:', error);
  }
}
