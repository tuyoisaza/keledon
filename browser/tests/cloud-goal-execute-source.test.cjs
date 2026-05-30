const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cloudSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'cloud-connection.ts'), 'utf8');
const plannerSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'goal-planner.ts'), 'utf8');

// Regression: direct cloud goal_execute bypassed the renderer IPC path, so it skipped
// local vendor credential enrichment and could execute with only { vendor_id }.
assert.match(cloudSource, /function enrichGoalExecuteDataFromRuntimeVendor/);
assert.match(cloudSource, /inputs\.email\s*=\s*username/);
assert.match(cloudSource, /inputs\.login\s*=\s*username/);
assert.match(cloudSource, /bridge\.executeGoal\(enrichedGoalData\)/);

// Regression: the direct cloud path also skipped the renderer IPC BrowserView guard.
assert.match(cloudSource, /ensureActiveGoalTab/);
assert.match(cloudSource, /tabManager\.createTab\('Goal Execution', 'about:blank'\)/);
assert.match(cloudSource, /bridge\.setTabs\(tabManager\.getInternalTabs\(\), tabManager\.getActiveTabId\(\)\)/);

// Diagnostic regression: activity log must show enough result detail to know if the
// planner actualized the goal into multiple steps, without printing raw credentials.
assert.match(cloudSource, /goal_execute result:/);
assert.match(cloudSource, /steps=\$\{result\.steps\?\.length \?\? 0\}/);

// Security regression: login identifiers and passwords should be redacted in progress/log descriptions.
assert.match(plannerSource, /password\|passcode\|secret\|token\|api\\s\*key\|credential\|email\|username\|login/i);
assert.doesNotMatch(plannerSource, /Fill \$\{field\} with \$\{value\}/, 'fill descriptions must not blindly print credential values');

console.log('cloud goal_execute source tests passed');
