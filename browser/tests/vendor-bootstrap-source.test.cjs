const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'ipc-handlers.ts'), 'utf8');

// Regression: CRUD vendor list intentionally masks credentials for the web UI.
// Browser runtime must preserve encrypted credentials from the pairing payload when it later
// fetches CRUD vendors to obtain startGoal; otherwise auto-login types "***" instead of email.
assert.match(source, /mergeRuntimeVendorCredentials/);
assert.match(source, /vendor\.username\s*===\s*'\*\*\*'/);
assert.match(source, /vendors\s*=\s*mergeRuntimeVendorCredentials\(data,\s*runtimeStatus\.vendors\)/);
assert.match(source, /runtimeStatus\.vendors\s*=\s*vendors/);

console.log('vendor bootstrap source tests passed');
