import { readFileSync } from 'fs';
import { join } from 'path';

let _version: string | undefined;

/**
 * Application version, read from package.json at first access.
 * Falls back to env API_VERSION or '0.0.0'.
 */
export function getApiVersion(): string {
  if (_version) return _version;
  // Check env first (overridable via Railway)
  if (process.env.API_VERSION) {
    _version = process.env.API_VERSION;
    return _version;
  }
  try {
    const pkgPath = join(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    _version = pkg.version || '0.0.0';
  } catch {
    _version = '0.0.0';
  }
  return _version;
}
