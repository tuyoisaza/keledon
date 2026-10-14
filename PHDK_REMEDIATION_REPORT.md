# PHDK remediation report — active candidate

## Active continuation — 2026-10-14, candidate 5.1.25

Applied the owner-approved boundaries across API/Cloud/Browser: new users stay `user`; role and tenant authority are DB-derived; sensitive vendor credentials are write-only in ordinary responses and encrypted at rest; client-private CRM destinations require validated, tenant-specific allowlists; Cloud does not proxy-fetch private CRM URLs. Removed synthetic provider “connected/synced” claims when no customer adapter exists and authenticated the legacy global dashboard stream using a DB-validated superadmin session. Added dashboard denial tests for missing tokens and tenant admins.

Latest evidence: all five roots and Browser renderer at 5.1.25; PHDK v2.50.10 coherence 52/52; API lint 0 errors/138 warnings; Cloud lint 0 errors/25 warnings; Cloud configured build and full `tsc --noEmit` PASS; Cloud regression 10/10 suites; API Jest 10/10 suites, 31 tests; Browser offline suite 27/27; focused gateway/store/security Jest 6/6 plus router Jest 2/2; Web diagnostics 19/19 and SEO 1/1; Web built-SPA local UAT 1/1 with synthetic APIs and external traffic blocked; Web and Browser builds PASS. Whole-product acceptance stays partial for persisted DB/migration, native device/audio, the broad CRUD/accessibility matrix, deployed SEO/AEO and the unresolved server-side test-profile design. Candidate changes remain local/uncommitted; delivery is pending.

## Current remediation — v5.1.11

Closed the diagnostics source gaps: measured/allowlisted LLM, STT and TTS results plus feature flags, request limits, retry and kill-switch status; current-DB-superadmin protection for global usage; Web/Landing reports aligned. Retests: API regression 14/14 and targeted Jest 9/9, Cloud 8/8, Web 16/16 and local UAT 1/1, Browser 29/29, builds/typechecks, PHDK coherence 52/52.

Persisted CRUD/migration, native Electron/device/audio, broad accessibility/localization and deployed SEO/AEO remain acceptance items requiring their respective environments. No source-only claim closes them. Details: `docs/phdk/lifecycle/20261013-keledon-v5111/80-remediation/`. Overall status remains **PARTIALLY DELIVERED**.

## 2026-10-13 latest continuation — 5.1.7 local candidate

On branch `fix/fail-closed-api-migrations`, based on verified `origin/main` `3c6e4c71bc5672984a1fd07df62d722f95beb4e7` / 5.1.6, the local uncommitted 5.1.7 candidate removes automatic rollback-resolution commands, fails closed after five migration failures, refuses to seed/start if company count cannot be verified, and makes Docker invoke the checked-in startup script. The API lint command no longer autofixes and keeps typed rules enabled through TypeScript Project Service.

API build/C13 PASS; full `src/**/*.ts` typecheck PASS; regression 11/11 PASS; startup shell and test syntax PASS; full typed ESLint PASS across 184 files (0 errors, 139 warnings). The lint stall was caused by the missing Prettier peer required by the existing ESLint config; Prettier 3.9.9 is now pinned, source formatting is aligned, and all surfaced errors are fixed without disabling rules. Candidate is ready for versioned PR delivery. Remaining acceptance gaps are exhaustive persisted CRUD, native Electron/device/audio, broad accessibility/localization, and deployed SEO/AEO. Bounded existing Railway logs exposed the old rollback command; no direct DB access/migration or deployment was performed. See `docs/phdk/lifecycle/20261012-keledon-four-fronts/80-remediation/CONTINUATION_20261013_5.1.7.md` and `70-check/PHDK_CHECK_REPORT_5.1.7.md`.

