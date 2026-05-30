const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sourcePath = path.join(__dirname, '..', 'src', 'cloud-connection.ts');
const source = fs.readFileSync(sourcePath, 'utf8');

assert.match(
  source,
  /function\s+enrichCloudGoalInputsFromRuntimeVendor\s*\(/,
  'cloud goal_execute handler should have a local runtime-vendor credential enrichment helper',
);

assert.match(
  source,
  /const\s+enrichedInputs\s*=\s*enrichCloudGoalInputsFromRuntimeVendor\(data,\s*data\.inputs\)/,
  'goal_execute should enrich inputs before calling AutoBrowse',
);

assert.match(
  source,
  /inputs:\s*enrichedInputs/,
  'AutoBrowse executeGoal should receive enriched inputs, not raw data.inputs',
);

assert.match(
  source,
  /inputs\.login\s*=\s*username/,
  'enrichment should expose username as login so sites with login fields use the saved email',
);

assert.doesNotMatch(
  source,
  /cmdlog\.log\([^\n]*(username|password|apiKey)\s*[:=]/,
  'cloud connection must not log raw credential values while enriching runtime inputs',
);

console.log('cloud goal_execute runtime credential source tests passed');
