# KELEDON Branch Hygiene Policy

## Status
**Effective Date**: 2026-04-18
**Policy Owner**: Release Engineering / Prometheus

## Purpose
This document defines the branching strategy for KELEDON to ensure a clean, auditable, and maintainable repository. It establishes clear criteria for archiving inactive branches, pruning dead branches, and maintaining a small set of active working branches.

## Branch Categories

### 1. Long-Running Branches (Never Delete)
- `main` — Primary development branch; always kept.
- `master` (if exists) — Legacy equivalence; rarely used.
- Feature branches derived from main.

### 2. Active Working Branches
Branches with recent activity (within 30 days) that are actively being developed:
- Phase-based: `phase3/*`, `phase4/*`
- Agent tracks: `agent/*`
- Infrastructure: `railway/*`
- Hotfixes: `hotfix/*`

### 3. Archived Branches
Inactive branches older than 90 days with meaningful history that should be preserved:
- **Pattern**: `archive/<original-branch-name>`
- **Action**: Rename in place, push to remote, do NOT delete local
- **Retention**: 12 months minimum

### 4. Pruned Branches
Inactive branches older than 90 days with no recent commits AND no active work pending:
- **Pattern**: `backup/*`, `MAIN-BK-*`, `infra/*`, `feat/c06-c22`, `phase0/*`, legacy branches
- **Action**: Delete from remote, delete locally
- **Risk**: Low; these are clearly abandoned

## Branch Naming Conventions
| Prefix | Purpose | Example |
|--------|--------|---------|
| `phase{N}/` | Phase-based feature work | `phase3/voice-roundtrip-stt-tts` |
| `agent/` | Agent pipeline work | `agent/agent-connection-rewire` |
| `railway/` | Infrastructure/deployment | `railway/prisma-ready` |
| `hotfix/` | Urgent production fixes | `hotfix/security-patch-001` |
| `archive/` | Preserved historical work | `archive/MAIN-BK-20260206-0317` |
| `feature/` or `feat/` | New features | `feat/c22-overnight-session` |

## Branch Review Cadence
- **Quarterly**: Full branch review at the end of each quarter.
- **Monthly**: Automated report of branches older than 60 days.

## Exceptions
- Branches with active PRs or pending reviews are exempt from pruning.
- Branches referenced in open issues are exempt.
- Branches with recent commits (even if older than 90 days) are exempt.

## Actions Taken (2026-04-18)

### Archived
| Original Branch | Archive Name |
|--------------|------------|
| MAIN-BK-20260206-0315 | archive/MAIN-BK-20260206-0315 |
| MAIN-BK-20260206-0316 | archive/MAIN-BK-20260206-0316 |
| MAIN-BK-20260206-0317 | archive/MAIN-BK-20260206-0317 |
| MAIN-BK-20260209-0704 | archive/MAIN-BK-20260209-0704 |
| MAIN-BK-20260209-CANON | archive/MAIN-BK-20260209-CANON |
| backup/2026-03-04-pre-railway | archive/backup-2026-03-04-pre-railway |

### Pruned (Deleted)
| Branch | Reason |
|--------|--------|
| bk-2026-04-11 | Duplicate of main work, superseded |
| bk/canon-master-20260308-2105 | Old backup, superseded |
| housekeeping/cleanup-phase1 | One-off cleanup, superseded |
| housekeeping/trim-safe | One-off cleanup, superseded |
| local-run/refix | Local-only, abandoned |
| test/runtime-deep-validation-C45 | Test branch, concluded |

### Active Branches (Preserved)
- `main` — Primary
- `phase3/*` — Active phase work
- `agent/*` — Agent pipeline
- `railway/prisma-ready` — Infrastructure

## Policy Review
This policy is reviewed quarterly. Changes require approval from Release Engineering or a governance decision.

---
**End of Branch Hygiene Policy**