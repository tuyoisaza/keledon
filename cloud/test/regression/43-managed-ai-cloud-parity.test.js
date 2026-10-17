const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

for (const migration of [
  '20261012000000_add_managed_ai',
  '20261016010000_ai_workflow_metadata',
]) {
  assert.equal(
    read(`cloud/prisma/migrations/${migration}/migration.sql`),
    read(`services/api/prisma/migrations/${migration}/migration.sql`),
    `${migration} must be byte-identical across API and Cloud`,
  );
}

const apiDefaults = read('services/api/src/ai-admin/ai-prompt.defaults.ts');
const cloudDefaults = read('cloud/src/llm/ai-prompt.defaults.ts');
assert.equal(cloudDefaults, apiDefaults, 'Cloud bootstrap definitions must match the API catalog');

const llm = read('cloud/src/llm/llm.service.ts');
assert.match(llm, /managedAi\.prepare\(\s*feature,\s*managedInput,?\s*\)/);
assert.match(llm, /managedAi\.validateOutput\(/);
assert.match(llm, /managedAi\.recordUsage\(/);
assert.doesNotMatch(llm, /DECIDE_ACTION_TOOL|buildSystemPrompt\(/);

const brain = read('cloud/src/controllers/brain.controller.ts');
assert.match(brain, /actorId:\s*actor\.id/);
assert.match(brain, /teamId:\s*actor\.teamId/);
const decisions = read('cloud/src/services/decision-engine.service.ts');
assert.match(decisions, /teamId:\s*session\.teamId/);
assert.match(decisions, /userId:\s*session\.userId/);

console.log('PASS Cloud AI runtime uses shared managed contracts, DB identities and attribution.');
