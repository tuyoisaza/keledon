import * as path from 'path';
import { fileURLToPath } from 'url';

export interface VendorNotification {
  title: string;
  body: string;
  silent: boolean;
}

/** Keep app and vendor renderers isolated from Node and enforce Chromium origin checks. */
export function secureRendererPreferences(preload: string) {
  return {
    preload,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
  } as const;
}

export function isAllowedVendorUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const webProtocol = url.protocol === 'https:' || url.protocol === 'http:';
    return webProtocol && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function isAllowedConfiguredVendorUrl(
  value: string,
  allowedOrigins: unknown,
): boolean {
  try {
    const url = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      Array.isArray(allowedOrigins) &&
      allowedOrigins.includes(url.origin)
    );
  } catch {
    return false;
  }
}

export function getAllowedVendorOrigins(vendor: {
  baseUrl?: unknown;
  url?: unknown;
  allowedOrigins?: unknown;
}): string[] {
  const origins = new Set<string>();
  const baseUrl = vendor.baseUrl || vendor.url;
  if (typeof baseUrl === 'string') {
    try {
      const url = new URL(baseUrl);
      if (
        ['http:', 'https:'].includes(url.protocol) &&
        !url.username &&
        !url.password
      ) {
        origins.add(url.origin);
      }
    } catch { /* malformed persisted base URL is excluded */ }
  }
  if (Array.isArray(vendor.allowedOrigins)) {
    for (const candidate of vendor.allowedOrigins) {
      if (typeof candidate !== 'string') continue;
      try {
        const url = new URL(candidate);
        if (
          ['http:', 'https:'].includes(url.protocol) &&
          !url.username &&
          !url.password &&
          url.pathname === '/' &&
          !url.search &&
          !url.hash &&
          url.origin === candidate
        ) {
          origins.add(url.origin);
        }
      } catch { /* malformed persisted origin is excluded */ }
    }
  }
  return [...origins];
}

/** The executor may create a restricted, empty tab before Cloud selects a vendor. */
export function isAllowedVendorTabUrl(value: string): boolean {
  return value === 'about:blank' || isAllowedVendorUrl(value);
}

/** A privileged app preload must never follow the trusted UI into remote content. */
export function isTrustedAppRendererUrl(
  candidate: string,
  trustedFile: string,
): boolean {
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'file:') return false;
    const actual = path.resolve(fileURLToPath(url));
    const expected = path.resolve(trustedFile);
    return process.platform === 'win32'
      ? actual.toLowerCase() === expected.toLowerCase()
      : actual === expected;
  } catch {
    return false;
  }
}

/** Accept only bounded, text-only notification data from a known vendor view. */
export function sanitizeVendorNotification(
  value: unknown,
): VendorNotification | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (typeof input.title !== 'string') return null;
  const title = input.title.trim();
  if (!title) return null;
  const body = typeof input.body === 'string' ? input.body : '';
  return {
    title: title.slice(0, 120),
    body: body.slice(0, 500),
    silent: input.silent === true,
  };
}