The full API source typecheck initially found eight errors; all now pass. Seven were fixed in Analytics/gateway typing and dead legacy modules. The remaining broken path was in duplicate, unreferenced legacy `MinimalCloudServer` entrypoints/manifests; their former CloudServer dependency had already been removed in the Supabase-only migration, while production startup uses Nest `dist/main`. The stale entrypoints/manifests and TypeScript references were retired.

Run: `20261012-keledon-four-fronts` · Product candidate: `5.1.2` (`0d98f2812d8eb88a8626101f81f9bf9ca6d52de0`, merged by #42) · PHDK: 2.50.10 installed from `e3958702d30ae6f9cd18e35b82c7a75a0f11e116`, delivered by KELEDON PR #43 at `5443a5e7eb176a3a0e00b4c2dbb75248fc9b993d` · Stage: Check (GAPS RECORDED); remediation (PARTIAL).

## 2026-10-13 continuation — current Check remediations

- `CHK-LIMIT-001` — the current full app/test source inventory exposed a 719-line API regression suite. Split its authentication/service and management-policy suites into `services/api/test/regression/20-admin-boundaries.test.js` and `25-approved-management-policy.test.js`; preserved assertions and verified both plus the full API runner (10/10 suites). Fresh 1,073-file inventory has 0 files at or above 600 lines.
- `CHK-SEC-HEALTH-002` / UAT-FIX-002 — stopped global `console.error` interception and removed raw error-buffer/cloud-URL exposure. API build, safe-output regression and Nest guard HTTP cases pass.
- `CHK-TENANT-USERS-003` / UAT-FIX-003 — managers may reassign ordinary users only within their DB-derived company. UI and guard permit same-company team updates while rejecting foreign team, company and role changes. Synthetic SPA UAT and isolated Nest guard regression pass; persistence remains unverified.
- `CHK-A11Y-USERS-004` — exposed managers' fixed company context as a native fieldset with a legend; verified the accessible “Company” group in exact 5.1.2 local SPA UAT.
- Changed API files pass scoped ESLint. API/Cloud/web/landing builds and the applicable API, Cloud, diagnostics, SEO and synthetic UI tests pass as enumerated in `PHDK_CHECK_REPORT.md`.

Residual Check items remain: persisted full CRUD matrix and migration behavior, broad app accessibility/localization and native Electron/device/audio acceptance, deployed SEO/AEO evidence, and owner disposition of legacy PRs #38–40. The two PHDK tool gaps are repaired upstream (PHDK PRs #48/#49), v2.50.10 is installed and synced through KELEDON PR #43; its coherence checker passes and the completion gate's isolated JSON-source smoke passes. Do not classify product/runtime acceptance as fixed by the standards sync.

## Resolved defects and modularity gaps

- `CHK-MOD-001` — the source background entry imported a nonexistent default export from an incomplete legacy file. It now retains the old default-import path through a 2-line compatibility export to the extension runtime.
- `CHK-LIMIT-002` — split the 828-line integration test suite into a 381-line server and a 397-line case module; preserved all 33 methods.
- `CHK-LIMIT-003` — split the 1,029-line `CallsService` into a 430-line service plus record/lifecycle/context/type modules. API production/C13 build and regression 8/8 pass; isolated `getCall` dispatch passes.
- `CHK-LIMIT-004` — split the 1,020-line extension background service into a 107-line composition root and four method modules (216–263 lines). Preserved all 30 methods; import/mixin smoke and agent validation pass.
- `CHK-LIMIT-005` — split duplicate 861-line source/extension RPA executors into 42-line composition roots and four mirrored method modules (111–329 lines). Both copies retain all 30 methods; runtime smoke and graph/parity validation pass.
- `CHK-LIMIT-006` — split the API and Cloud analytics controllers into route roots, inherited helper modules, and type modules; all files are below 600 lines. API and Cloud production/C13 builds and both regression suites (8/8 each) pass. Cloud severity aggregation and execution sorting were corrected during typed validation.
- `CHK-LIMIT-007` — split API and Cloud `DecisionEngineService` implementations into sub-600-line services, context/flow/policy helpers and public type modules. Existing service entry points and typed flow execution result were retained. Cloud validates vector-search results at runtime before command generation; API and Cloud production/C13 builds pass, and changed Cloud service modules pass scoped ESLint with 0 errors.
- `CHK-LIMIT-008` — split API and Cloud `FlowExecutionService` into sub-600-line services, step/performance helpers, template factories and public types. Public method/type contracts remain intact; both builds/C13, regression suites (8/8) and default-template/default-step smoke checks pass.
- `CHK-LIMIT-009` — split API and Cloud real-time Alerting into service roots, defaults, notification delivery, monitoring checks and shared public types; both roots are 476/470 lines and both builds/regressions pass.
- `CHK-LIMIT-010` — split API and Cloud UI Automation into service roots, DOM helpers, action helpers and shared public contracts. The roots are 225 lines each; isolated compilation, package builds/C13, and regressions (8/8 each) pass. The split also corrects duration reporting, timeout cleanup, failed-execution state cleanup, and per-session execution history typing.

The inventory fell from 16 to 0 files at or above 600 lines. See `PHDK_LINE_LIMIT_AUDIT.md` for the scan rule and current result.

## Validation evidence

- `agent`: `npm run validate` passes; the background/RPA local import graph resolves and parses 11 modules, and all five source/extension RPA assets are identical.
- RPA runtime smoke verifies method attachment, event registration/emission and status query; 30 methods preserved in each copy.
- `services/api`: production/C13 build passes; regression suite 8/8 passes; isolated record-helper `getCall` dispatch passes.
- Phase 5 server and case module pass `node --check`; all 33 methods are preserved.
- Background extension method mixins load successfully; extension validator passes.

## Remaining gaps

`CHK-LIMIT-001` is PASS: the repository-wide physical-line scan finds no source files at or above 600 lines. Full translation/content review (catalog keys match), deployed private-route header verification, rendered accessibility/contrast and Electron diagnostics-widget acceptance remain open. Agent Jest passes 9/9 suites and 78/78 tests, including packaged-extension tab registry tests; Agent extension validation passes. Landing/agent typecheck limitations remain documented in `PHDK_CHECK_REPORT.md`. Importing the full compiled CallsService class in this workspace is blocked by a missing native `bcrypt` binding; build/regression pass and the extracted helper has direct dispatch coverage.

The owner approved inclusion/merge of the managed-AI migration through normal DB procedure on 2026-10-13. It remains source-only and unexecuted; no database was connected to.

Status: PARTIALLY DELIVERED; remediation continues. PR merge and remote `main` readback remain pending.

## Current continuation — 2026-10-13

Product PR #42 is merged and independently read back. PHDK central tool defects are repaired in merged PRs #48/#49; the v2.50.10 installation and both PHDK checkers pass locally, with the completion gate's actual remote JSON-version smoke passing. KELEDON downstream standards-sync delivery remains pending. Open acceptance remains persisted database/migration, native Electron/device/audio, broad accessibility/localization and deployed SEO/AEO; no such runtime evidence is claimed.
# Remediation — v5.1.11 (2026-10-13)

Closed the in-scope PHDK diagnostics findings: replaced stale feature-flag/provider-metric claims with measured, allowlisted LLM/STT/TTS outcomes and process limits/switch states; protected global usage with the current database superadmin role; updated the shared Web/Landing report; added privacy, role-gating and regression tests. Retests pass: API 14/14 + focused Jest 9/9, Cloud 8/8, Web 16/16 + UAT 1/1, Browser 29/29, all five builds, and PHDK coherence 52/52.

Residual items require separate acceptance environments: persisted CRUD/migration, native Electron/device/audio, broad accessibility/localization and deployed SEO/AEO. No source-only evidence closes these. Details: `docs/phdk/lifecycle/20261013-keledon-v5111/80-remediation/`. Overall: PARTIALLY DELIVERED.
