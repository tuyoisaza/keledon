#!/usr/bin/env node

/**
 * Extension Validation Script
 * Validates the Chrome extension structure and files
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

console.log('🔍 Validating KELEDON Chrome Extension...');

const extensionDir = path.join(__dirname, '../extension');

// Check manifest.json
const manifestPath = path.join(extensionDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('❌ manifest.json not found');
  process.exit(1);
}

try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // Validate manifest structure
  if (manifest.manifest_version !== 3) {
    console.error('❌ Manifest must be version 3');
    process.exit(1);
  }
  
  if (!manifest.name || !manifest.version) {
    console.error('❌ Manifest missing name or version');
    process.exit(1);
  }
  
  // Check for invalid permissions
  const invalidPermissions = ['microphone', 'audioCapture'];
  const foundInvalid = manifest.permissions?.filter(p => invalidPermissions.includes(p));
  if (foundInvalid && foundInvalid.length > 0) {
    console.error(`❌ Invalid permissions found: ${foundInvalid.join(', ')}`);
    process.exit(1);
  }
  
  console.log('✅ manifest.json is valid');
} catch (error) {
  console.error('❌ Invalid manifest.json:', error.message);
  process.exit(1);
}

// Check critical files
const criticalFiles = [
  'background/main.js',
  'background/background-service.js',
  'ui/sidepanel.html',
  'ui/sidepanel.js',
  'content_scripts/webrtc-audio-injector.js'
];

for (const file of criticalFiles) {
  const filePath = path.join(extensionDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing critical file: ${file}`);
    process.exit(1);
  }
  console.log(`✅ ${file}`);
}

// Check JavaScript syntax using Node.js
const jsFiles = [
  'background/main.js',
  'background/background-service.js',
  'ui/sidepanel.js',
  'content_scripts/webrtc-audio-injector.js'
];

console.log('\n🔍 Checking JavaScript syntax...');
for (const file of jsFiles) {
  const filePath = path.join(extensionDir, file);
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

// Validate every local script loaded by either side panel, in browser order.
const panelHtmlFiles = ['ui/sidepanel.html', 'ui/sidepanel-pipeline.html'];
const sidepanelCheckDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keledon-sidepanel-'));
try {
  for (const panelFile of panelHtmlFiles) {
    const htmlPath = path.join(extensionDir, panelFile);
    const html = fs.readFileSync(htmlPath, 'utf8');
    const scripts = [...html.matchAll(/<script\s+src=["']([^"']+)["']/gi)]
      .map((match) => path.resolve(path.dirname(htmlPath), match[1]));

    for (const scriptPath of scripts) {
      if (!fs.existsSync(scriptPath)) {
        throw new Error(`Missing ${path.relative(extensionDir, scriptPath)} loaded by ${panelFile}`);
      }
    }

    const bundlePath = path.join(sidepanelCheckDir, `${path.basename(panelFile, '.html')}.js`);
    const bundle = scripts
      .map((scriptPath) => fs.readFileSync(scriptPath, 'utf8'))
      .join('\n;\n');
    fs.writeFileSync(bundlePath, bundle);
    execFileSync(process.execPath, ['--check', bundlePath], { stdio: 'pipe' });
    console.log(`✅ ${panelFile}: ${scripts.length} scripts exist and parse together in HTML order`);
  }
} catch (error) {
  console.error('❌ Side panel script validation failed:', error.message);
  process.exitCode = 1;
} finally {
  fs.rmSync(sidepanelCheckDir, { recursive: true, force: true });
}

// Check core modules using Node.js
const coreModules = [
  '../src/core/session-manager.js',
  '../src/core/websocket-client.js',
  '../src/core/stt-manager.js',
  '../src/core/tts-manager.js'
];

console.log('\n🔍 Checking core modules...');
for (const module of coreModules) {
  const modulePath = path.join(__dirname, module);
  if (!fs.existsSync(modulePath)) {
    console.error(`❌ Missing core module: ${module}`);
    process.exit(1);
  }
  
  try {
    // Use Node.js to check syntax
    const { execSync } = require('child_process');
    execSync(`node --check "${modulePath}"`, { stdio: 'pipe' });
    console.log(`✅ ${module} (syntax OK)`);
  } catch (error) {
    console.error(`❌ Syntax error in ${module}:`, error.message);
    process.exit(1);
  }
}

console.log('\n🎉 Extension validation passed!');
console.log('✨ All files are present and syntactically correct');
console.log('🚀 Ready to build with: npm run build');
