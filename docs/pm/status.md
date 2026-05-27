# KELEDON Project Status

**Last updated:** 2026-05-27  
**Current version:** v0.2.29 (cloud/browser/landing package.json aligned)  
**Live:** https://keledon.tuyoisaza.com  
**Repo:** https://github.com/tuyoisaza/keledon

---

## 🚦 Release Pipeline

```
Gate 1 (audit)    ✅ DONE — release was RED, blockers identified
Blockers 1-7      ✅ DONE — all fixes integrated
Gate 2 (fixes)    ✅ DONE — regression tests pushed to main (826ece2)
Gate 3 (sweep)    🟡 ACTIVE — Jest TypeScript runner blocked
Gate 4 (publish)  ⏳ WAITING for Gate 3
```

---

## ✅ Recently Completed

### Gate 2 — v0.2.28
- Cleaned untracked artifacts (backup HTML, broken ci.yml, placeholder monitoring config)
- Added 25 regression tests across 4 suites:
  - Deep-link diagnostics (parsing, HMAC, expiry)
  - Auth boundary (RBAC matrix: superadmin/admin/owner/Google)
  - Release URL contract (`/latest/` stability, env override)
  - Recovery/standby (active vendor filtering, guidance)
- Added `cloud/jest.config.js` (ts-jest ESM preset)
- Added `npm run test:regression` script
- Merged and pushed to `main` (post-merge with CI bump to v0.2.29)

### Blocker Fixes (pre-Gate-2)
- Deep-link signature verification with fallback for packaged clients
- Railway config reconciled (`CI_PROOF` tier, Qdrant flags)
- Release workflow asset verification (gh api + jq, SHA256, ZIP artifact)
- Admin-config auth boundary enforced in CRUD service
- Browser IPC handler duplicate export fixed
- Landing download link points to `/latest/` (not version-pinned)

---

## 🔴 Active Blockers

| # | Blocker | Impact | Owner |
|---|---------|--------|-------|
| 1 | **Jest + ts-jest not installed** despite being in `package-lock.json`. `npm ci` claims "up to date" but `node_modules/jest/` is missing. Babel is used as fallback and cannot parse TypeScript spec files. | Cannot run `npm test` in cloud. Existing `rbac.service.spec.ts` is orphaned. | Gate 3 |
| 2 | **Cron job `KELEDON autónomo`** failing every 30m (last status: error). | Autonomous health checks not running. | Ops |

---

## 📋 Next Steps (Priority Order)

### Immediate (Gate 3)
1. **Fix Jest TypeScript runner**
   - Diagnose why `npm ci` skips `jest`/`ts-jest` (lockfile corruption? peer mismatch?)
   - Align versions: either upgrade `ts-jest` to Jest 30 compatible, or downgrade Jest to 29
   - Verify `node_modules/.bin/jest` exists
   - Run `npx jest src/rbac/rbac.service.spec.ts --runInBand` successfully

2. **Run full test matrix**
   - `cd cloud && npm test`
   - `cd cloud && npm run test:regression`
   - `cd browser && npm run build`
   - `cd landing && npm run build && npm run typecheck`

3. **Lint sweep**
   - `cd cloud && npm run lint`
   - `cd landing && npm run lint`

4. **Error/warning sweep**
   - Boot cloud locally, check for `console.error` spam
   - Verify no unhandled rejections in deep-link handler

### Next (Gate 4)
5. Create Git tag `v0.2.29`
6. Push tag to trigger `.github/workflows/release.yml`
7. Verify GitHub Release assets: `KELEDON.Browser.Setup.exe`, `.sha256`, ZIP
8. Smoke-test landing download link
9. Verify Railway production health (`/health`, `/metrics`)

---

## 🧭 Development Logic

These rules govern how KELEDON is developed and released. They are additive-only and never bypassed.

