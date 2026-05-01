# KELEDON Branch Governance Policy

**Owner:** Engineering
**Effective:** 2026-04-19
**Review cadence:** Monthly (first Sunday of each month)

---

## Branch Naming Convention

| Prefix | Purpose | Lifetime |
|--------|---------|---------|
| `main` | Production trunk | Permanent |
| `feat/<topic>` | New feature work | Merge within 2 weeks or archive |
| `fix/<topic>` | Bug fixes | Merge within 1 week or archive |
| `release/<vX.Y.Z>` | Release stabilization | Until release ships, then delete |
| `infra/<topic>` | Infrastructure / CI work | Merge within 2 weeks or archive |
| `archive/<name>` | Preserved refs (read-only) | Permanent (never re-open) |
| `bk/<name>` | Point-in-time backup snapshots | Permanent (read-only) |

---

## Archive Policy

A branch is a **candidate for archiving** when:
- It has not had a commit in **>4 weeks**, AND
- It is not referenced by any open PR, AND
- Its work has been merged to `main` or superseded

### Archive procedure (remote branch)
1. Ensure the branch has a corresponding `origin/` remote ref (this IS the archive)
2. Delete the local tracking ref: `git branch -d <branch>`
3. If remote deletion is also desired, run: `git push origin --delete <branch>`
   - Only delete remote after confirming the ref is no longer needed for rollback

### Exception requests
Open a GitHub Issue with label `branch-exception` to preserve a branch beyond its lifetime.

---

## Current Cleanup Batch (2026-04-19)

### Local-only (safe to delete — no remote counterpart)
These branches exist only locally; deleting them loses nothing:
```
phase4/best-practices
phase5/extension-runtime-stability
test/runtime-deep-validation-C45
housekeeping/cleanup-phase1
feat/c22-overnight-session
feat/c20-canonical-managed-services-lock
feat/c17-local-superadmin-login-flow
feat/c18-local-supabase-unblock
agent/sidepanel-truth-roundtrip
backup/salvage-before-fix
feature/step5-rpa-deterministic
feature/step4-tts-interruptible
feature/step3-stt-text-input-events
feature/add-autonomous-protocol-to-canon
feat/c09-e2e-proof-trace-contract
feat/c10-extension-runtime-proof
bk-2026-04-11
```

### Remote stale branches (candidates for `git push origin --delete`)
These are preserved as remote refs; run `scripts/prune-remote-branches.sh` to delete:
```
feat/c07-decision-evidence-tracing
feat/c06-cloud-otel-orchestration
feat/c11-extension-exec-evidence-wiring
feat/c12-proof-automation-real-extension
feat/c13-proof-regression-lock
feat/c14-otel-superadmin-dashboard
feat/c15-otel-superadmin-dashboard-impl
feat/c16-superadmin-rbac-lock
feat/c19-local-supabase-cli-bootstrap
feat/c21-prod-config-lock
phase3/webrtc-audio-injection
phase3/voice-roundtrip-stt-tts
phase3/decision-engine-minimal
phase3/observability-monitoring
phase3/side-panel-intelligence
phase3/agent-orchestration
phase3/voice-analytics-processing
phase3/ui-automation-runtime
phase3/decision-engine-routing
phase3/mvp-determinism-phase3-lock
phase4/full-stack-real-integration
infra/floor-restore-001
infra/cloud-boot-stability
infra/phase2-db-hardening-db-ready
infra/phase2-enforcement-v5-1770312042
infra/floor-build-isolation-final-1770312042
agent/sidepanel-rewire
agent/vector-rewire
agent/supabase-rewire
agent/agent-connection-rewire
agent/websocket-connection
agent/stt-text-input-wiring
agent/rpa-step-executor-wiring
agent/tts-responses-cloud-agent-speaks
agent/session-persistence
agent/command-response-flow
agent/integration-testing
agent/deployment-orchestration
agent/production-testing
agent/deployment-documentation
agent/final-cleanup-canonical-state
agent/text-input-flow
agent/ui-automation-pipeline
agent/sidepanel-rewire
cloud/brain-decision-commands
feature/step6-webrtc-integration
housekeeping/trim-safe
local-run/refix
pm/keledon-cleanup
railway/prisma-ready
issue/agent-cloud-connection
legacy/pre-canon
workable
MAIN02042026
bk/canon-master-20260308-2105
backup/2026-03-04-pre-railway
```

### Keep (active or intentional archives)
```
main                              — active trunk
fix/brain                         — recent (consider merging or archiving)
archive/MAIN-BK-20260206-0317    — intentional archive
archive/main-2026-02-14-C41-lock — intentional archive
archive/main-2026-02-14-C43-pass — intentional archive
archive/main-2026-02-16-C49-pass — intentional archive
archive/MAIN-BK-20260209-CANON   — intentional archive
archive/MAIN-BK-20260209-0704    — intentional archive
archive/MAIN-BK-20260206-0315    — intentional archive
archive/MAIN-BK-20260206-0316    — intentional archive
archive/MAIN_PHASE2_BK_20260205  — intentional archive
```

---

## Automated Prune Script

See `.sisyphus/scripts/prune-remote-branches.sh` — review before running.
