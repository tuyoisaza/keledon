# CLAUDE.md

IMPORTANT: All commit messages must start with `vX.X.X:` (current version is **0.2.5**).

## Project overview

KELEDON is a multi-tenant autonomous voice agent platform.

- **Cloud Brain** (`cloud/`) — NestJS on Railway at https://keledon.tuyoisaza.com. The sole decision-maker.
- **Browser Runtime** (`browser/`) — Electron desktop app (Windows). Executor only; never decides.
- **Landing** (`landing/`) — Vite/React, deployed on the same Railway container.

Runtime loop: `User speaks → STT → WebSocket /ws/runtime → DecisionEngine (configurable LLM + Qdrant RAG) → brain:command(say|ui_steps) + brain:audio (TTS MP3) → Browser executes`

All architecture contracts live in `docs/specs/`. Source of truth: `docs/specs/v3_KELEDON_CANON.md`.

## Commands

```bash
# Cloud (NestJS)
cd cloud && npm run start:dev    # dev server
cd cloud && npm run lint         # ESLint --fix
cd cloud && npm test             # Jest

# Browser (Electron)
cd browser && npm run build      # tsc compile
cd browser && npm run dev        # build + electron-forge start
cd browser && npm run dist       # NSIS installer (Windows only)

# Landing (Vite/React)
cd landing && npm run dev        # Vite dev server
cd landing && npm run build      # production build
cd landing && npm run typecheck  # tsc --noEmit (landing only)
cd landing && npm run lint       # ESLint
```

## Workflow rules

- **Every commit message must start with the version**: `v0.2.5: description`
- Do not commit changes unless the user explicitly asks.
- Do not install or add dependencies without approval.
- Branch law: only `main` exists as a permanent branch. All work goes through PRs from feature branches.
- Never declare completion without an open PR (hotfix direct-to-main commits excepted).
- CI auto-bumps the patch version on every merge to `main` (version-bump.yml). Do not manually bump unless asked.
- When manually bumping version, update all four locations in lockstep:
  - `browser/package.json`
  - `cloud/package.json`
  - `landing/package.json`
  - `landing/src/pages/LaunchKeledonPage.tsx` (download URL)
- Releases are triggered by pushing a `vX.Y.Z` git tag — CI builds the NSIS installer, signs it (if Azure signing is enabled), and uploads to GitHub Releases.

## Architecture rules

**Cloud decides. Browser executes. Browser is BLIND — never decides.**

This is the prime law. Violating it is a hard error, not a style issue.

- No decision logic, no AI calls, no intent parsing in `browser/`.
- `cloud/src/services/decision-engine.service.ts` — AI decision loop (configurable LLM + Qdrant RAG). Cloud only.
- `cloud/src/gateways/device.gateway.ts` — WebSocket `/ws/runtime`; routes `voice:transcript` to brain, sends `brain:command` and `brain:audio` back.
- `cloud/src/tts/tts.service.ts` — TTS: ElevenLabs → OpenAI TTS → mock (auto-selects based on env vars).
- `browser/src/main.ts` — Electron main; IPC, tabs, WebSocket client.
- `browser/src/autobrowse-bridge.ts` — Electron-native RPA (uses `webContents.executeJavaScript`/`loadURL`/`capturePage`). Import from `dist-electron/main.cjs`, NOT from `src/`.
- `browser/src/webrtc-injector.ts` — Spec-compliant `getUserMedia` override; feeds ElevenLabs/OpenAI MP3 into BrowserView audio track.
- `browser/src/preload.ts` — IPC API surface exposed to renderer.
- `.sisyphus/boulder.json` — Task queue. Read before touching any file.

## Security and safety

- **AI provider (DecisionEngine/LLM) is configurable via env vars** — same pattern as TTS. Set whichever key you want and the system auto-selects: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`, `OLLAMA_URL`. No provider is forbidden; the chain auto-selects based on which keys are present.
- TTS provider chain: ElevenLabs (if `ELEVENLABS_API_KEY` set) → OpenAI (`OPENAI_API_KEY`) → mock.
- `KELEDON_RESET_DB` and `KELEDON_RESET_QDRANT` must remain `false` in Railway production.
- Railway env tier must remain `KELEDON_ENV_TIER=CI_PROOF` (allows loopback Qdrant; switching breaks production).
- Never simulate success — fail loudly with real errors.

## Do not edit

- `docs/specs/` — IMMUTABLE. Requires a governance Issue before any change.
- `.github/workflows/` changes require the `workflow` OAuth scope on the push token.

## Known gotchas

- **Never run `tsc` or `npx tsc` as a compile check** — it hangs indefinitely in this environment. Railway CI handles compilation.
- Git on Windows: always use `powershell -Command "Set-Location 'C:\KELEDON'; git ..."`. Exit code 1 from PowerShell git often means success (stderr from auto-pack).
- Push to GitHub requires GH token injection into the remote URL: `git remote set-url origin "https://tuyoisaza:<token>@github.com/tuyoisaza/keledon.git"` → push → restore clean URL.
- Stale Qdrant WAL lock files crash container restarts. `start.sh` deletes them at boot — don't remove that step.
- `brain:command(ui_steps)` was silently swallowed before B-005; `device.gateway.ts` now routes it to `executor.executeSteps()`.
- The version-bump CI skips commits whose message starts with `chore(release):` to prevent infinite loops.
