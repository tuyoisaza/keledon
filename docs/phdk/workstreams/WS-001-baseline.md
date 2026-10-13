# WS-001 — baseline reconciliation evidence

Run: 20261012-keledon-four-fronts. Worker scope: read-only source/GitHub inspection; only this report written. PHDK 2.50.8 / PMO bounded worker. No old PR mutation, provider/browser/live probes, tests, commits or publication performed.

## Verified baseline

GitHub main and local origin/main: `52537140e67d0d6c05486fa13837df3eb5316fb3`. Main branch metadata reports `protected:false`; this does not prove absence of repository-level rules. GitHub PR metadata is a point-in-time read, not an independent review approval.

Repository has no root package.json. Source configuration identifies `services/api` (NestJS API) and `services/web` (Vite/React web) as current service topology (`railway.json`, each railway.toml and Dockerfile); browser is Electron runtime. `cloud`/`landing` remain parallel legacy source trees, not proven deployed by these source files. `railway-landing.json` still points at landing/Dockerfile and needs an explicit legacy label. No provider source settings were read, so actual deployed topology is unverified.

| Package | package.json | lock root | lock packages empty-key |
|---|---:|---:|---:|
| services/api | 5.0.52 | 5.0.28 | 5.0.27 |
| services/web | 5.0.40 | 5.0.26 | 5.0.26 |
| browser | 5.0.53 | 0.3.120 | 0.3.120 |
| cloud | 5.0.53 | 0.3.152 | 0.3.152 |
| landing | 5.0.53 | 0.3.120 | 0.3.120 |

Recommend **5.0.54** for this coherent repair candidate, above current maximum 5.0.53; update these five manifests and matching lock metadata without dependency resolution/upgrade. Application versions come from package metadata (`services/api/src/version.ts`, Vite __APP_VERSION__). No active general version-sync/release script found under scripts; root owns a deterministic scoped bump. Do not reset to historical 0.2.x.

## Existing open PR dispositions (no action executed)

All three target main, remain OPEN, report `mergeable:CONFLICTING`, `mergeStateStatus:DIRTY`, empty reviewDecision/reviews/statusCheckRollup. Empty check/review lists do not establish approval or a protection exemption. None should be merged wholesale into current 5.x service topology.

| PR | Head SHA | Assessment and proposed disposition |
|---|---|---|
| [38](https://github.com/tuyoisaza/keledon/pull/38) | 08ea5d41c96c3ac147df6c1325ff1adaecc25b68 | Partially relevant, NOT fully superseded. Pending-device launch and false-negative protocol-handler detection still have current equivalents. Port validated intent into current services/api/web; preserve authorization before mutation and sanitized logs. Legacy startup installer-download/static-assets additions are not proven appropriate for current split API/web services; do not import startup network/credential behavior. Leave old PR unchanged until root records replacement and owner scope for disposition. |
| [39](https://github.com/tuyoisaza/keledon/pull/39) | c9e10bf7bf7d3653869c06ac72c78ccf7a2e148b | 0.2.9 bump is superseded by 5.x. Login __APP_VERSION__ correction already present in both web/landing. Shared pairing/protocol changes overlap PR38 and remain relevant. Reconcile those once in current candidate; do not downgrade versions or claim entire PR already delivered. |
| [40](https://github.com/tuyoisaza/keledon/pull/40) | c0850286f510e1e565aceb7921c56315e76fd3d5 | Title says 0.2.25 but sole commit is 0.2.24. Historical lock bumps superseded. Railway CI_PROOF edit obsolete against current multi-service root config, and cannot authorize provider settings changes. bootstrapTeamVendors removal conflicts with current modular import/call/re-export and should not be reapplied. Legacy Jest config absent in cloud, but current services/api/jest.config.js supplies ts-jest ESM configuration; no need to port old transformer blindly. Recommend classify obsolete recovery branch, with current checks proving candidate separately. |

Actual current unported locations: `services/api/src/crud/crud-keledon.service.ts` no-device rejection near line 285; legacy cloud equivalent near 573. `services/web/src/pages/LaunchKeledonPage.tsx` currentUrl comparison near 137 and landing equivalent near 99. Line numbers may move under concurrent authorized repairs. Old PR code logs pairing codes and mutates pending devices before access verification; copy intent only, never those unsafe ordering/logging details.

## Minimal documentary reconciliation for root

- CLAUDE.md still calls 0.2.5 current, cloud/landing sole deployment, CI automatic bump/release, token-in-remote push workaround, C:/KELEDON mandatory directory, and blanket no-tsc. Replace stale operational claims with current AGENTS scope, explicit workdir, services topology, local checks and normal authenticated git. Keep architecture law Cloud decides / Browser executes and genuine safety controls.
- CLAUDE.md says user must explicitly ask to commit and completion needs only open PR, conflicting with currently authorized Auto and installed remote-main completion standard. Root should align current-task scope without granting future authority.
- `tasks.md` is historical V1.0/V1.5 planning, while TASK.md and current four-front commitments govern this run. Add a historical/inactive pointer, not a new queue.
- `docs/release-governance.md` and `docs/governance/release-workflow.md` describe removed version-bump.yml/release.yml, tag-triggered installer production, scheduled monthly branch pruning, only three versioned packages and obsolete downloads. Replace executable automation guidance with current scoped release process and mark installer artifact publication unavailable/unverified. Do not restore workflows or create tags.
- Preserve immutable docs/specs and historical design records; add current evidence pointers outside them rather than silently rewriting canonical historical contracts.

## Limits and handoff

No git access blocker observed on bounded metadata reads. Three old PRs have actual merge conflicts; these are blockers to merging those branches, not reasons to merge them or blockers to a fresh current candidate. Branch protection metadata alone cannot settle all review controls; root must inspect applicable rules for its outgoing PR. No whole-build or test was run by this worker. Root owns integration, version bump, applicable checks, independent review and verified main delivery. Report remains local/uncommitted.
