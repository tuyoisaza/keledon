import * as crypto from 'crypto';
import log from 'electron-log';
import { runtimeStatus, mainWindow } from './runtime-state.js';
import { connectWebSockets } from './cloud-connection.js';
import { getAutoBrowseBridge, autoLoginToVendor } from './ipc-handlers.js';
import { transcriptMonitor } from './media/transcript-monitor.js';
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
  log.info('[DeepLink] Received:', url);
  runtimeStatus.diagnostics.lastDeepLinkReceivedAt = nowIso();
  runtimeStatus.diagnostics.lastAutoConnectStatus = 'not_attempted';
  runtimeStatus.diagnostics.lastAutoConnectHttpStatus = null;
  runtimeStatus.diagnostics.lastAutoConnectError = null;

  try {
    const parsed = new URL(url);
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
    const cloudUrl = parsed.searchParams.get('cloudUrl') || 'https://keledon.tuyoisaza.com';
    const hadRequiredParams = Boolean(keledonId && code && userId && timestamp && signature);

    runtimeStatus.diagnostics.lastDeepLinkHadRequiredParams = hadRequiredParams;
    runtimeStatus.diagnostics.lastLaunchKeledonId = keledonId || null;
    runtimeStatus.diagnostics.lastLaunchCloudUrl = cloudUrl;

    if (!hadRequiredParams || !keledonId || !code || !userId || !timestamp || !signature) {
      runtimeStatus.diagnostics.lastDeepLinkValidation = 'missing_params';
      log.error('[DeepLink] Missing required params'); return;
    }

    const linkTime = parseInt(timestamp, 10);
    if (!Number.isFinite(linkTime) || Date.now() - linkTime > 60000) {
      runtimeStatus.diagnostics.lastDeepLinkValidation = 'expired';
      log.error('[DeepLink] Link expired'); return;
    }

    const payload = `${keledonId}:${userId}:${timestamp}`;
    const launchSecret = process.env.KELEDON_LAUNCH_SECRET || process.env.KELDEON_LAUNCH_SECRET || 'keledon-default-secret';
    const expectedSignature = crypto.createHmac('sha256', launchSecret)
      .update(payload).digest('hex').substring(0, 16);

    if (signature === expectedSignature) {
      runtimeStatus.diagnostics.lastDeepLinkValidation = 'ok';
      log.info('[DeepLink] Signature verified for keledon:', keledonId);
    } else {
      runtimeStatus.diagnostics.lastDeepLinkValidation = 'invalid_signature';
      log.warn('[DeepLink] Signature mismatch; continuing to server-side pairing validation because packaged clients may not have KELEDON_LAUNCH_SECRET');
    }

    log.info('[DeepLink] Launch request for keledon:', keledonId);
    runtimeStatus.cloudUrl = cloudUrl;
    runtimeStatus.pendingKeledonId = keledonId;
    runtimeStatus.pendingPairingCode = code;

    sendLaunchToRenderer({ keledonId, code, cloudUrl, action: 'auto-connect' });

    (async () => {
      try {
        const response = await fetch(`${runtimeStatus.cloudUrl}/api/devices/pair`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_id: runtimeStatus.deviceId, machine_id: runtimeStatus.deviceId,
            pairing_code: code, platform: process.platform,
            name: 'KELEDON Desktop Agent', keledon_id: keledonId,
          }),
        });

        runtimeStatus.diagnostics.lastAutoConnectHttpStatus = response.status;

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
          runtimeStatus.diagnostics.lastAutoConnectStatus = 'ok';
          runtimeStatus.diagnostics.lastAutoConnectError = null;
          transcriptMonitor.setTriggers(runtimeStatus.escalationTriggers);
          log.info('[DeepLink] Auto-connect successful, keledon_id:', data.keledon_id);

          connectWebSockets(runtimeStatus.cloudUrl, data.auth_token, runtimeStatus, tabManager, mainWindow, getAutoBrowseBridge);

          if (data.vendors?.length > 0) { autoLoginToVendor(data.vendors[0], tabManager); }
        } else {
          runtimeStatus.diagnostics.lastAutoConnectStatus = 'http_error';
          runtimeStatus.diagnostics.lastAutoConnectError = `HTTP ${response.status}`;
          log.error('[DeepLink] Auto-connect failed:', response.status);
        }
      } catch (error) {
        runtimeStatus.diagnostics.lastAutoConnectStatus = 'exception';
        runtimeStatus.diagnostics.lastAutoConnectError = safeError(error);
        log.error('[DeepLink] Auto-connect error:', error);
      }
    })();
  } catch (error) {
    runtimeStatus.diagnostics.lastDeepLinkValidation = 'parse_error';
    runtimeStatus.diagnostics.lastAutoConnectStatus = 'not_attempted';
    runtimeStatus.diagnostics.lastAutoConnectError = safeError(error);
    log.error('[DeepLink] Error parsing URL:', error);
  }
}
