# KELEDON Brain Fix & Integration Plan

## Context

User (tboar) reported: "THE ORIGINAL IDEA WAS THAT AUTOBROWSE ALREADY WORKED... I NEED TO GO TO THE AUTOBROWSE AND UNDERSTAND HOW IT WAS WORKING AND LEARN TO DO IT FOR KELEDON BROWSER"

After studying the codebase, **AutoBrowse DOES work** - but the integration between KELEDON Browser and the AutoBrowse engine has wiring issues.

## What "The Brain" Actually Is

### Two Parallel Brain Systems

**Brain A: `browser/src/autobrowse-bridge.ts`** (557 lines) — THE CURRENTLY WIRED BRAIN
- Used by renderer today (via `executor:executeGoal` IPC)
- Connects to Electron Chromium via CDP (`chromium.connectOverCDP()`)
- Simple regex goal mapper: maps "navigate to X", "login", "click Y", "search for Z", "extract" to Playwright actions
- Actions: navigate, click, fill, press_key, select, hover, wait, screenshot, extract
- Directly controls the active BrowserView tab

**Brain B: `browser/lib/autobrowse/`** (Full engine, v0.2.0) — THE UNTAPPED BRAIN
- Not currently wired to renderer
- Rich `GoalMapper` with 14 built-in handlers: navigate, search, fill_form, click_element, extract_data, login, workflow, scrape_page, download, screenshot, upload_file, wait_for_network, switch_frame, handle_dialog
- `GoalExecutor` + `Orchestrator` for execution management
- `StepExecutor` for step-level execution
- `AIGateway` supporting Ollama (local, no Google) or OpenAI (cloud)
- IPC server with proper channel registration
- `KelledonIntegration` for Electron wiring
- `CloudClient` for remote/cloud brain connectivity

### Current Flow (BROKEN)

```
Renderer (goalInput) 
  → window.keledon.executor.executeGoal(goal, {})
  → IPC 'executor:executeGoal'
  → main.ts handler (line 1256)
  → autobrowseBridge.executeGoal(goalInput)   ← uses autobrowse-bridge.ts
  → connectCDP()                              ← FAILS HERE
  → mapGoalToActions()                        ← simple regex mapper
  → executeAction()                           ← Playwright actions
  → return result
```

### Root Causes of Brain Not Working

1. **CDP connection unreliable**: `chromium.connectOverCDP()` fails because:
   - CDP debug port may not be reachable from the bridge's Playwright instance
   - BrowserView tabs don't show up as separate CDP pages
   - CDP URL hardcoded to `ws://localhost:9222` but actual port may differ

2. **Goal mapper too simplistic**: `autobrowse-bridge.ts` `mapGoalToActions()` is regex-based, can't handle complex natural language goals

3. **Full brain engine not connected**: `browser/lib/autobrowse/` has the sophisticated engine but it's not wired to the renderer

4. **No progress feedback**: Renderer can't show what's happening during goal execution

---

## Plan

### Version: 0.1.18 (branch: `fix/brain`)

### Tasks

#### TASK 1: Fix CDP Connection in autobrowse-bridge
**File**: `browser/src/autobrowse-bridge.ts`
**Problem**: `connectCDP()` fails because Electron's BrowserViews don't expose separate CDP endpoints the way a standalone Playwright browser does.

**Fix**:
1. Remove standalone CDP connection attempt - Electron BrowserViews share the main process's DevTools protocol
2. Instead, control BrowserView directly via Electron APIs (not Playwright CDP):
   - For navigation: use `activeTab.view.webContents.loadURL(url)`
   - For click/fill: use `activeTab.view.webContents.executeJavaScript()` to run DOM manipulation
   - For screenshot: use `activeTab.view.webContents.capturePage()`
3. Keep Playwright only for goals that need advanced automation (e.g., complex DOM interaction, multi-step workflows)
4. If CDP is needed, use Electron's built-in `webContents.getDebugger()` API instead of `playwright.chromium.connectOverCDP()`

**Reference patterns**:
```typescript
// Navigation - use BrowserView directly
activeTab.view.webContents.loadURL(url);

// DOM execution - inject JavaScript into page
activeTab.view.webContents.executeJavaScript(`
  document.querySelector('input[name="q"]')?.focus();
  document.querySelector('input[name="q"]').value = 'search term';
  document.querySelector('form').submit();
`);

// Screenshot - use Electron
const image = await activeTab.view.webContents.capturePage();
```

#### TASK 2: Enhance Goal Mapper with Better Pattern Matching
**File**: `browser/src/autobrowse-bridge.ts`
**Problem**: Current `mapGoalToActions()` is too simple.

**Fix**:
1. Expand goal patterns to handle more natural language:
   - "go to [domain]" → navigate
   - "login to [vendor] with [credentials]" → login workflow
   - "click the [button/text]" → click
   - "fill [field] with [value]" → fill
   - "search for [query]" → navigate + fill + submit
   - "extract [data]" → extract
   - "scroll down/up" → scroll
   - "take a screenshot" → screenshot
2. Add URL detection: if input looks like a URL, auto-navigate
3. Fall back to Google search for unrecognized queries

#### TASK 3: Add Progress Reporting to Renderer
**Files**: `browser/src/autobrowse-bridge.ts`, `browser/src/main.ts`, `browser/renderer/index.html`
**Problem**: User sees nothing until goal completes.

**Fix**:
1. In `executeGoal()`, emit progress events via IPC:
   - `executor:progress` channel for step updates
   - Each step: `{ step: number, total: number, action: string, status: 'running'|'done'|'failed' }`
