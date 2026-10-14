const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rendererDir = path.join(__dirname, '..', 'renderer');
const html = fs.readFileSync(path.join(rendererDir, 'index.html'), 'utf8');
const stylesheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((match) => match[1]);
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((match) => match[1]);

assert.deepEqual(stylesheets, ['./renderer-base.css', './renderer-controls.css']);
assert.deepEqual(scripts, ['./version-actions.js', './renderer-shell.js', './renderer-panels.js']);

const packageVersion = require('../package.json').version;
assert.match(packageVersion, /^\d+\.\d+\.\d+$/);
assert.match(html, new RegExp(`<span id="versionBtn">v${packageVersion.replaceAll('.', '\\.')}<\\/span>`));
assert.match(fs.readFileSync(path.join(rendererDir, 'version-actions.js'), 'utf8'), /device\.getInfo\(\)\.then\(\(info/);
assert.match(html, /id="consoleBtn"[^>]*\shidden>/, 'diagnostic console starts hidden');
assert.match(fs.readFileSync(path.join(rendererDir, 'renderer-controls.css'), 'utf8'), /\.console-btn\[hidden\]\s*\{\s*display:\s*none\s*;?\s*\}/);
const ipcHandlers = fs.readFileSync(path.join(__dirname, '../src/ipc-handlers.ts'), 'utf8');
const deviceInfoHandler = ipcHandlers.match(/ipcMain\.handle\('device:getInfo',[\s\S]*?\n  \}\)\);/);
assert.ok(deviceInfoHandler, 'device info IPC handler exists');
for (const privateField of ['deviceId:', 'logsDir:', 'mainLogPath:', 'startupLogPath:']) {
  assert.ok(!deviceInfoHandler[0].includes(privateField), `device info does not expose ${privateField}`);
}
assert.doesNotMatch(ipcHandlers, /brain:setDebugMode|setDebugMode\(/, 'renderer IPC cannot override main-process debug configuration');
assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '../src/preload.ts'), 'utf8'), /setDebugMode/, 'preload exposes no debug-mode setter');
assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '../src/runtime-state.ts'), 'utf8'), /setDebugMode/, 'runtime debug state cannot be changed after startup');

for (const asset of [...stylesheets, ...scripts]) {
  assert.equal(fs.existsSync(path.join(rendererDir, asset)), true, `missing renderer asset: ${asset}`);
}

for (const file of ['index.html', 'renderer-base.css', 'renderer-controls.css', 'renderer-shell.js', 'renderer-panels.js']) {
  const lines = fs.readFileSync(path.join(rendererDir, file), 'utf8').split(/\r?\n/).length;
  assert.ok(lines <= 600, `${file} exceeds the PHDK 600-line limit (${lines})`);
}

assert.doesNotMatch(html, /<style\b|<script\s*>/i, 'renderer HTML should load bounded external assets');

console.log('renderer module boundaries and PHDK file-size checks passed');
