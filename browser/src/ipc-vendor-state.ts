/**
 * IPC Vendor State - Vendor login state and credential management
 *
 * Tracks vendor login state, bootstrapped vendors, and provides
 * credential merging between CRUD API and runtime pairing payloads.
 * Extracted from ipc-handlers.ts (v0.3.80).
 *
 * @module ipc-vendor-state
 */

import { eventLogger } from './media/event-logger.js';

/** Track which vendor is currently logging in to prevent concurrent attempts */
export const vendorLoginState = {
  isLoggingIn: false,
  vendorId: null as string | null,
};

/** Track which vendors have been bootstrapped during the session */
export const bootstrappedVendorIds = new Set<string>();

/** Track which team has been bootstrapped */
export let bootstrappedTeamId: string | null = null;

/** Set the bootstrapped team ID */
export function setBootstrappedTeamId(id: string | null): void {
  bootstrappedTeamId = id;
}

/**
 * Merge runtime vendor credentials (from pairing payload) with fetched vendor data (from CRUD API).
 *
 * CRUD API masks passwords as "***" for security. This function preserves the
 * actual credentials from the pairing payload so auto-login continues to work.
 *
 * @param fetchedVendors - Vendors from CRUD API (may have masked passwords)
 * @param existingVendors - Vendors from pairing/runtime (have real credentials)
 * @returns Merged vendor array with preserved runtime credentials
 */
export function mergeRuntimeVendorCredentials(fetchedVendors: any[], existingVendors: any[]): any[] {
  const existingById = new Map(
    (existingVendors || [])
      .filter((vendor: any) => vendor?.id)
      .map((vendor: any) => [vendor.id, vendor]),
  );
  return (fetchedVendors || []).map((vendor: any) => {
    const existing = existingById.get(vendor?.id) || {};
    return {
      ...existing,
      ...vendor,
      // CRUD vendor responses are intentionally masked for management UI display.
      // Preserve encrypted runtime credentials from the pairing payload so browser auto-login
      // uses the actual email/login/password instead of typing "***".
      username: vendor.username === '***' ? existing.username : vendor.username,
      password: vendor.password === '***' ? existing.password : vendor.password,
      apiKey: vendor.apiKey === '***' ? existing.apiKey : vendor.apiKey,
    };
  });
}

/** Log vendor login events */
export function logVendorLogin(action: string, vendorId: string | null, details?: Record<string, unknown>): void {
  eventLogger.info('vendor', action, { vendorId, ...details });
}
