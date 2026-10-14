# Implementation plan
## Active integrated continuation — PHDK Auto run `20261013-1900-phdk-auto`, main 5.1.22

PR #89 (`b92a25428a6d25c898e3dfef7a055f754782ed57`) and PR #90 (`48ab2023236ba5de56c046f99670a2abab866707`) are merged. Current main is clean, all five app manifest/lock roots are 5.1.22, and no PR remains open. CMT-001 release alignment and source portions of CMT-002/003/004 are integrated; do not reopen those slices without new evidence.

| Remaining work | Commitment / Check | Next action | Acceptance / external dependency |
|---|---|---|---|
| Exhaustive resource policy | CMT-004 / CHK-002 | Complete model × role × tenant × API/web × list/detail/create/update/delete source mapping; add direct-ID tests for each mutable tenant resource family and reconcile duplicate/embedded routes. | Authorized disposable DB needed for persistence, delete/recovery and migration before/after checks; no production DB. |
| Active-route UX/i18n/a11y | CMT-002/004 / CHK-003 | Continue route-by-route scan; repair confirmed literals and keyboard/name/state gaps, then add focused UAT. | Full screen-reader and exhaustive manual review remain independent acceptance. |
| Managed AI persistence | CMT-004 / CHK-004 | Preserve server-side superadmin gate, validated schema and revision-attributed usage; add source regressions for any new issue. | Reviewed disposable database and additive migration procedure required for persisted acceptance. |
| Tenant-selected call/CRM | CMT-003 | Maintain vendor-neutral interfaces and per-tenant origin-only URL validation; allow explicitly configured private/local targets and block other origins. | Source implemented in 5.1.24; live CRM/call validation remains client-specific because no universal platform is selected. |
| SEO/AEO and native Browser | CMT-001/002 / CHK-005/007 | Keep static source checks; make no field/runtime claim without supported environments. | Deployment/crawler measurements and supported Windows device/audio test host are required. |
| Public locale/market | CHK-006 | Preserve English public canonical without adding guessed locale routes. | Product owner must define target market/languages before multilingual SEO changes. |

Do not claim the four-front Auto goal complete while any confirmed commitment or applicable external acceptance remains open.

## Active continuation — PHDK Auto run `20261013-1900-phdk-auto`, candidate 5.1.17

The four owner-confirmed workstreams remain in order CMT-001 → CMT-002 → CMT-003 → CMT-004. The current 5.1.17 convergence slice addresses CMT-004 administration usability and API-contract correctness across KELEDON and Voice Profiles while preserving the approved DB-derived role/tenant and write-only-secret policies. CMT-002 receives the app-wide notification mount and truthful inline error feedback; CMT-001 has all five app package/lock roots aligned. CMT-003 remains provider-independent because call and CRM platforms vary by client.

| Task | Commitment | Work | Acceptance / dependency |
|---|---|---|---|
| T-014 | CMT-004 / CMT-002 | Localize KELEDON and Voice Profiles; fix tenant and mutation payload contracts; add accessible HTTP error states and global toast renderer. | Web typecheck/build, focused lint, API policy regression, Company Co synthetic browser UAT and locale parity. |
| T-015 | CMT-001..004 | Reconcile applicable PHDK standards, CRUD matrix, active-route i18n/a11y, debug widget, UX/UI, SEO/AEO and delivery evidence. | Source slice delivered by PR #78; continue source-audit findings and keep persisted/native/deployed blockers distinct. |

Dependency order: T-014 → UAT Fix/retest → SEO → AEO/GEO → Check → in-scope remediation → PR #78/main readback. Existing T-001..T-013 history and unresolved work remain active; this continuation does not waive persisted CRUD/migration, native device/audio, broad route audit or deployed discovery evidence.

## Current Auto continuation — 2026-10-13, candidate 5.1.16

The brownfield system remains the existing React/Vite web app, Nest/Prisma API, Cloud runtime, Electron Browser and public Landing surfaces. Preserve the current en/es/pt context, tenant-specific provider contracts, server-derived authorization and additive migration policy; converge in bounded route and contract slices instead of replacing the stack.

