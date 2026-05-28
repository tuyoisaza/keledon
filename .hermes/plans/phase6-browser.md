# Phase 6 — Browser Feature Work Plan

## Prime Law
Cloud decides, Browser executes (Browser is blind).

## Architecture

### Command Polling Loop (command-poller.ts)
- Browser polls `GET /api/browser/devices/:deviceId/next-command` every 2s
- When a command arrives, executes it via the appropriate handler
- Reports results back via `POST /api/browser/devices/:deviceId/command-result`
- Uses exponential backoff on errors

### RPA Flow Executor (rpa-executor.ts)
- Receives structured RPA step sequences from the Cloud API
- Each step: `{ action: 'navigate' | 'click' | 'fill' | 'extract' | 'wait', selector?, value?, url?, timeout? }`
- Executes steps using the existing `autobrowse-bridge.ts` Electron API methods
- Reports step-by-step progress and final result
- Handles errors gracefully (skip failed steps, report error)

### Call Handler (call-handler.ts)
- State machine: `standby → call_received → listening → transcribing → thinking → reporting → executing → standby`
- Manages a single active call at a time
- Receives commands from the command poller
- Coordinates with the RPA executor for browser automation
- Reports call state transitions to the Cloud API

## Files to Create
- `browser/src/call-handler.ts` — Call state machine and coordination
- `browser/src/rpa-executor.ts` — Structured RPA flow executor
- `browser/src/command-poller.ts` — HTTP polling loop for browser commands

## Files to Modify
- `browser/src/cloud-connection.ts` — Integrate command poller, remove direct `goal_execute` handler (browser is blind now)
- `browser/src/main.ts` — Wire up the new components during initialization

## Constraints
- Additive-only (Hard Rule #1)
- Version bump on all commits
- Must pass typecheck and build
- Reuse existing `autobrowse-bridge.ts` for DOM manipulation
- No breaking changes to existing functionality

## Done When
- Browser polls Cloud API for commands (not WebSocket push)
- Browser executes structured RPA flows received from Cloud
- Call handling loop works end-to-end (standby → receive → STT → decide → TTS → RPA → report → standby)
- Browser reports results back to Cloud API
