# KELEDON E2E Testing Runbook

**Owner:** Engineering / QA
**Effective:** 2026-04-19
**Status:** DRAFT — scenarios defined, automation pending

---

## Overview

This runbook defines end-to-end test scenarios covering the full KELEDON runtime loop:
`LISTEN → TRANSCRIBE → THINK(Cloud+Vector) → DECIDE → ACT(RPA) → RESPOND → SPEAK → LOOP`

Tests verify the **Cloud decides / Browser executes** contract is never violated.

---

## Environment Requirements

| Component | Requirement |
|-----------|-------------|
| Cloud Brain | Running at `https://keledon.tuyoisaza.com` (or local) |
| Browser | KELEDON Browser installed + running |
| Qdrant | `keledon` collection seeded (10+ docs) |
| NODE_ENV | `production` or `staging` |

---

## Scenario 1: Device Pairing

**Goal:** Verify Browser WebSocket connects to Cloud `/ws/runtime` and receives `paired` event.

**Steps:**
1. Launch KELEDON Browser
2. Observe status bar for "Connected" indicator
3. Check Cloud logs: `ws/runtime — device paired: <device-id>`

**Expected:**
- Browser status shows "Connected"
- Cloud logs show device pairing with correct device ID
- No reconnect loop within 10s

**Commands:**
```bash
# Cloud logs (Railway)
railway logs --tail 50 | grep "device paired"

# Browser: check renderer console for
# "ws:runtime connected" and "device:paired"
```

**Acceptance:** Pairing completes within 3 seconds of app launch.

---

## Scenario 2: Voice Transcription → Cloud Decision

**Goal:** Verify a spoken utterance flows through the full loop to a Cloud decision.

**Steps:**
1. Ensure device is paired (Scenario 1 passes)
2. Speak: *"Go to google.com"*
3. Observe Browser for navigation action

**Expected:**
- `voice:transcript` event emitted by Browser
- Cloud `decision-engine` produces `navigate` action
- Browser's AutoBrowse executes `loadURL('https://google.com')`
- Browser shows Google homepage in BrowserView

**Commands:**
```bash
# Cloud: confirm decision event
railway logs | grep "decision.*navigate"

# Browser: confirm autobrowse IPC
# Renderer shows: "Step 1/1: navigate → https://google.com ✓"
```

**Acceptance:** Page loads within 5s of utterance end.

---

## Scenario 3: Vendor Login RPA

**Goal:** Verify the Cloud can orchestrate a multi-step login via RPA actions.

**Steps:**
1. Speak: *"Log in to example.com"*
2. Cloud should emit multi-step `executor:goal` with actions: `navigate`, `fill`, `click`
3. Browser should execute each step sequentially

**Expected:**
- Renderer progress bar shows: `navigate ✓ → fill[email] ✓ → click[submit] ✓`
- Each step reported via `executor:progress` IPC event
- No decision logic executed in browser/ process

**Commands:**
```bash
# Verify no decision logic in browser — grep guard:
grep -r "if.*intent\|if.*command\|decideAction" browser/src/ && echo "FAIL" || echo "PASS"
```

**Acceptance:** All 3 steps complete; renderer shows step-by-step progress.

---

## Scenario 4: TTS Response

**Goal:** Verify Cloud decision produces spoken response via TTS.

**Steps:**
1. Send a text command via UI: *"What time is it?"*
2. Cloud should produce `brain:command` with TTS response
3. Browser should speak the response via Web Speech API / TTS

**Expected:**
- `brain:command` received by Browser IPC
- Audio output plays TTS response
- Status shows "Speaking..." during playback

**Commands:**
```bash
# Browser renderer console should show:
# "[tts] speaking: It is currently..."
```

**Acceptance:** Audio plays within 2s of cloud response.

---

## Scenario 5: Landing Page Health Check

**Goal:** Verify production landing is live and download link is current.

**Steps:**
1. Open `https://keledon.tuyoisaza.com`
2. Verify download button points to latest GitHub Release asset
3. Click download — verify file downloads (correct version)

**Commands:**
```bash
# Check landing is serving latest version
curl -s https://keledon.tuyoisaza.com | grep "0\.1\."

# Verify GitHub release asset exists
gh release view v0.1.18 --json assets --jq '.assets[].name'
```

**Acceptance:** Landing loads, download button points to correct `.exe`, file downloads.

---

## Production Readiness Checklist

Before any release:
- [ ] Scenario 1 (pairing) passes
- [ ] Scenario 2 (voice loop) passes
- [ ] Scenario 3 (RPA multi-step) passes
- [ ] Scenario 4 (TTS) passes
- [ ] Scenario 5 (landing health) passes
- [ ] Cloud `NODE_ENV=production` set on Railway
- [ ] Qdrant `keledon` collection has ≥10 documents
- [ ] `KELEDON_LAUNCH_SECRET` set on Railway
- [ ] GitHub Release created with NSIS installer asset

---

## Regression Guards

These commands must always pass before merging to `main`:

```bash
# 1. No decision logic in browser
grep -r "decideAction\|mapGoalToActions\|intentToCommand" browser/src/ && echo "VIOLATION" || echo "OK"

# 2. Architecture guardrail: browser never imports cloud modules
grep -r "from.*cloud/" browser/src/ && echo "VIOLATION" || echo "OK"

# 3. Version consistency
node -e "
  const b = require('./browser/package.json').version;
  const c = require('./cloud/package.json').version;
  const l = require('./landing/package.json').version;
  if (b !== c || c !== l) { console.error('VERSION MISMATCH', {b,c,l}); process.exit(1); }
  console.log('versions OK:', b);
"
```
