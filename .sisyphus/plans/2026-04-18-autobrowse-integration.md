# Plan: KELEDON Browser + AutoBrowse Integration

## Problem
The browser UI now looks like Chrome (v0.1.15), but:
1. **Can't browse other domains** — tabs only load URLs but the automation engine doesn't work
2. **Execute command opens black screen** — the `autobrowse-bridge.ts` is a STUB that only does `mainWindow.webContents.loadURL()` + screenshot, no real automation
3. **No orchestration/tasking** — the `executor:executeGoal` IPC handler calls the stub bridge, not the real AutoBrowse engine

## Root Cause
`browser/src/autobrowse-bridge.ts` is a 180-line **stub** that:
- Initializes to `isInitialized = true` immediately (does nothing)
- `executeGoalViaCDP()` only does `mainWindow.webContents.loadURL()` + screenshot
- Does NOT use the real AutoBrowse engine at `browser/lib/autobrowse/`
- The real engine has `KelledonIntegration`, `AutoBrowseEngine`, `GoalExecutor`, `GoalMapper`, `StepExecutor`, `BrowserManager`, `CloudClient`, and IPC handlers

The real engine IS in the project (`browser/lib/autobrowse/`) and was designed for this integration, but the bridge file was never wired to it.

## Architecture

```
Cloud → WebSocket → KELEDON Browser (main.ts)
                        ↓
                   ipcMain.handle('executor:executeGoal')
                        ↓
                   autobrowse-bridge.ts → AutoBrowseEngine
                        ↓                         ↓
                   KelledonIntegration        BrowserManager
                        ↓                    (CDP or Launch mode)
                   CloudClient              Playwright → Chromium
                        ↓
                   GoalMapper → StepExecutor
                        ↓
                   navigate/click/type/extract/...
```

## Integration Strategy

**Use the existing AutoBrowse engine via CDP (Chrome DevTools Protocol):**

1. Enable Electron's CDP debug port in main.ts
2. Replace `autobrowse-bridge.ts` stub with real integration using `KelledonIntegration`
3. AutoBrowse's `BrowserManager` connects via `chromium.connectOverCDP()` to the Electron browser
4. Goal execution flows: GoalMapper → StepExecutor → Playwright on real pages
5. Tab automation uses BrowserView webContents (not mainWindow)

## Files to Modify

### 1. `browser/src/autobrowse-bridge.ts` — REPLACE (currently stub)
- Remove the current stub implementation
- Import and use `KelledonIntegration` from `../lib/autobrowse/src/kelledon/index.js`
- Wire up real `AutoBrowseEngine` with CDP mode
- Use `BrowserManager` in CDP mode to connect to Electron's Chromium
- Delegate all goals to `GoalExecutor`
- Export same API surface: `executeGoal()`, `captureScreenshot()`, `getBrowserState()`, etc.

### 2. `browser/src/main.ts` — ADD CDP debug port
- Add `app.commandLine.appendSwitch('remote-debugging-port', '9222')` before app.ready
- This enables Playwright to connect via CDP
- Keep all existing IPC handlers (executor:executeGoal, etc.)
- Replace `initializeAutoBrowseEngine()` to use real integration
- Wire tab BrowserView webContents to AutoBrowse's page tracking

### 3. `browser/package.json` — ADD AutoBrowse dependencies
- AutoBrowse uses: playwright, fastify, zod, uuid, pino, better-sqlite3 (via sql.js)
- These are already in `browser/lib/autobrowse/package.json`
- Need to ensure they're available at runtime

### 4. NO changes needed to `browser/lib/autobrowse/` — this is the source of truth

## Key Technical Decisions

### CDP Connection Mode
The AutoBrowse engine supports two modes:
- **`launch` mode**: AutoBrowse launches its own Chromium instance — WRONG for our use case
- **`cdp` mode**: AutoBrowse connects to an existing Chromium (Electron) via CDP — CORRECT

For KELEDON Browser, we MUST use **CDP mode** because:
- We need to automate the SAME browser the user sees
- BrowserView tabs are already created by main.ts
- CDP lets Playwright control the real BrowserView content

### Tab vs MainWindow
- `executor:executeGoal` currently automates `mainWindow.webContents` — WRONG
- Should automate the **active tab's BrowserView** webContents
- AutoBrowse connects via CDP and can see all pages/targets
- We need to tell AutoBrowse which target (page) to automate

