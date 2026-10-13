const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rendererDir = path.join(__dirname, '..', 'renderer');
const html = fs.readFileSync(path.join(rendererDir, 'index.html'), 'utf8');
const stylesheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((match) => match[1]);
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((match) => match[1]);

assert.deepEqual(stylesheets, ['./renderer-base.css', './renderer-controls.css']);
assert.deepEqual(scripts, ['./version-actions.js', './renderer-shell.js', './renderer-panels.js']);

for (const asset of [...stylesheets, ...scripts]) {
  assert.equal(fs.existsSync(path.join(rendererDir, asset)), true, `missing renderer asset: ${asset}`);
}

for (const file of ['index.html', 'renderer-base.css', 'renderer-controls.css', 'renderer-shell.js', 'renderer-panels.js']) {
  const lines = fs.readFileSync(path.join(rendererDir, file), 'utf8').split(/\r?\n/).length;
  assert.ok(lines <= 600, `${file} exceeds the PHDK 600-line limit (${lines})`);
}

assert.doesNotMatch(html, /<style\b|<script\s*>/i, 'renderer HTML should load bounded external assets');

console.log('renderer module boundaries and PHDK file-size checks passed');
