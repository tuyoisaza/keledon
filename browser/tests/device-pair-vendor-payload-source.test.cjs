const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', '..', 'services', 'api', 'src', 'devices', 'device.service.ts'), 'utf8');

// Regression: pairing payload must include runtime vendor startGoal and active flag together
// with encrypted credentials, so the browser can start immediately without replacing
// credentials with masked CRUD values.
assert.match(source, /response\.vendors\s*=\s*vendors\.map/);
assert.match(source, /username:\s*v\.username\s*\?\s*this\.encrypt\(v\.username\)/);
assert.match(source, /startGoal:\s*v\.startGoal\s*\|\|\s*null/);
assert.match(source, /isActive:\s*v\.isActive/);

console.log('device pair vendor payload source tests passed');