### Execution Flow
```
User clicks "Execute" in side panel
  → Renderer calls window.keledon.executor.executeGoal(goal, context)
  → IPC → main.ts executor:executeGoal handler
  → bridge.executeGoal(goalInput)
  → KelledonIntegration.executeGoal(goalInput)
  → AutoBrowseEngine.executeGoal(goalInput)
  → GoalMapper.mapToSteps(goal) → WorkflowStep[]
  → StepExecutor executes each step on the page via Playwright/CDP
  → Result returned up the chain
  → Renderer shows result
```

## Implementation Tasks

### Task 1: Enable CDP Debug Port in main.ts
**File**: `browser/src/main.ts`
**What**: Add `app.commandLine.appendSwitch('remote-debugging-port', '9222')` before `app.whenReady()`
**Why**: Playwright needs CDP to connect to Electron's Chromium
**QA**: Verify `http://localhost:9222/json` returns JSON with page targets

### Task 2: Rewrite autobrowse-bridge.ts to use real AutoBrowse
**File**: `browser/src/autobrowse-bridge.ts`
**What**: Replace stub with real integration using `KelledonIntegration`
- Import `KelledonIntegration`, `AutoBrowseEngine`, `BrowserManager` from `../lib/autobrowse/`
- In `setMainWindow()`, store the BrowserWindow reference and enable CDP
- In `initializeAutoBrowse()`, create `KelledonIntegration` with CDP URL
- In `executeGoal()`, delegate to `engine.executeGoal()`
- In `captureScreenshot()`, use active tab's BrowserView
- In `getBrowserState()`, return real tab state
**QA**: Execute a goal from the side panel, verify it actually clicks/types/navigates

### Task 3: Update BrowserManager initialization for CDP mode
**File**: `browser/lib/autobrowse/src/browser/manager.ts` (minor)
**What**: Ensure `connectToElectron()` method works with Electron's CDP port
- Verify the method exists and handles Electron's `<webview>` and BrowserView targets
**QA**: Run AutoBrowse with CDP mode, verify it lists all BrowserView targets

### Task 4: Wire Cloud → Browser → AutoBrowse chain
**File**: `browser/src/main.ts`
**What**: 
- When cloud sends a goal via WebSocket, route to `executor:executeGoal`
- When AutoBrowse completes, send result back to cloud via deviceSocket
- Add progress events: `executor:progress` IPC from renderer, relayed to cloud
**QA**: Send a goal via cloud WebSocket, verify it executes and result returns

### Task 5: Fix BrowserView + AutoBrowse tab coordination
**File**: `browser/src/autobrowse-bridge.ts` + `browser/src/main.ts`
**What**:
- When AutoBrowse needs to automate a page, it must target the active BrowserView
- CDP exposes browser contexts for each BrowserView
- The `BrowserManager` should connect to the Electron session's CDP endpoint
- When creating a tab via `createTab()`, AutoBrowse should know about the new target
**QA**: Create a tab, navigate to salesforce.com, verify AutoBrowse can interact with it

### Task 6: Handle vendor logins using real AutoBrowse
**File**: `browser/src/main.ts` (vendor login section)
**What**: The existing `autoLoginToVendor()` already calls `bridge.executeGoal()` — once the bridge is real, this will work
- Ensure login flows (Salesforce, Genesys) have goal handlers registered
- Add custom `GoalHandler` for common vendor login patterns
**QA**: Test a vendor login, verify AutoBrowse fills form and submits

### Task 7: Build, test, bump version to 0.1.16
**File**: `browser/package.json`, `landing/package.json`, `cloud/package.json`
**What**: Version bump + build + deploy
**QA**: Install and test end-to-end

## Critical Dependencies

The AutoBrowse engine at `browser/lib/autobrowse/` has these Node.js dependencies that must be available:
- `playwright` (already in browser/package.json as `playwright-core`)
- `fastify` (HTTP server for AutoBrowse API)
- `zod` (validation)
- `uuid` (execution IDs)
- `pino` + `pino-pretty` (logging)
- `sql.js` (SQLite for config DB)
- `better-sqlite3` or `sql.js` (task queue persistence)

These are already in `browser/lib/autobrowse/package.json` but may need to be added to `browser/package.json` for the Electron build to include them.

## Critical Decisions & Guardrails

