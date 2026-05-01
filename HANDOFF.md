# KELEDON Session Handoff

> Briefing for a new Claude instance resuming this project from scratch.
> Written: 2026-05-01. Current branch: `main`. Version: `0.2.0`.

---

## What This Project Is

KELEDON is a multi-tenant autonomous agent platform. A Windows desktop Electron app ("Browser") is the executor; a NestJS backend on Railway ("Cloud") is the decision-maker. The browser is intentionally blind — it executes Cloud decisions but never decides on its own.

**Architecture:**
```
User speaks → Browser (Electron)
  → Web Speech API STT → transcript
  → Cloud (Railway NestJS) via WebSocket /ws/runtime
  → DecisionEngine (OpenAI GPT-4o + Qdrant RAG)
  → brain:command(say) → browser speaks (local SpeechSynthesis)
  → brain:audio(base64 MP3) → browser plays cloud TTS (OpenAI nova voice)
  → brain:command(ui_steps) → AutoBrowse RPA executes in BrowserView
```

**Live URLs:**
- Cloud: https://keledon.tuyoisaza.com (Railway, healthy as of session end)
- GitHub: https://github.com/tuyoisaza/keledon
- Release v0.2.0: https://github.com/tuyoisaza/keledon/releases/tag/v0.2.0

---

## What Was Completed This Session

### B-001: Release Ops (merged via PR #32)
- Branch governance doc + prune script
- `.github/workflows/release.yml` — NSIS build on `windows-latest`, signing gate, GitHub Release upload, deploy-cloud, update-landing
- Windows signing policy (Azure Trusted Signing chosen)
- E2E testing runbook (5 scenarios)
- `docs/release-governance.md`

### Railway Production Fixes
- **Qdrant WAL lock fix**: `start.sh` now `find /app/data/qdrant -type f \( -name "LOCK" ... \) -delete` before starting Qdrant. Prevents container restart panic from stale lock files.
- **Dangerous env vars fixed**: `KELEDON_RESET_DB=false`, `KELEDON_RESET_QDRANT=false`
- **Tier fix**: `KELEDON_ENV_TIER=CI_PROOF` (was invalid `production` → fell back to `PRODUCTION_MANAGED` which rejected loopback Qdrant URL)
- `NODE_ENV=production`, `KELEDON_CLOUD_BASE_URL=https://keledon.tuyoisaza.com`

### B-002: WebRTC + RPA Voice Integration (merged via PR #33)
- **Cloud TTS delivery** (`cloud/src/gateways/device.gateway.ts`): After sending `brain:command(say)`, async-generates audio via TTSService and emits `brain:audio` (base64 MP3) to browser.
- **WebRTC injector** (`browser/src/webrtc-injector.ts`): Spec-compliant pre-connection `getUserMedia` override per `docs/specs/v1_keledon_webrtc_agent_participation.md`. Uses `AudioContext → MediaStreamDestination` to mix user mic + agent TTS audio in any BrowserView. IPC: `webrtc:arm`, `webrtc:inject-audio`, `webrtc:disarm`, `webrtc:status`.
- **Renderer**: `brain:audio` plays via Web Audio API (cancels local SpeechSynthesis). `brain:command(ui_steps)` routes to `executor.executeSteps()`. Agent Participation panel with consent checkbox + ARMED/DISARMED state.
- **Preload**: `brain.onAudio()`, `webrtc.*` IPC API surface.

### B-003: v0.2.0 Release
- Tagged `v0.2.0`, CI built NSIS installer + ZIP
- Fixed `contents:write` permission in release.yml
- Fixed `deploy-cloud` job: uses `RAILWAY_DEPLOY_HOOK` (curl POST) + `continue-on-error: true` (Railway auto-deploys from main merges anyway)
- **69 stale remote branches deleted** — only `main` remains

### B-004: OpenAI TTS Fallback (committed to main, Railway deploying)
- `cloud/src/tts/tts.service.ts`: Added `speakWithOpenAI()`. Auto-selects provider: ElevenLabs if key set, else OpenAI TTS, else mock.
- `OPENAI_API_KEY` is already set in Railway → `brain:audio` will now produce real MP3 audio via OpenAI `tts-1` model, `nova` voice.
- Configurable: `OPENAI_TTS_VOICE`, `OPENAI_TTS_MODEL` env vars.

---

## Current State

