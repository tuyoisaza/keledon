# Workstreams

## Current update — stage 45 and owner-approved tenant interface selector (2026-10-17)

| WS | Current status | Open gate |
|---|---|---|
| WS-001 / CMT-001 | PHDK v2.53.0 installed; candidate 5.2.0 version reconciled; API/Cloud regressions and build checks pass. | Run final candidate coherence/diff review, then normal versioned PR delivery. |
| WS-002 / CMT-002 | Prior 5.1.85 widget evidence remains scoped. | Authenticated populated-card and screen-reader evidence remains MANUAL. |
| WS-003 / CMT-003 | Provider-neutral client-specific contracts remain intact. | Live call/CRM acceptance awaits each client's chosen stack. |
| WS-004 / CMT-004 | Owner-approved company-specific Admin/Coordinator interface selector implemented across API/Cloud/Web with catalog migrations and masked projections. | Run database migration, seeded-role permission tests and browser UAT; local PostgreSQL launch is blocked by Windows Application Control. |
| WS-X | Stage 45 UAT Prep seeder and safe target policy implemented. | Real isolated seed/login/Test-as/cleanup run blocked; no production/provider action. |

The approval changes the former TeamInterface selector decision. Global catalog entries remain hidden from tenant roles; each tenant sees only its own catalog and no credential values. Whole Auto remains partial.
## Active integrated portfolio — 20261014-0007-phdk-auto-completion

| WS | Commitment / outcome | Scope | Current status | Acceptance / dependency |
|---|---|---|---|---|
| WS-001 | CMT-001 baseline, versions and reviewed delivery | Manifests/locks, PHDK evidence, PR lineage and release gate | Current main `6ae4e0a07fa6b0683ad3d32878a00feb6a88dc50`; candidate 5.2.0 versioned and locally checked | Complete final diff review, version-prefixed commit, push, PR and remote verification. |
| WS-002 | CMT-002 widget and safe diagnostics | Shared Web/Landing/Browser component, mounts, redaction/reset/accessibility | 5.1.85 keyboard selection shipped; UAT-095 scoped PASS; portfolio partial | Authenticated populated-card/screen-reader and native device/audio gates remain. |
| WS-003 | CMT-003 voice→Cloud→Browser→customer-selected CRM | API/Cloud flow configuration, per-tenant adapters and Browser origin enforcement | Source contracts and tenant-origin policy PASS; customer acceptance open | Run live acceptance only after each tenant selects/configures its stack; no universal provider is assumed. |
| WS-004 | CMT-004 administration and permissions | API/Cloud RBAC, secret projection, Prisma resources, migrations | Tenant selector implementation and migration source verified; CRUD matrix 29 PASS, 406 BLOCKED, 122 N/A, 3 decisions | Database-backed Prep/migration, broad persisted role/surface coverage, audit/export/retention remain. FlowRunEvidence is dormant/N/A. |
| WS-X | Cross-cutting PHDK conformance | Plan/Integration, UAT, SEO/AEO, Check and lifecycle evidence | PHDK 2.53.0 coherence 64/64; candidate 5.2.0 integrated source checks pass | Portfolio remains partial pending database, browser, manual, client and deployed acceptance. |

Four owner-confirmed fronts remain active in their agreed order. No worker is assigned. TeamInterface Web assignment remains a recorded decision; keep global ManagedInterface catalog hidden from tenant roles.


## Current continuation — 2026-10-13, candidate 5.1.16

| WS | Commitment/outcome | Files/scope | Owner/status | Acceptance |
|---|---|---|---|---|
| WS-001 | CMT-001 coherent baseline and normal release | Root PHDK evidence, versions, PR/readback | Root IN PROGRESS | Fresh main SHA/version, one scoped PR and completion gate. |
| WS-002 | CMT-002 shared safe diagnostics and native shell | Web/Landing/Browser widget, native permission/device | Root SOURCE REUSED; native ACCEPTANCE OPEN | Diagnostics 18/18 and synthetic SPA pass; native controller unavailable. |
| WS-003 | CMT-003 provider-independent voice/cloud/browser/customer-selected CRM | API/Cloud/Browser contracts and per-tenant configuration | Root SOURCE REUSED | Source/synthetic contract evidence; no vendor assumption or live-client claim. |
| WS-004 | CMT-004 restrictive administration and permissions | API guards/CRUD, admin UI, persisted matrix | Root SOURCE REUSED; PERSISTED ACCEPTANCE OPEN | API regression 14/14 and selected synthetic UAT; exhaustive persisted matrix open. |
| WS-X | Cross-cutting maximum conformity | Active route copy, semantics and UX evidence | Root IN PROGRESS | PR #74 integrated dashboard/session/call-monitor localization; this increment extends profile/devices/session detail. Whole active-route i18n/a11y remains open. |
| WS-X current increment | Cross-cutting maximum conformity | Profile, devices and session detail | Root IN PROGRESS | Web typecheck/build, UAT-T-007 and UAT-T-005 detail pass; whole active-route i18n/a11y remains open. |

No worker delegation is used. Full current evidence is in `docs/phdk/lifecycle/20261013-keledon-auto-conformity/`.

| WS | Commitment/outcome | Files/scope | Owner/status | Acceptance |
|---|---|---|---|---|
| 001 | CMT-001 coherent baseline | root docs/version/PR review | root IN PROGRESS | UAT-001 |
| 002 | CMT-002 safe diagnostics | web/landing shared UI/lib/mounts; Electron renderer | root READY | UAT-002 |
| 003 | CMT-003 deterministic runtime | API voice/planner/gateway, browser non-renderer | runtime worker READY | UAT-003/005 |
| 004 | CMT-004 bounded admin | API CRUD/auth/guards, exact matrix and tests | admin worker READY | UAT-004 |
Same local branch; no worker shared/version/git edits. Request shared changes through root. No floor restoration or recursive delegation.
