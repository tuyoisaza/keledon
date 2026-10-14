# Implementation plan
## Current Auto continuation — 2026-10-13, candidate 5.1.15

The brownfield system remains the existing React/Vite web app, Nest/Prisma API, Cloud runtime, Electron Browser and public Landing surfaces. Preserve the current en/es/pt context, tenant-specific provider contracts, server-derived authorization and additive migration policy; converge in bounded route and contract slices instead of replacing the stack.

| Task | Commitment / WS | Outcome | Dependency / owner | Acceptance |
|---|---|---|---|---|
| T-001 | CMT-001 / WS-001 | Reconcile current upstream, versions and existing PR dispositions | Root | Five package/lock roots agree; scoped PR merged; completion gate reads fresh `main`. |
| T-002 | CMT-002 / WS-002 | Preserve shared safe diagnostics and verify compact controls across supported shells | Root | Focused tests; scoped synthetic web UAT; native rendering/device evidence separate. |
| T-003 | CMT-003 / WS-003 | Maintain provider-independent voice→Cloud→Browser→CRM contracts and per-tenant configuration | Root | Source/contracts and synthetic lifecycle; no hard-coded client vendor. |
| T-004 | CMT-004 / WS-004 | Preserve DB-derived actor/tenant and least-privilege CRUD; enumerate resource/role/surface operations | Root | API negative tests plus matrix evidence; persisted/migration acceptance clearly separate. |
| T-007 | CMT-003/004 / WS-003/004 | Localize dashboard and live/history session journeys plus call-monitor preview; add labelled filters and semantic table captions/column headers | Root | 5.1.15 typecheck/build, catalog parity, UAT-T-005-DASHBOARD, UAT-T-005-SESSIONS and focused lint. |
| T-008 | CMT-002/004 / cross-cutting | Inventory remaining route-reachable literal UI copy and accessibility states; prioritize user tasks, admin feedback and native shells | Root | Candidate inventory by route/file; exact defects distinguished from brand/domain text; focused UAT per repaired slice. |
| T-009 | CMT-004 / WS-004 | Complete documented CRUD × role × tenant × operation × surface coverage and persistence evidence | Root | Synthetic authorized DB where available; no production DB or migration execution in this Auto run. |
| T-010 | CMT-002 / WS-002 | Complete Electron permission/device/microphone/audio acceptance on supported native host | Root | Native acceptance evidence; current UI bridge is unavailable here. |
| T-011 | CMT-001 / cross-cutting | Verify deployed public SEO/AEO outcomes without conflating source checks with deployment | Root | Read-only deployment/crawler evidence when available; no deploy/provider settings writes. |
| T-012 | All | Integrated Check, scoped UAT, remediation, one version reconciliation and normal PR/main delivery | Root | Current tests, handoffs, diff review, version-prefixed commit, PR controls, remote readback. |

Dependency order: T-001 → T-002/T-003/T-004 → T-007/T-008 → T-009/T-010/T-011 where prerequisites exist → T-012. T-007 is implemented in this candidate; T-008 through T-011 remain explicit debt rather than waived scope.

| Task | Commitment/WS | Outcome | Dependency/owner | Acceptance |
|---|---|---|---|---|
| T-001 | CMT-001/WS-001 | baseline, old-PR applicability, one final version reconciliation | first/root | UAT-001 |
| T-002 | CMT-002/WS-002 | shared safe diagnostics/mounts/action regression | baseline/root | UAT-002 |
| T-003 | CMT-003/WS-003 | trace V4 voice/pair/vendor/CRM; repair reproducible contract gaps | baseline/runtime worker | UAT-003/005 |
| T-004 | CMT-004/WS-004 | exact CRUD/tenant/role audit, tests and established-policy fixes | baseline/admin worker | UAT-004 |
| T-005 | all | central integration, UAT/Fix, SEO/AEO, Check/remediation | T-002..004/root | full ledger reconciliation |
| T-006 | all | single version/check/commit/PR/merge/readback | prior gates/root | verified completion or exact blocker |
Priority/integration order WS-001 -> 002 -> 003 -> 004. After baseline, bounded PMO workers may inspect/repair disjoint runtime/admin files while root implements diagnostics; no worker delegation/git/version/shared edits. No live/paid/migration operations or dependency additions planned. External real-call acceptance needs controlled prerequisites; missing evidence BLOCKED.
