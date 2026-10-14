const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../../..');
const backends = ['services/api', 'cloud'];

for (const backend of backends) {
  const source = fs.readFileSync(
    path.join(repoRoot, backend, 'src/devices/device.service.ts'),
    'utf8',
  );
  const vendorProjection = source.match(
    /response\.vendors\s*=\s*vendors\.map\(\(v\)\s*=>\s*\(\{([\s\S]*?)\}\)\)/,
  )?.[1];

  assert.ok(vendorProjection, `${backend} must map paired vendor settings`);
  assert.match(vendorProjection, /baseUrl:\s*v\.baseUrl/);
  assert.match(vendorProjection, /allowedOrigins:\s*getVendorAllowedOrigins/);
  assert.match(
    vendorProjection,
    /username:\s*v\.username\s*\?\s*encryptVendorSecretForPairing\(v\.username\)/,
  );
  assert.match(vendorProjection, /startGoal:\s*v\.startGoal\s*\|\|\s*null/);
  assert.match(vendorProjection, /isActive:\s*v\.isActive/);
}

console.log('API/Cloud paired vendor runtime payload parity passed');