### 1. Cloud Decides, Browser Executes
- The Browser is **BLIND** — it never makes decisions, never calls AI, never parses intent
- All decision logic lives in `cloud/src/services/decision-engine.service.ts`
- The cloud routes `brain:command` and `brain:audio` to the browser via WebSocket
- Violating this is a hard error, not a style issue

### 2. Additive-Only Changes
- **Never delete** files, code, comments, or configs
- If replacement is unavoidable, preserve backup/legacy context inline
- All commit messages start with the version number: `v0.2.29: description`

### 3. Version Discipline
- Manual bump locations (lockstep):
  - `browser/package.json`
  - `cloud/package.json`
  - `landing/package.json`
  - `landing/src/pages/LaunchKeledonPage.tsx` (download URL if pinned)
- CI auto-bumps patch on every merge to `main` (skips `chore(release):` to prevent loops)
- Releases are tag-driven: push `vX.Y.Z` → CI builds NSIS installer → GitHub Release

### 4. Security & Safety
- `KELEDON_RESET_DB` and `KELEDON_RESET_QDRANT` must remain `false` in production
- `KELEDON_ENV_TIER` must remain `CI_PROOF` (allows loopback Qdrant)
- AI provider is configurable via env vars (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.) — no provider is hard-coded as the only option
- TTS chain: ElevenLabs → OpenAI → mock (auto-selects based on available keys)

### 5. Test Strategy
- Regression tests are pure Node.js (no framework dependency) and live in `cloud/test/regression/`
- They can always be run with `node <file>` or `npm run test:regression`
- Jest-based unit tests (`.spec.ts`) are for NestJS module-level testing
- Never run `tsc`/`npx tsc` directly in development — Railway CI handles compilation

### 6. Branch Law
- Only `main` exists as a permanent branch
- All work goes through PRs from feature branches
- Hotfix direct-to-main is allowed only for critical fixes
- Never declare completion without an open PR (except hotfixes)

### 7. Configurable by Design
- No hard-coded Genesys/Salesforce-only truth
- The cloud decides which vendors/providers to use; the browser executes whatever the cloud sends
- Vendor credentials are encrypted at rest (`KELEDON_VENDOR_KEY`)
- Feature flags (`ENABLE_VECTOR_STORE`, `ENABLE_REAL_TTS`, etc.) control runtime behavior

---

## 📊 System Health Snapshot

| Component | Status | Notes |
|-----------|--------|-------|
| Cloud (Railway) | 🟢 Live | v0.2.29 deployed, `CI_PROOF` tier |
| Landing | 🟢 Live | keledon.tuyoisaza.com |
| Browser (latest release) | 🟡 v0.2.21 | Installer downloadable, deep-link + diagnostics working |
| Qdrant | 🟡 Disabled in prod | Loopback available in `CI_PROOF` |
| STT/TTS/LLM | 🔴 Not active | Feature flags off in Railway production |
| Cron (autónomo) | 🔴 Failing | Every 30m, last status: error |
| GitHub Release pipeline | 🟢 Ready | `release.yml` verified, asset check working |

---

## 🗂️ Key Files

| File | Purpose |
|------|---------|
| `docs/specs/v3_KELEDON_CANON.md` | Architecture contract (immutable without governance issue) |
| `docs/governance/v0.2.29-gate-3.md` | Gate 3 checklist (this release) |
| `docs/governance/release-workflow.md` | Release automation docs |
| `cloud/test/regression/` | Regression test suites (pure Node.js) |
| `.github/workflows/release.yml` | Browser NSIS + GitHub Release CI |
| `.sisyphus/boulder.json` | Task queue — read before touching files |

---

## 🔗 Quick Commands

```bash
# Regression tests
cd cloud && npm run test:regression

# Cloud dev
cd cloud && npm run start:dev

# Browser build
cd browser && npm run build

# Landing build + typecheck
cd landing && npm run build && npm run typecheck

# Lint
cd cloud && npm run lint
```

---

*This document is maintained by the development agent. Updates are pushed to `main` with version-prefixed commits.*