2. In renderer, update UI on progress events (show step being executed)

**Reference from preload.ts**:
```typescript
onProgress: (callback: (progress: unknown) => void) => {
  ipcRenderer.on('executor:progress', (_event, progress) => callback(progress));
  return () => ipcRenderer.removeAllListeners('executor:progress');
}
```
This already exists in preload.ts but bridge doesn't emit!

#### TASK 4: Wire Full Brain Engine (Optional - for Complex RPA)
**File**: `browser/src/main.ts` (initializeAutoBrowseEngine function)
**Problem**: Full AutoBrowse engine exists but unused.

**Fix** (if TASK 1-3 aren't enough):
1. Instead of using `autobrowse-bridge.ts`, use `browser/lib/autobrowse/src/kelledon/` integration
2. In `initializeAutoBrowseEngine()`, set up `KelledonIntegration` properly
3. The `KelledonIntegration` already has:
   - `AutoBrowseEngine` with full goal mapper
   - `CloudClient` for cloud brain
   - Proper IPC handlers
4. But: this requires the full autobrowse server to be running (port 5847)

**Decision**: Try TASKS 1-3 first. If automation still insufficient, wire full brain.

#### TASK 5: Fix Logs (PREREQUISITE)
**File**: `browser/src/main.ts`
**Problem**: `app.getPath('userData')` called at module load time, returns undefined.

**Fix**:
```typescript
// Before (broken):
const LOGS_DIR = path.join(app.getPath('userData'), 'logs'); // undefined at load time

// After (fixed):
let _logsDir: string | null = null;
function getLogsDir(): string {
  if (!_logsDir) {
    _logsDir = app.isReady() 
      ? path.join(app.getPath('userData'), 'logs')
      : path.join(os.tmpdir(), 'keledon-logs');
    if (!fs.existsSync(_logsDir)) {
      fs.mkdirSync(_logsDir, { recursive: true });
    }
  }
  return _logsDir;
}
```
Also add early log that writes to `os.tmpdir()` BEFORE app.whenReady().

#### TASK 6: Fix Installer Size
**File**: `browser/package.json`
**Problem**: ASAR includes `dist/` recursively (old installers + win-unpacked).

**Fix**:
1. Add pre-build cleanup script in `package.json`:
```json
"scripts": {
  "pre_dist": "node scripts/clean-dist.js",
  "dist": "npm run pre_dist && electron-builder --win nsis"
}
```
2. `scripts/clean-dist.js`:
```javascript
const fs = require('fs');
const path = require('path');
const distDir = path.join(__dirname, '../dist');
// Delete old installers
fs.readdirSync(distDir).filter(f => f.endsWith('.exe')).forEach(f => {
  fs.unlinkSync(path.join(distDir, f));
  console.log('Deleted:', f);
});
// Delete win-unpacked
const unpacked = path.join(distDir, 'win-unpacked');
if (fs.existsSync(unpacked)) {
  fs.rmSync(unpacked, { recursive: true });
  console.log('Deleted: win-unpacked/');
}
```

#### TASK 7: Version Bump and Release
**Files**: `browser/package.json`, `landing/package.json`, `cloud/package.json`, `landing/src/pages/LaunchKeledonPage.tsx`
**Version**: 0.1.18

---

## QA Scenarios

### Brain QA
1. Type "go to google.com" in execute input → should navigate to google.com
2. Type "search for cats" → should navigate to Google and search
3. Type "login to salesforce" (with vendor creds in context) → should attempt login
4. Type "click the Sign In button" → should find and click element
5. Check logs: after each execution, `%APPDATA%/KELEDON Browser/logs/` should have entries

### Installer QA
1. Build installer → verify size is ~150-200MB (not 1.8GB)
2. Run installer on clean system → should uninstall previous version first
3. After install, `C:\Program Files\KELEDON Browser/logs/` should exist and be writable
4. Launch app → logs should appear immediately in logs directory

### Navigation QA
1. Type URL in URL bar → should navigate
2. Click + button → new tab opens
3. Switch tabs → correct content shows
4. Navigate to salesforce.com → should load (or show error if blocked)

---

## Scope

**IN**:
- Fix CDP/BrowserView automation in autobrowse-bridge
- Enhance goal mapper patterns  
- Add progress reporting
- Fix logs (lazy initialization)
- Fix installer size (pre-build cleanup)

**OUT**:
- Don't wire full `lib/autobrowse/` engine unless TASKS 1-3 fail
- Don't add Google Generative AI (user forbade it)
- Don't modify the Chrome-like UI (already done)

---

## Guardrails (from Metis-style review)

1. **CDP is unreliable for BrowserViews** — use Electron APIs directly for navigation/clicks
2. **Don't break the existing tab navigation** — URL bar and + button already work
3. **Logs must work before debugging brain** — without logs, we can't diagnose failures
4. **Installer size is separate issue** — can be tested independently of brain

---

## Decisions Needed

1. **Which automation approach?**
   - Option A: Fix `autobrowse-bridge.ts` to use Electron APIs directly (faster, simpler)
   - Option B: Wire full `lib/autobrowse/` engine (richer, more complex)
   - Recommendation: Try A first, escalate to B if insufficient

2. **Keep the simple goal mapper or upgrade?**
   - Current mapper handles: navigate, login, click, fill, search, extract, screenshot
   - Full brain adds: fill_form, scrape_page, upload, wait_for_network, switch_frame, handle_dialog
   - Recommendation: Upgrade mapper to handle more patterns without full engine
