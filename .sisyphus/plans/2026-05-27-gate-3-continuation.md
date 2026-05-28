# Gate 3 → Gate 4 Continuation Plan

> **Status:** v0.2.31 on `main` (PR #35 B-005–B-008 already merged)
> **Blockers:** Jest runner broken, Railway deployment failed, node_modules/ corrupted
> **See also:** `docs/pm/status.md`, `docs/governance/v0.2.29-gate-3.md`

---

## Phase 0: Fix Dev Environment (Pre-Gate 3)

**Goal:** Unblock `npm test` in cloud/ so Gate 3 can proceed.

**Root Cause:** `node_modules/` has stale temp directories (`.date-fns-k5iK0FDl`) from an interrupted `npm install`. The lockfile is also corrupted — `npm ci` fails with "Missing: wordwrap@1.0.0 from lock file". `ts-jest` was never committed to `package-lock.json` even though it's in `package.json`.

State currently: cannot `npm install` (ENOTEMPTY rename error) or `npm ci` (Missing from lock file).

**Task 0.1: Clean stale npm temp artifacts**
```bash
cd /mnt/c/DEVPROD/KELEDON/cloud
rm -rf node_modules/.date-fns-k5iK0FDl
```
→ Then retry `npm install --no-audit --no-fund`

**Task 0.2: If lockfile is beyond repair**
```bash
rm package-lock.json
npm install --no-audit --no-fund
```
→ This regenerates lockfile with jest + ts-jest properly included.

**Task 0.3: Verify jest binary exists**
```bash
node_modules/.bin/jest --version
# Should print "30.x.x"
```

**Verification:** `npm test` runs without "jest: not found" error.

---

## Phase 1: Gate 3 — Test, Lint, Build Sweep

**Goal:** All tests passing, all lint clean, all builds green.

### Task 1.1: Run regression tests
```bash
cd /mnt/c/DEVPROD/KELEDON/cloud
npm run test:regression
```
→ Expected: `25 passed, 0 failed` (4 suites from Gate 2)

### Task 1.2: Run unit tests (Jest)
```bash
cd /mnt/c/DEVPROD/KELEDON/cloud
npm test
```
→ Expected: All `.spec.ts` files pass, specifically `rbac.service.spec.ts`

### Task 1.3: Browser build
```bash
cd /mnt/c/DEVPROD/KELEDON/browser
npm run build
```
→ Expected: TypeScript compiles without errors

### Task 1.4: Landing build + typecheck
```bash
cd /mnt/c/DEVPROD/KELEDON/landing
npm run build
npm run typecheck
```
→ Expected: Vite production build succeeds, `tsc --noEmit` passes

### Task 1.5: Lint sweep
```bash
cd /mnt/c/DEVPROD/KELEDON/cloud && npm run lint
cd /mnt/c/DEVPROD/KELEDON/landing && npm run lint
```
→ Expected: Zero lint errors

### Task 1.6: Version alignment
Verify all 4 locations match `v0.2.31`:
- `browser/package.json`
- `cloud/package.json`
- `landing/package.json`
- `landing/src/pages/LaunchKeledonPage.tsx` (uses `latest` not pinned)

### Task 1.7: Error/warning sweep
- Boot cloud locally, check for `console.error` spam
- Verify `KELEDON_RESET_DB` and `KELEDON_RESET_QDRANT` are `false` in prod
- Check Railway dashboard for runtime errors

---

## Phase 2: Address Railway Deployment Failure

**Goal:** Get `keledon.tuyoisaza.com` back online.

**Current state:** Both `keledon` service and Postgres are in failed deployment state.

### Task 2.1: Inspect Railway deploy logs
```bash
railway logs --deployment <latest-failed-id>
```
→ Identify the runtime/startup error

### Task 2.2: Fix deployment issue
Common causes to check:
- Missing env vars (API keys for newly configured providers?)
- Start command mismatch
- Postgres connection string outdated after service restart
- Dependency version mismatch between local `main` and Railway image

### Task 2.3: Trigger redeployment
```bash
railway up
# or via GitHub push to main → auto-deploy
```

### Task 2.4: Smoke test
- `curl https://keledon.tuyoisaza.com/health`
- `curl https://keledon.tuyoisaza.com/metrics`
- Verify WebSocket handshake

---

## Phase 3: Address Open PRs

**Current open PRs:**
| PR | Title | State | Notes |
|----|-------|-------|-------|
| #35 | B-005–B-008 | ✅ **MERGED** | Already in main |
| #38 | v0.2.5 browser pairing | 🔴 Conflicting | Stale, needs rebase or close |
| #39 | v0.2.25 recovery | 🟡 Open | Stale branch |
| #40 | v0.2.25 recovery | 🟡 Open | Stale branch |

### Task 3.1: Evaluate stale PRs
- Check if #38/#39/#40 contain work not yet in `main`
- If superseded, close with reference
- If valuable, rebase onto latest `main`

---

## Phase 4: Gate 4 — Release v0.2.31

**Goal:** Push tag, trigger release pipeline, verify assets.

### Task 4.1: Version bump if needed
Current is v0.2.31 — verify all 4 locations are aligned.

### Task 4.2: Create and push tag
```bash
git tag v0.2.31
git push origin v0.2.31
```

### Task 4.3: Verify release pipeline
- `gh workflow run Release` or wait for tag trigger
- Monitor `.github/workflows/release.yml`
- Verify GitHub Release assets:
  - `KELEDON.Browser.Setup.exe`
  - `.sha256`
  - `keledon-*-win-x64.zip`

### Task 4.4: Post-release smoke test
- Landing download link works
- `keledon.tuyoisaza.com/health` returns 200
- Browser installer downloads and extracts

---

## Phase 5: Production Health

### Task 5.1: Fix failing cron job
- `KELEDON autónomo` failing every 30m
- Diagnose: check cron logs, verify health endpoint

### Task 5.2: Enable runtime features
Current prod state: STT/TTS/LLM all 🔴 inactive
- Feature flags off in Railway config
- Evaluate which to enable post-release

---

## Execution Strategy

Each Phase should be approved before proceeding to the next. Phases 0–1 are prerequisite before anything else can run.

**First step (Phase 0):** Clean the stale npm temp directory that's blocking `npm install`. This is the single bottleneck — everything else depends on it.
