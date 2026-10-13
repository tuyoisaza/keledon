const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cloudSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'cloud-connection.ts'), 'utf8');
const helperSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'cloud-helpers.ts'), 'utf8');
const plannerSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'goal-planner.ts'), 'utf8');

// Regression: direct cloud goal_execute bypassed the renderer IPC path, so it skipped
// local vendor credential enrichment and could execute with only { vendor_id }.
assert.match(helperSource, /function enrichGoalExecuteDataFromRuntimeVendor/);
assert.match(helperSource, /inputs\.email\s*=\s*username/);
assert.match(helperSource, /inputs\.login\s*=\s*username/);
assert.match(cloudSource, /bridge\.executeGoal\(enrichedGoalData\)/);

// Regression: the direct cloud path also skipped the renderer IPC BrowserView guard.
assert.match(cloudSource, /ensureActiveGoalTab/);
assert.match(helperSource, /tabManager\.createTab\('Goal Execution', 'about:blank'\)/);
assert.match(helperSource, /bridge\.setTabs\(tabManager\.getInternalTabs\(\), tabManager\.getActiveTabId\(\)\)/);

// Diagnostic regression: activity log must show enough result detail to know if the
// planner actualized the goal into multiple steps, without printing raw credentials.
assert.match(cloudSource, /goal_execute result:/);
assert.match(cloudSource, /steps=\$\{result\.steps\?\.length \?\? 0\}/);

// Security regression: login identifiers and passwords should be redacted in progress/log descriptions.
assert.match(plannerSource, /sanitizeInputs\(goal\)/, 'known private inputs must be removed from the Cloud goal text');
assert.match(plannerSource, /description: `\$\{step.type\} step`/, 'model text cannot expose credential progress descriptions');
assert.doesNotMatch(plannerSource, /Fill \$\{field\} with \$\{value\}/, 'fill descriptions must not blindly print credential values');

console.log('cloud goal_execute source tests passed');