| Component | State |
|---|---|
| Cloud (Railway) | Healthy — deploying B-004 commit now |
| Cloud version | 0.2.0 (package.json) |
| Browser version | 0.2.0 |
| GitHub Release v0.2.0 | Live with NSIS installer + ZIP |
| Remote branches | Only `main` |
| Boulder queue | B-001, B-002, B-003 done; B-004 in progress |

**Railway env vars (stable):**
- `KELEDON_ENV_TIER=CI_PROOF`
- `NODE_ENV=production`
- `KELEDON_RESET_DB=false`
- `KELEDON_RESET_QDRANT=false`
- `KELEDON_CLOUD_BASE_URL=https://keledon.tuyoisaza.com`
- `OPENAI_API_KEY=sk-proj-...` (set)
- `ELEVENLABS_API_KEY` — **NOT SET** (OpenAI TTS now used as fallback)

---

## Pending / Open

### Immediate next step
After Railway finishes deploying the B-004 commit, smoke test the full voice chain:
1. Connect browser to cloud
2. Start a call
3. Speak a phrase → should trigger `voice:transcript` → cloud → `brain:command(say)` + `brain:audio`
4. Verify browser plays the OpenAI TTS audio (not robot SpeechSynthesis)
5. Check Railway logs: `[TTS] Speaking with openai:` and `[TTS] OpenAI generated N bytes`

### Open / Blockers
- **`RAILWAY_DEPLOY_HOOK` not set** in GitHub secrets: the `deploy-cloud` CI job currently does nothing (it prints "skipping" and exits). To enable explicit release-triggered deploys:
  1. Go to Railway project → Settings → Deploy Hook → copy URL
  2. `gh secret set RAILWAY_DEPLOY_HOOK --body "<url>" --repo tuyoisaza/keledon`
- **Code signing not configured**: Browser installer is unsigned (REQUIRE_SIGNING=false). To fix: set up Azure Trusted Signing per `.sisyphus/docs/windows-signing-policy.md`.
- **`ELEVENLABS_API_KEY`**: If higher-quality TTS is wanted, set this in Railway and it will be used automatically over OpenAI.

### Upcoming (B-004 remainder + B-005 planning)
- Smoke test brain:audio end-to-end (described above)
- Decide next feature: multi-tab RPA, VOSK STT upgrade, vendor portal login flows, or dashboard enhancements

---

## Key File Map

```
C:\KELEDON/
├── browser/
│   ├── src/
│   │   ├── main.ts                    — Electron main (1700+ lines), IPC, WebSocket, tabs
│   │   ├── webrtc-injector.ts         — getUserMedia override, AudioContext mixing (NEW B-002)
│   │   ├── preload.ts                 — IPC API surface for renderer
│   │   ├── autobrowse-bridge.ts       — Electron-native RPA executor (no CDP)
│   │   └── media/media-layer.ts       — STT/TTS local layer
│   └── renderer/index.html            — Chrome-like UI, voice controls, brain:audio playback
├── cloud/
│   ├── src/
│   │   ├── gateways/device.gateway.ts — /ws/runtime WS, voice:transcript → brain:command + brain:audio
│   │   ├── tts/tts.service.ts         — TTS: ElevenLabs > OpenAI > mock (UPDATED B-004)
│   │   ├── services/decision-engine.service.ts — AI decision loop
│   │   └── rag/rag.service.ts         — Qdrant vector retrieval
├── .sisyphus/
│   ├── boulder.json                   — Task queue (B-001–B-004 state)
│   └── plans/                         — Phase plans
├── docs/
│   └── specs/v1_keledon_webrtc_agent_participation.md — IMMUTABLE WebRTC spec
├── start.sh                           — Railway container entrypoint
└── .github/workflows/release.yml      — CI: build NSIS, upload release, deploy-cloud (hook)
```

---

## Git Workflow Notes (Windows-specific)

- Always: `powershell -Command "Set-Location 'C:\KELEDON'; git ..."`
- Exit code 1 from PowerShell git = often success (stderr messages from git)
- Push needs GH token injection:
  ```powershell
  $token = gh auth token
  git remote set-url origin "https://tuyoisaza:$token@github.com/tuyoisaza/keledon.git"
  git push origin main
  git remote set-url origin "https://github.com/tuyoisaza/keledon.git"
  ```
- Pushing `.github/workflows/` requires `workflow` OAuth scope

## Hard Guardrails (Non-negotiable)
1. **Cloud decides, Browser executes** — never add decision logic to `browser/`
2. Never modify `docs/specs/` without a governance Issue
3. No Google Generative AI API — OpenAI/Ollama only
4. Never declare completion without a PR
5. Never simulate success — fail loudly
