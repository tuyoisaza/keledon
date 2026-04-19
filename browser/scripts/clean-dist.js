/**
 * clean-dist.js - Pre-build cleanup to reduce installer size
 * 
 * Removes leftover artifacts from previous builds that bloat the installer:
 * - Old installer .exe files (keeps only the latest)
 * - win-unpacked/ directory (full Electron+Chromium copy, gets regenerated)
 * - stale .blockmap and .zip files
 * 
 * Run: node scripts/clean-dist.js
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

function cleanDist() {
  console.log('[clean-dist] Starting pre-build cleanup...');

  if (!fs.existsSync(distDir)) {
    console.log('[clean-dist] dist/ does not exist yet, nothing to clean');
    return;
  }

  const entries = fs.readdirSync(distDir);
  let cleaned = 0;
  let freedBytes = 0;

  for (const entry of entries) {
    const fullPath = path.join(distDir, entry);
    const stat = fs.statSync(fullPath);

    if (entry === 'win-unpacked') {
      // win-unpacked is a full unpacked Electron app - regenerated on each build
      const size = getDirSize(fullPath);
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`[clean-dist] Removed win-unpacked/ (${formatBytes(size)})`);
      freedBytes += size;
      cleaned++;
    } else if (entry.endsWith('.exe')) {
      // Keep only the newest .exe (NSIS creates a new one each build)
      // Remove older builds - they can be several hundred MB each
      const size = stat.size;
      fs.unlinkSync(fullPath);
      console.log(`[clean-dist] Removed old installer: ${entry} (${formatBytes(size)})`);
      freedBytes += size;
      cleaned++;
    } else if (entry.endsWith('.blockmap') || entry.endsWith('.zip')) {
      // Stale delta/update files from previous builds
      const size = stat.size;
      fs.unlinkSync(fullPath);
      console.log(`[clean-dist] Removed stale: ${entry} (${formatBytes(size)})`);
      freedBytes += size;
      cleaned++;
    } else if (stat.isDirectory()) {
      // Remove any other leftover build directories
      const size = getDirSize(fullPath);
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`[clean-dist] Removed stale directory: ${entry}/ (${formatBytes(size)})`);
      freedBytes += size;
      cleaned++;
    }
  }

  if (cleaned === 0) {
    console.log('[clean-dist] No cleanup needed - dist/ is clean');
  } else {
    console.log(`[clean-dist] Cleaned ${cleaned} items, freed ${formatBytes(freedBytes)}`);
  }
}

function getDirSize(dir) {
  let size = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        size += getDirSize(fullPath);
      } else {
        size += fs.statSync(fullPath).size;
      }
    }
  } catch {
    // ignore errors
  }
  return size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

cleanDist();