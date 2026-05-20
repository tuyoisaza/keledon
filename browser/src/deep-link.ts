import { app } from 'electron';
import * as crypto from 'crypto';
import log from 'electron-log';
import { runtimeStatus, mainWindow } from './runtime-state.js';
import { connectWebSockets } from './cloud-connection.js';
import { getAutoBrowseBridge, autoLoginToVendor } from './ipc-handlers.js';
import type { TabManager } from './tab-manager.js';

export function handleDeepLink(url: string, tabManager: TabManager): void {
  log.info('[DeepLink] Received:', url);
  try {
    const parsed = new URL(url);
    const action = parsed.hostname;

    if (action === 'test') {
      const instructions = parsed.searchParams.get('instructions') || 'No instructions provided';
      const timestamp = parsed.searchParams.get('timestamp') || Date.now().toString();
      log.info('[DeepLink] TEST mode received at', timestamp);
      log.info('[DeepLink] Instructions:', instructions);
      if (mainWindow) {
        mainWindow.webContents.send('keledon:launch', {
          keledonId: 'test', code: timestamp,
          cloudUrl: 'https://keledon.tuyoisaza.com', action: 'test', instructions,
        });
      }
      return;
    }

    const keledonId = parsed.searchParams.get('keledonId');
    const code = parsed.searchParams.get('code');
    const userId = parsed.searchParams.get('userId');
    const timestamp = parsed.searchParams.get('timestamp');
    const signature = parsed.searchParams.get('signature');
    const cloudUrl = parsed.searchParams.get('cloudUrl') || 'https://keledon.tuyoisaza.com';

    if (!keledonId || !code || !userId || !timestamp || !signature) {
      log.error('[DeepLink] Missing required params'); return;
    }

    const linkTime = parseInt(timestamp);
    if (Date.now() - linkTime > 60000) { log.error('[DeepLink] Link expired'); return; }

    const payload = `${keledonId}:${userId}:${timestamp}`;
    const expectedSignature = crypto.createHmac('sha256', process.env.KELEDON_LAUNCH_SECRET || 'keledon-default-secret')
      .update(payload).digest('hex').substring(0, 16);

    if (signature !== expectedSignature) { log.error('[DeepLink] Invalid signature'); return; }

    log.info('[DeepLink] Valid launch request for keledon:', keledonId);
    runtimeStatus.cloudUrl = cloudUrl;
    runtimeStatus.pendingKeledonId = keledonId;
    runtimeStatus.pendingPairingCode = code;

    if (mainWindow) {
      mainWindow.webContents.send('keledon:launch', { keledonId, code, cloudUrl, action: 'auto-connect' });
    }

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
          log.info('[DeepLink] Auto-connect successful, keledon_id:', data.keledon_id);

          connectWebSockets(runtimeStatus.cloudUrl, data.auth_token, runtimeStatus, tabManager, mainWindow, getAutoBrowseBridge);

          if (data.vendors?.length > 0) { autoLoginToVendor(data.vendors[0], tabManager); }
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
