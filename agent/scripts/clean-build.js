#!/usr/bin/env node

/**
 * Clean Build Script
 * Removes build artifacts and temporary files
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning build artifacts...');

const buildDir = path.join(__dirname, '../dist');

if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true, force: true });
  console.log('✅ Removed dist/ directory');
} else {
  console.log('ℹ️  No dist/ directory to clean');
}

// Clean any temporary files
let cleanedCount = 0;
try {
  const tempFiles = [
    path.join(__dirname, '../agent.log'),
    path.join(__dirname, '../extension/extension.log')
  ];
  
  for (const file of tempFiles) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      cleanedCount++;
    }
  }
} catch (error) {
  // Ignore errors for temp files
}

if (cleanedCount > 0) {
  console.log(`✅ Removed ${cleanedCount} temporary files`);
}

console.log('🎉 Clean completed!');