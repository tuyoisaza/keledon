const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');

// Regression: a goal with one failed step can still continue and return `uncertain`.
// The UI must show that as partial progress, not as a hard failed/stopped goal.
assert.match(source, /partial\s*=\s*result\.goal_status\s*===\s*['"]uncertain['"]/);
assert.match(source, /status:\s*success\s*\?\s*['"]completed['"]\s*:\s*partial\s*\?\s*['"]in_progress['"]\s*:\s*['"]failed['"]/);

console.log('renderer partial goal source tests passed');
