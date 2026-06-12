import { readFileSync } from 'fs';
import { join } from 'path';

let _version: string | undefined;

/**
 * Application version, read from package.json at first access.
 * Uses process.cwd() (reliable in Railway) or env override.
 */
export function getApiVersion(): string {
  if (_version) return _version;
  // Check env first (overridable via Railway)
  if (process.env.API_VERSION) {
    _version = process.env.API_VERSION;
    return _version;
  }
  try {
    // Try cwd first (reliable in Railway container)
    const pkgPath = join(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    _version = pkg.version || '0.0.0';
    return _version;
  } catch {
    // Fallback: try __dirname path
    try {
      const pkgPath = join(__dirname, '..', '..', 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      _version = pkg.version || '0.0.0';
      return _version;
    } catch {
      _version = '0.0.0';
      return _version;
    }
  }
}