| Task | Commitment / WS | Outcome | Dependency / owner | Acceptance |
|---|---|---|---|---|
| T-001 | CMT-001 / WS-001 | Reconcile current upstream, versions and existing PR dispositions | Root | Five package/lock roots agree; scoped PR merged; completion gate reads fresh `main`. |
| T-002 | CMT-002 / WS-002 | Preserve shared safe diagnostics and verify compact controls across supported shells | Root | Focused tests; scoped synthetic web UAT; native rendering/device evidence separate. |
| T-003 | CMT-003 / WS-003 | Maintain provider-independent voice→Cloud→Browser→CRM contracts and per-tenant configuration | Root | Source/contracts and synthetic lifecycle; no hard-coded client vendor. |
| T-004 | CMT-004 / WS-004 | Preserve DB-derived actor/tenant and least-privilege CRUD; enumerate resource/role/surface operations | Root | API negative tests plus matrix evidence; persisted/migration acceptance clearly separate. |
| T-007 | CMT-003/004 / WS-003/004 | Localize dashboard and session journeys; add semantic table captions and filter names | Root | 5.1.15 source merged; UAT-T-005 dashboard and live/history pass. |
| T-008 | CMT-002/004 / cross-cutting | Inventory remaining route-reachable literal UI copy and accessibility states; prioritize user tasks, admin feedback and native shells | Root | Continue route inventory and focused UAT; profile/devices/session detail now covered in 5.1.16. |
| T-009 | CMT-004 / WS-004 | Complete documented CRUD × role × tenant × operation × surface coverage and persistence evidence | Root | Synthetic authorized DB where available; no production DB or migration execution in this Auto run. |
| T-010 | CMT-002 / WS-002 | Complete Electron permission/device/microphone/audio acceptance on supported native host | Root | Native acceptance evidence; current UI bridge is unavailable here. |
| T-011 | CMT-001 / cross-cutting | Verify deployed public SEO/AEO outcomes without conflating source checks with deployment | Root | Read-only deployment/crawler evidence when available; no deploy/provider settings writes. |
| T-012 | All | Integrated Check, scoped UAT, remediation, one version reconciliation and normal PR/main delivery | Root | Current tests, handoffs, diff review, version-prefixed commit, PR controls, remote readback. |

| T-013 | CMT-002/004 / WS-002/004 | Localize profile, devices, launcher and session-detail journeys; announce device loading/errors, provide retry and use the authorized Keledon launcher flow | Root | 5.1.16 typecheck/build, 642-key parity, UAT-T-007-PROFILE-DEVICES, UAT-T-005 detail navigation and focused lint. |

Dependency order: T-001 → T-002/T-003/T-004 → T-007/T-008/T-013 → T-009/T-010/T-011 where prerequisites exist → T-012. T-007 is integrated, T-013 is the current local candidate; T-008/9/10/11 remain active and are not waived.

| Task | Commitment/WS | Outcome | Dependency/owner | Acceptance |
|---|---|---|---|---|
| T-001 | CMT-001/WS-001 | baseline, old-PR applicability, one final version reconciliation | first/root | UAT-001 |
| T-002 | CMT-002/WS-002 | shared safe diagnostics/mounts/action regression | baseline/root | UAT-002 |
| T-003 | CMT-003/WS-003 | trace V4 voice/pair/vendor/CRM; repair reproducible contract gaps | baseline/runtime worker | UAT-003/005 |
| T-004 | CMT-004/WS-004 | exact CRUD/tenant/role audit, tests and established-policy fixes | baseline/admin worker | UAT-004 |
| T-005 | all | central integration, UAT/Fix, SEO/AEO, Check/remediation | T-002..004/root | full ledger reconciliation |
| T-006 | all | single version/check/commit/PR/merge/readback | prior gates/root | verified completion or exact blocker |
Priority/integration order WS-001 -> 002 -> 003 -> 004. After baseline, bounded PMO workers may inspect/repair disjoint runtime/admin files while root implements diagnostics; no worker delegation/git/version/shared edits. No live/paid/migration operations or dependency additions planned. External real-call acceptance needs controlled prerequisites; missing evidence BLOCKED.
