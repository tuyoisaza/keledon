import { runtimeStatus, mainWindow } from './runtime-state.js';
import log from 'electron-log';
import type { TabManager } from './tab-manager.js';
import { vendorLoginState, bootstrappedVendorIds, bootstrappedTeamId, setBootstrappedTeamId, mergeRuntimeVendorCredentials } from './ipc-vendor-state.js';
import { getAutoBrowseBridge } from './ipc-bridge.js';

// ===================== VENDOR LOGIN =====================

function decrypt(text: string): string {
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
    return text;
  }
}

export function enrichGoalInputsFromRuntimeVendor(goal: any, baseInputs: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  const inputs = { ...(baseInputs || {}) };
  const vendorId = goal?.vendor_id || goal?.vendorId || goal?.metadata?.vendor_id || goal?.metadata?.vendorId || inputs.vendor_id || inputs.vendorId;
  if (!vendorId || !Array.isArray(runtimeStatus.vendors)) {
    return Object.keys(inputs).length > 0 ? inputs : baseInputs;
  }

  const vendor = runtimeStatus.vendors.find((candidate: any) => candidate?.id === vendorId);
  if (!vendor) {
    return Object.keys(inputs).length > 0 ? inputs : baseInputs;
  }

  // Server-origin launch goals only carry a vendor id. The desktop has the encrypted
  // pairing payload and can safely decrypt locally so the browser uses the real email/login
  // value without the cloud command needing to include or log raw credentials.
  if (vendor.username && !inputs.username && !inputs.email && !inputs.login) {
    const username = decrypt(vendor.username);
    inputs.username = username;
    inputs.email = username;
    inputs.login = username;
  }
  if (vendor.password && !inputs.password) {
    inputs.password = decrypt(vendor.password);
  }
  if (vendor.apiKey && !inputs.apiKey) {
    inputs.apiKey = decrypt(vendor.apiKey);
  }
  return Object.keys(inputs).length > 0 ? inputs : baseInputs;
}

export async function autoLoginToVendor(vendor: any, tabManager: TabManager): Promise<boolean> {
  if (vendorLoginState.isLoggingIn || !vendor.baseUrl) {
    log.warn('[Vendor] Skipping login - already logging in or no baseUrl');
    return false;
  }

  vendorLoginState.isLoggingIn = true;
  vendorLoginState.vendorId = vendor.id;

  try {
    const username = vendor.username ? decrypt(vendor.username) : null;
    const password = vendor.password ? decrypt(vendor.password) : null;
    const apiKey = vendor.apiKey ? decrypt(vendor.apiKey) : null;

    log.info('[Vendor] Auto-login to:', vendor.name, vendor.baseUrl);

    // Create NEW TAB for vendor instead of replacing main window
    tabManager.createTab(vendor.name, vendor.baseUrl);

    const bridge = await getAutoBrowseBridge();
    if (!bridge.isAutoBrowseInitialized()) {
      log.error('[Vendor] AutoBrowse not initialized, cannot login');
      return false;
    }

    // Wait for tab to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    let loginGoal = '';
    if (vendor.startGoal) {
      // Use custom start goal from vendor config
      loginGoal = vendor.startGoal;
      log.info('[Vendor] Using custom start goal:', loginGoal);
    } else if (username && password) {
      loginGoal = `Login to ${vendor.name} with username "${username}" and password "${password}"`;
    } else if (apiKey) {
      loginGoal = `Login to ${vendor.name} using API key`;
    }

    if (!loginGoal) {
      log.warn('[Vendor] No login credentials available for:', vendor.name);
      return false;
    }

    log.info('[Vendor] Executing login goal:', loginGoal);
    const result = await bridge.executeGoal({
      execution_id: `vendor-login-${Date.now()}`,
      goal: loginGoal,
      inputs: { username, password, apiKey },
      constraints: { max_steps: 20, timeout_ms: 60000 },
    });

    log.info('[Vendor] Login result:', result.goal_status);
    mainWindow?.webContents.send('vendor:login', {
      vendorId: vendor.id,
      vendorName: vendor.name,
      status: result.goal_status,
      timestamp: new Date().toISOString(),
    });
    return result.goal_status === 'success';
  } catch (error) {
    log.error('[Vendor] Auto-login error:', error);
    return false;
  } finally {
    vendorLoginState.isLoggingIn = false;
  }
}

export async function bootstrapTeamVendors(tabManager: TabManager): Promise<void> {
  const teamId = runtimeStatus.teamId;
  if (!teamId) {
    log.info('[Vendor] No team loaded yet; skipping vendor bootstrap');
    return;
  }

  if (bootstrappedTeamId !== teamId) {
    bootstrappedVendorIds.clear();
    setBootstrappedTeamId(teamId);
  }

  let vendors = Array.isArray(runtimeStatus.vendors) ? [...runtimeStatus.vendors] : [];

  try {
    const response = await fetch(`${runtimeStatus.cloudUrl}/api/crud/vendors/${teamId}`);
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        vendors = mergeRuntimeVendorCredentials(data, runtimeStatus.vendors);
        runtimeStatus.vendors = vendors;
        log.info('[Vendor] Loaded vendors from cloud:', data.length);
      }
    } else {
      log.warn('[Vendor] Vendor query failed:', response.status, response.statusText);
    }
  } catch (error) {
    log.warn('[Vendor] Vendor query errored; falling back to launch payload vendors:', error);
  }

  const runnableVendors = vendors.filter((vendor: any) => vendor?.id && vendor?.baseUrl && vendor.isActive !== false);
  if (runnableVendors.length === 0) {
    log.info('[Vendor] No runnable vendors found for team:', teamId);
    return;
  }

  log.info('[Vendor] Bootstrapping vendor connections for team:', teamId, 'count:', runnableVendors.length);
  for (const vendor of runnableVendors) {
    if (bootstrappedVendorIds.has(vendor.id)) {
      continue;
    }
    const success = await autoLoginToVendor(vendor, tabManager);
    if (success) {
      bootstrappedVendorIds.add(vendor.id);
    }
  }
}
