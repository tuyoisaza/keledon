#!/usr/bin/env node

/**
 * Chrome Extension Build Script
 * Creates a production-ready build of the KELEDON extension
 */

const fs = require('fs');
const path = require('path');

console.log('🔨 Building KELEDON Chrome Extension...');

const sourceDir = path.join(__dirname, '../extension');
const buildDir = path.join(__dirname, '../dist');

// Clean and create build directory
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true, force: true });
}
fs.mkdirSync(buildDir, { recursive: true });

// Function to copy directory recursively
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      // Copy file and validate JSON
      if (entry.name.endsWith('.json')) {
        try {
          const content = fs.readFileSync(srcPath, 'utf8');
          JSON.parse(content); // Validate JSON
          fs.writeFileSync(destPath, content);
          console.log(`✅ ${entry.name} (validated)`);
        } catch (error) {
          console.error(`❌ Invalid JSON in ${entry.name}:`, error.message);
          process.exit(1);
        }
      } else {
        fs.copyFileSync(srcPath, destPath);
        console.log(`📄 ${entry.name}`);
      }
    }
  }
}

// Copy extension files
console.log('\n📁 Copying extension files...');
copyDirectory(sourceDir, buildDir);

// Validate critical files
console.log('\n🔍 Validating critical files...');
const criticalFiles = [
  'manifest.json',
  'background/main.js',
  'background/background-service.js',
  'ui/sidepanel.html',
  'ui/sidepanel.js',
  'content_scripts/webrtc-audio-injector.js'
];

for (const file of criticalFiles) {
  const filePath = path.join(buildDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing critical file: ${file}`);
    process.exit(1);
  }
  console.log(`✅ ${file}`);
}

// Check syntax of JavaScript files using Node.js
console.log('\n🔍 Checking JavaScript syntax...');
const jsFiles = [
  'background/main.js',
  'background/background-service.js',
  'ui/sidepanel.js',
  'content_scripts/webrtc-audio-injector.js'
];

for (const file of jsFiles) {
  const filePath = path.join(buildDir, file);
  try {
    // Use Node.js to check syntax
    const { execSync } = require('child_process');
    execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
    console.log(`✅ ${file} (syntax OK)`);
  } catch (error) {
    console.error(`❌ Syntax error in ${file}:`, error.message);
    process.exit(1);
  }
}

// Create build info
const buildInfo = {
  buildTime: new Date().toISOString(),
  version: require('../package.json').version,
  files: criticalFiles,
  nodeVersion: process.version,
  platform: process.platform
};

fs.writeFileSync(
  path.join(buildDir, 'build-info.json'),
  JSON.stringify(buildInfo, null, 2)
);

console.log('\n🎉 Build completed successfully!');
console.log(`📦 Extension built to: ${buildDir}`);
console.log('\n📋 Next steps:');
console.log('1. Open Chrome and go to chrome://extensions/');
console.log('2. Enable "Developer mode"');
console.log('3. Click "Load unpacked"');
console.log(`4. Select the dist/ folder: ${buildDir}`);
console.log('\n✨ Extension is ready to load!');