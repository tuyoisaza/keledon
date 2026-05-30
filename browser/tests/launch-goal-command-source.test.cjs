const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const gatewaySource = fs.readFileSync(path.join(__dirname, '..', '..', 'services', 'api', 'src', 'gateways', 'device.gateway.ts'), 'utf8');
const ipcSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'ipc-handlers.ts'), 'utf8');
const cloudSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'cloud-connection.ts'), 'utf8');

assert.match(gatewaySource, /type:\s*'goal_execute'/, 'launch auto-command should use goal_execute, not navigate-only ui_steps');
assert.match(gatewaySource, /vendor_id:\s*v\.id/, 'launch goal command should identify the vendor for local credential enrichment');
assert.match(gatewaySource, /legacy_ui_step:\s*uiSteps\[i\]/, 'legacy navigation step should be preserved as metadata');
assert.match(gatewaySource, /client\.emit\('goal_execute',\s*command\.data\)/, 'launch should also emit a direct goal_execute socket event for the browser main-process executor');
assert.match(gatewaySource, /this\.server\.to\(`session:\$\{data\.session_id\}`\)\.emit\('goal_execute',\s*command\.data\)/, 'session room should also receive direct goal_execute for reconnect/resubscribe cases');
assert.doesNotMatch(gatewaySource, /goal:\s*\$\{command\.data\.goal\}/, 'launch logs must not print raw goal text that could include credentials');
assert.match(ipcSource, /function enrichGoalInputsFromRuntimeVendor/, 'browser executor should enrich launch goals from local runtime vendors');
assert.match(ipcSource, /inputs\.email\s*=\s*username/, 'local vendor username should also be available as email');
assert.match(ipcSource, /inputs\.login\s*=\s*username/, 'local vendor username should also be available as login');

// Regression: direct WebSocket goal_execute bypasses ipc-handlers.ts, so it must do
// the same local vendor enrichment and tab preparation before AutoBrowse executes.
assert.match(cloudSource, /function enrichGoalExecuteDataFromRuntimeVendor/, 'direct goal_execute should enrich vendor URL and credentials from runtime vendors');
assert.match(cloudSource, /function ensureBrowserViewForGoalExecution/, 'direct goal_execute should create or activate a BrowserView before execution');
assert.match(cloudSource, /enrichGoalExecuteDataFromRuntimeVendor\(data\)/, 'goal_execute handler should use enriched launch data');
assert.match(cloudSource, /ensureBrowserViewForGoalExecution\(tabManager,\s*bridge\)/, 'goal_execute handler should prepare the BrowserView before bridge.executeGoal');

console.log('launch goal command source tests passed');
