/**
 * Pre-build cleanup: removes stale installer artifacts from dist/
 * so they don't bloat the next build's ASAR bundle.
 * Run via: npm run predist (auto-runs before npm run dist)
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(distDir)) {
  console.log('[clean-dist] dist/ not found, nothing to clean');
  process.exit(0);
}

let cleaned = 0;

// Delete old .exe installers
const files = fs.readdirSync(distDir);
for (const f of files) {
  const fullPath = path.join(distDir, f);
  const ext = path.extname(f).toLowerCase();
  if (['.exe', '.blockmap'].includes(ext) || f.endsWith('.yml')) {
    fs.unlinkSync(fullPath);
    console.log(`[clean-dist] Deleted: ${f}`);
    cleaned++;
  }
}

// Delete win-unpacked directory
const winUnpacked = path.join(distDir, 'win-unpacked');
if (fs.existsSync(winUnpacked)) {
  fs.rmSync(winUnpacked, { recursive: true, force: true });
  console.log('[clean-dist] Deleted: win-unpacked/');
  cleaned++;
}

// Delete packaged directory (old build artifacts)
const packaged = path.join(distDir, 'packaged');
if (fs.existsSync(packaged)) {
  fs.rmSync(packaged, { recursive: true, force: true });
  console.log('[clean-dist] Deleted: packaged/');
  cleaned++;
}

console.log(`[clean-dist] Done — ${cleaned} item(s) removed`);