### Decision 1: Use AutoBrowseEngine directly, NOT KelledonIntegration
**Why**: `KelledonIntegration` includes CloudClient (WebSocket to cloud) + IPC Server (duplicate handlers) which creates a circular dependency — main.ts already handles cloud WebSocket and IPC. Using just `AutoBrowseEngine` + `BrowserManager` in CDP mode is simpler and avoids conflicts.

**Guardrail**: Do NOT import `KelledonIntegration`. Import only:
- `AutoBrowseEngine` from `runtime/autobrowse-engine`
- `createElectronAdapter` from `runtime/electron-adapter`
- `BrowserManager` from `browser/manager`

### Decision 2: ESM/CJS Module Compatibility
**Issue**: `browser/lib/autobrowse/src/` uses ESM (`.js` imports, `import.meta.url`). `browser/src/` compiles to CommonJS via `tsc`.
**Solution**: The bridge must import from compiled JS paths. AutoBrowse has a `dist-electron/` directory with pre-built CJS bundles. Use those.

**Guardrail**: `autobrowse-bridge.ts` imports from `../lib/autobrowse/dist-electron/main.cjs`, NOT from `src/`.

### Decision 3: Dependency Management
**Issue**: AutoBrowse depends on fastify, sql.js, pino, zod, uuid — not in browser/package.json.
**Solution**: Two approaches:
- Option A (Recommended for first pass): Use only `BrowserManager` + `StepExecutor` + `GoalMapper` directly, skipping the Fastify server and DB modules
- Option B: Add all deps to browser/package.json

**Guardrail**: Start with Option A. Only add deps we actually import.

### Decision 4: CDP Connection
**Issue**: BrowserManager in CDP mode calls `chromium.connectOverCDP(url)`.
**Solution**: Enable `--remote-debugging-port=9222` in Electron. The CDP endpoint will be `http://localhost:9222`.

**Guardrail**: Use `process.env.KELEDON_CDP_PORT || '9222'` for flexibility.

### Decision 5: Step-by-step phasing
Don't try to wire everything at once. Phase it:
1. **Phase 1 (Minimum Viable)**: CDP + BrowserManager in CDP mode + GoalExecutor — just make "Execute Goal" actually work
2. **Phase 2**: Cloud WebSocket → executor goal relay
3. **Phase 3**: Vendor login handlers
4. **Phase 4**: Custom goal handlers for Salesforce, Genesys

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| CDP port conflict (9222 in use) | Low | Medium | Use dynamic port, fallback to 9223 |
| Playwright can't see BrowserView targets | Medium | High | BrowserView shares Chromium, CDP should list all pages |
| sql.js/better-sqlite3 native module issues in Electron | High | High | Use `sql.js` (WASM, no native deps) or skip DB persistence |
| AutoBrowse Fastify server port conflict | Low | Low | Configure on different port (5847 default) |
| Large bundle size (Playwright is ~200MB) | Medium | Medium | Use `playwright-core` (already included, smaller) |

## Success Criteria (Phase 1)

1. ✅ Clicking "+" opens a new tab that navigates to google.com (or any URL) — DONE in v0.1.15
2. ✅ Entering a URL in the URL bar navigates the active tab — DONE in v0.1.15
3. ✅ Entering a goal in the Execute panel actually automates the browser (click, type, navigate)
4. ✅ CDP debug port enabled and Playwright can connect to Electron
5. ✅ AutoBrowse GoalMapper → StepExecutor → page actions work
6. ✅ Logs are written to userData/logs/ (fixed in v0.1.15)

## Success Criteria (Phase 2 - Future)
7. ✅ Vendor login (Salesforce, Genesys) works via AutoBrowse
8. ✅ Cloud can send goals via WebSocket and get results back
9. ✅ All BrowserView tabs are accessible via CDP for automation

## Phased Implementation

### Phase 1: Minimum Viable Automation (THIS PLAN)
- Enable CDP debug port in main.ts
- Replace autobrowse-bridge.ts stub with real BrowserManager + GoalExecutor
- Make "Execute Goal" in side panel actually automate the browser
- Version bump to 0.1.16

### Phase 2: Cloud Integration (NEXT PLAN)
- Cloud WebSocket → executor:executeGoal relay
- Real-time progress events to cloud
- Result shipping back to cloud

### Phase 3: Vendor Logins (NEXT PLAN)
- Custom GoalHandler for Salesforce login
- Custom GoalHandler for Genesys login
- Credential management

### Phase 4: Advanced Automation (FUTURE)
- Custom goal handlers per vendor
- Recording/playback
- Evidence collection