## Candidate 5.1.73 — UAT-072 Web superadmin Company CRUD

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-072 | CMT-004 / synthetic Web superadmin | Open the production-built SPA against an intercepted synthetic API; create, edit and delete a Company with country relations. | Exact create/update payloads are sent; company and country labels read back from the mock store; native delete confirmation precedes removal. | Local Web SPA / headless Edge; external traffic blocked | PASS: 6 contract assertions. UI and payload only; backend authorization and persistence are not claimed. Evidence: `evidence/uat-072-web-company-superadmin-5.1.73.json` and screenshot. |

## Candidate 5.1.73 — UAT-073 tenant flow editor Web journey

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-073 | CMT-003 / synthetic Company Co tenant admin | On the production-built SPA, create a flow, save draft and approved versions, enable company availability, add intent mapping, and test 390px reflow. | Tenant scope is derived into flow create and permission/mapping writes; reads include the company filter; no company picker appears; 390px view has no horizontal overflow. | Local Web SPA / headless Edge with intercepted API; external network blocked | PASS: flow editor browser suite 1/1. UI/request contract only; no API/Cloud auth or database persistence claim. Evidence: `evidence/uat-073-flow-editor-5.1.73.json` and screenshots. |

Portfolio tally: **71 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. The full resource × role × surface × operation matrix, remaining resource families, native device/audio, broad accessibility/localization, Session lifecycle decisions, deployed SEO/AEO, Qdrant concurrency and per-customer live call/CRM remain open.

Portfolio tally before UAT-073: **70 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. The full resource × role × surface × operation matrix, remaining resource families, native device/audio, broad accessibility/localization, Session lifecycle decisions, deployed SEO/AEO, Qdrant concurrency and per-customer call/CRM remain open.

## Candidate 5.1.73 — UAT-071 persisted superadmin Company CRUD

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-071 | CMT-004 / persisted synthetic superadmin | Register a synthetic account in each disposable database and verify default role=user; prepare an isolated superadmin fixture; exercise API and Cloud Company list/detail/create/update/delete, country relations, and role assignment to a user in the created company; verify deletion and cleanup. | Superadmin reads global Company list/detail; create/update/country relations persist; user role/company assignment persists with safe response projection; only the synthetic test user/company are deleted; fixture rows are removed. | Local API/Cloud HTTP and separate disposable PostgreSQL 16.15 databases | PASS: 12 assertions per backend (24 total); company and country relation were absent after deletion. The Web UI sample is tracked separately in UAT-072; the overall CRUD matrix stays open. Evidence: `evidence/uat-071-superadmin-company-crud-5.1.73.json`. |

Portfolio tally at that point: **69 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. The full resource × role × surface × operation matrix, remaining resource families, native device/audio, broad accessibility/localization, Session lifecycle decisions, deployed SEO/AEO, Qdrant concurrency and per-customer call/CRM remain open.

## Candidate 5.1.73 — UAT-070 persisted coordinator CRUD role boundaries

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-070 | CMT-004 / persisted coordinator A plus tenant admin B | Register a synthetic user in each disposable database, prepare the coordinator only as an isolated UAT fixture, verify login role/company from the database, then exercise API and Cloud Company/User/Brand/Team list/detail/create/update/delete and forbidden cross-tenant/privilege operations. | Registration begins at role=user; coordinator lists and records stay in tenant A; company create/delete and role elevation fail; allowed same-tenant CRUD persists and reads back; all temporary records are removed. | Local API/Cloud HTTP and separate disposable PostgreSQL 16.15 databases | PASS: 22 assertions per service (44 total); both databases confirmed coordinator identity/scope; temporary fixtures removed with zero residual test rows. Evidence: `evidence/uat-070-coordinator-crud-5.1.73.json`. Full resource/surface coverage remains open. |

Portfolio tally: **68 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. The full resource × role × surface × operation matrix, native device/audio, broad accessibility/localization, remaining Session lifecycle decisions, deployed SEO/AEO, Qdrant concurrency and per-customer call/CRM remain open.

## Candidate 5.1.73 — UAT-069 persisted tenant CRUD role boundaries

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-069 | CMT-004 / persisted tenant admins A and B | Authenticate synthetic tenant admins against disposable PostgreSQL; exercise API and Cloud HTTP list/detail/create/update/delete for Company, User, Brand and Team, including forged tenant filters, foreign direct IDs, forbidden company create/delete, privilege escalation and cleanup. | Lists use the database actor's tenant; foreign IDs and forbidden privilege/company actions return 403; a newly created user is role=user in the actor's company; allowed same-tenant CRUD persists and reads back; all temporary rows are deleted. | Local API/Cloud HTTP and separate disposable PostgreSQL 16.15 databases | PASS: 19 assertions per service (38 total); API and Cloud resolved persisted actors and applied tenant boundaries; temporary fixtures removed and zero residual test rows. Evidence: `evidence/uat-069-crud-roles-5.1.73.json`. Coordinator's persisted route journey and the complete model/role/surface matrix remain open. |

Portfolio tally: **67 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. Coordinator persistence and exhaustive resource coverage remain open alongside the other portfolio gates.

## Candidate 5.1.73 — UAT-068 authenticated orphan-session cleanup

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-068 | CMT-004 / anonymous, tenant admin and superadmin | Start 5.1.73 API and Cloud against separate disposable PostgreSQL 16.15 databases; issue authenticated GET count and DELETE requests with synthetic/current-DB actors; include active, metadata-bearing and related-record sessions. | Anonymous denied 401; tenant admin denied 403; superadmin sees/deletes only the ended empty orphan; sessions with activity or related Event, FlowRun or SubAgent remain. Test rows/account are removed after readback. | Local API/Cloud HTTP and PostgreSQL | PASS: both API and Cloud returned 401/403 for denials; each superadmin count/delete affected one eligible fixture; five ineligible variants remained; final candidate count zero. Evidence: `evidence/uat-068-orphan-cleanup-5.1.73.json`. |

Portfolio tally at that point: **66 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. The full resource × role × surface × operation matrix, native device/audio, broad accessibility/localization, remaining Session lifecycle decisions, deployed SEO/AEO, Qdrant concurrency and per-customer call/CRM remained open.

## Candidate 5.1.72 — UAT-067 production-built Web widget accessibility and diagnostics

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-067 | CMT-002 / anonymous visitor and synthetic tenant roles | Build Web 5.1.72; block external traffic and intercept APIs; inspect the shared diagnostics widget; exercise keyboard navigation, copy feedback, reset, responsive widths, protected diagnostics and synthetic admin flows. Scan text contrast on management, Knowledge, dashboard, sessions, profile and devices; exercise English/Spanish/Portuguese and dark/light/corporate themes on sampled routes. | Actions have accessible names, 44×44px targets, visible keyboard focus and polite live status; redaction/reset behavior and selected UI journeys work without external calls; scanned text meets WCAG 2.2 AA contrast thresholds, and no sampled failures remain. | Local production-built Web SPA / Playwright Chromium | PASS for this local synthetic scope: production-built UAT 6/6 plus AI-admin UAT; focused diagnostics 19/19; selected multi-route/role/locale/theme contrast scan passes. Corrected the Providers sublabel (4.17:1), primary-action foreground (2.38:1), muted text token (4.06:1), completed badge (4.22:1) and paired-device label (2.12:1); retests pass. Evidence: `evidence/uat-067-web-accessibility-5.1.72.json` and `evidence/uat-web-widget-5.1.72/`. Screen-reader and exhaustive-route certification remain open. |

Portfolio tally: **65 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. Native Electron/device/audio remains MANUAL; broad route/role/screen-reader/localization acceptance, deployed SEO/AEO, Qdrant concurrency, complete resource operations, Session lifecycle policy and per-customer call/CRM acceptance remain open.

## Candidate 5.1.72 — UAT-066 disposable PostgreSQL roles, tenant scope and persistence

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-066 | UAT-060 / synthetic superadmin and tenant admins | Apply API and Cloud Prisma migrations to separate disposable PostgreSQL 16.15 databases; exercise registration, DB-derived identity, two-tenant company/session access, forbidden writes, restart persistence, shared-database API instances and flow permission/version constraints. | Migrations are current and repeatable; persisted actor scope isolates tenants; allowed Session status/metadata writes survive restart; forbidden cross-tenant/reassignment/elevation actions fail closed; schema constraints reject cross-tenant permission and duplicate versions. | Local loopback API and Cloud with synthetic identities | PASS for 26 API and 10 Cloud assertions, restart persistence for both, API two-instance shared-DB behavior, and constraints in both schemas. Evidence: `evidence/uat-postgres-core-5.1.72.json`. Full resource/operation matrix remains open. |

UAT-060 is resolved for this core disposable-PostgreSQL scope. Portfolio tally: **64 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. Native device/audio remains MANUAL; exhaustive CRUD coverage, the three Session lifecycle decisions, broad accessibility/localization, deployed SEO/AEO, Qdrant concurrency and client-specific call/CRM journeys remain open.

## Candidate 5.1.71 — UAT-065 FlowRunEvidence dormancy

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-065 | Owner / CMT-004 | Inspect Prisma model and search API, Cloud, Web and Browser source for runtime references; compare with FlowRun/SubAgentRun execution; review the 39-model/546-row inventory. | FlowRunEvidence remains in Prisma for possible future use; no active reader, writer, route or UI is claimed. All 14 role/surface combinations are NOT APPLICABLE. No role grants, retention job, or schema migration is added. Revisit only with a defined contract and approved migration. | Owner decision, source inventory, API regression 33 | PASS for decision and source classification only. No database migration or persisted evidence lifecycle was tested. |

# UAT cases — run 20261014-0007-phdk-auto-completion

## Candidate 5.1.70 — UAT-064 owner-approved FeatureFlag dormancy

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-064 | Owner / CMT-004 | Confirm FeatureFlag stays dormant; inspect API/Cloud app-module wiring, route/controller consumers, Web surfaces and the 39-model/546-row CRUD inventory. | Schema/service remain retained; no module, route, UI, caller or role grant is added; 14 model/surface rows are NOT APPLICABLE to the active product; retirement or activation waits for a future owner-approved capability and migration review. | Owner decision plus source inventory regression | PASS for decision and source classification only. No database migration, persistence or runtime activation was tested. |

## Candidate 5.1.69 — UAT-063 nested relation and tenant company contract

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-063 | CMT-004 / admin or coordinator | Update countries on the actor's own company, attempt foreign-company update and direct nested country write; inspect CompanyCountry/TeamInterface model rows and existing guarded API contracts. | Own-company country set may be edited through Company; foreign company and standalone nested write are denied; CompanyCountry/TeamInterface remain explicitly nested; TeamInterface assignment stays team-scoped and atomic. CRUD matrix records missing Web selector/persistence gates. | API/Cloud source regression and CRUD inventory | PASS for source guards and classification only: API regression 39/39, Cloud 18/18, including nested relation and matrix assertions. No live DB or browser UI acceptance. |

## Candidate 5.1.68 — provider and voice-profile CRUD derive tenant scope

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-062 | CMT-004 / authorized company admin or coordinator | Exercise API and Cloud guard paths for tenant-provider-config and voice-profiles: list without caller company, write without companyId, attempt a mixed-company provider batch and access a foreign profile ID. | Reads are filtered to the current DB actor company; accepted writes have actor-derived companyId; mixed-company batches and foreign direct IDs are denied; ordinary low roles cannot mutate tenant provider/profile resources. | API/Cloud source regression | PASS: API regression 39/39 and Cloud regression 18/18 include positive actor-derived scope plus negative cross-company cases. Unit guard evidence only; no live DB identity was used. |

## Candidate 5.1.67 — API flow reads enforce team scope

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-061 | CMT-003/004 / authorized team runtime | Exercise API and Cloud FlowService search with no team, blank query, an oversized result limit, a rejected Qdrant response and malformed rows; call API flow listing with and without a team. | Missing scope returns no results without database/network calls; valid search/list always carries the requesting `teamId`, search limits are 1–50, failed upstream responses fail closed, and malformed rows are discarded. | API/Cloud unit regression | PASS for the 5.1.67 source contract: API FlowService 12/12 and Cloud parity 10/10. No live Qdrant or customer tenant was used. |

## Candidate 5.1.62 — protected AI administration acceptance

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-053 | US-011 / provisioned superadmin and tenant admin | Build the Web app and run the isolated AI administration UI journey with synthetic API routes; run the managed AI API contract suite through the required API regression runner. | Only a superadmin reaches prompt/usage administration; invalid schemas and stale revisions do not write; successful edits create audited revisions; missing usage/cost stays Unknown; no provider request or model payload is fabricated. | Local production SPA UAT and API regression. | PASS for exact 5.1.62 source: API contract 6/6 is included in regression 38/38; synthetic AI administration UAT passes all 12 cases. Evidence: `evidence/AI-ADMIN-UAT-5.1.62.json` and adjacent screenshots. Persistence/migration remains open. |

## Latest acceptance delta — 5.1.61 public navigation

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-052 | US-010 / anonymous visitor | Open production-built Landing with outbound requests blocked at 1280×900; inspect navigation and hero. At 390×844, open mobile navigation and inspect theme/language controls. | Desktop navigation/preferences do not overlap hero disclaimer; mobile menu exposes reachable theme and language controls. | Local built Landing SPA / headless Edge | PASS, `docs/phdk/evidence/uat-landing-navbar-5.1.61.json`, `uat-landing-home-desktop.png`, `uat-landing-home-mobile-menu.png`. |

Exact-candidate UAT-052 confirms the public navigation path only. Focused Web UAT passes 5/5 and the standalone Landing test 1/1. Portfolio tally is **52 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. Exhaustive persisted model operations/concurrency, native device/audio, broad accessibility/localization and deployed SEO/AEO remain open; client CRM/call acceptance is selected per tenant.

## Latest acceptance delta — 5.1.52 Qdrant-backed cleanup

UAT-010 Knowledge deletion, formerly BLOCKED, now **PASS** for document and base cleanup using disposable PostgreSQL 16.15 and loopback Qdrant 1.19.2 with synthetic data. Document delete removes its DB row and matching vector points; base delete removes its collection and cascades DB rows. Exact evidence: `evidence/uat-qdrant-delete-5.1.52.json`. Delete/reindex concurrency remains open. Whole acceptance is **40 PASS, 0 BLOCKED, 1 MANUAL**; native Electron/device/audio remains MANUAL, with the broader acceptance limits recorded in `UAT_REPORT.md`.

## Latest candidate 5.1.52 — session CRUD guard regression (2026-10-14 local / 2026-10-15 UTC)

On exact source commit `03ea78968103aa6bc6290ed0681b1c1ea345872a`, the API authenticated a synthetic tenant admin against disposable PostgreSQL 16.15. Session creation and `metadata`/status updates persisted and read back. Legacy `summary` and team reassignment writes returned 403. API/Cloud parity and regression suites passed. Evidence: `evidence/uat-postgres-roles-5.1.52-03ea7896.json`. The built Web UAT passed 4/4 with mocked APIs and blocked external traffic.

The latest formal tally is **39 PASS, 1 BLOCKED, 1 MANUAL**. The new BLOCKED operation is KnowledgeBase/KnowledgeDocument deletion while isolated Qdrant is unavailable; native device/audio remains MANUAL. Whole Auto remains partial pending exhaustive 35-model operation coverage, live Qdrant/concurrency, broad accessibility/localization, deployed SEO/AEO and each customer's configured call/CRM acceptance.

## Latest UAT continuation — 5.1.51 DB-backed identity and tenant checks (2026-10-14)

Tested the exact delivered source commit `5b7e25512c95737688beea43b2d7172199dfa231` on a disposable PostgreSQL 16.15 database bound to `127.0.0.1`. All eight migrations applied and a second deploy found no pending migration. Synthetic public registration defaulted to `user`; an existing synthetic superadmin assigned admin access through the API. Persisted admin/coordinator scope, cross-company denials, low-role denial, safe user creation, and write-only vendor secret projections passed. The legacy vendor-secret migration dry run found one synthetic row, encrypted it on apply, and was idempotent on the second apply. A tenant-allowlisted private loopback URL was accepted for storage; it was never contacted. Full evidence: `50-uat/evidence/uat-postgres-roles-5.1.51-5b7e2551.json`.

| Case | Updated result | Evidence boundary |
|---|---|---|
| UAT-009 | PASS — local DB-backed synthetic users authenticated and current DB roles/company scopes were verified. | Disposable local target; no production or customer identities. |
| UAT-010 | PASS — migrations, secret-migration idempotency, and persisted core role/tenant CRUD checks passed. | Full 26-model operation coverage remains an additional open gate. |
| UAT-006 | MANUAL — not exercised with a native Electron device/audio session. | No microphone capture or customer device use. |

Overall UAT is **39 PASS, 0 BLOCKED, 1 MANUAL**. Whole PHDK Auto remains partial pending native device/audio, exhaustive model/operation coverage, broad accessibility/localization, deployed SEO/AEO, live Qdrant/concurrency and each customer's configured call/CRM acceptance.

## Current candidate 5.1.44 — tenant scope on BrowserView resource requests

| Case | Story / actor | Acceptance / steps | Result and evidence |
|---|---|---|---|
| UAT-040 | US-003 / configured CRM loaded in a BrowserView during RPA | Allow HTTP(S)/WebSocket resources on tenant-configured origins, including an explicitly allowlisted private CRM; block unlisted CDN/host/port requests. Resolve requests without a WebContents using the service-worker initiator, intersect scopes for overlapping active tenants, and deny unattributed requests while RPA scopes are active. | PASS offline on exact candidate `0cbf038ed8ce7f27b1459c3a922a93f04165da46` (tree `9580bf410a52c2ecce0824e52fdf3ab30b322440`): Browser suite 27/27; security-policy/source-wiring tests 11/11; Browser build; PHDK coherence 52/52. Evidence: `50-uat/evidence/uat-rpa-subresource-origin-scope-5.1.44.json`. No packaged Electron runtime or live endpoint. |

## Current candidate 5.1.43 — RPA scope at BrowserView navigation boundaries

| Case | Story / actor | Acceptance / steps | Result and evidence |
|---|---|---|---|
| UAT-039 | US-003 / tenant-configured CRM flow executing in an empty BrowserView | Confirm RPA's trusted tenant allowlist is applied to BrowserView main/frame/redirect/popup and `tabs:navigate` boundaries during execution; restore the prior tab scope on completion or failure; retain a tenant-allowlisted private CRM origin. | PASS on exact tested candidate `076bce49bead0029fd8fc9ea7f79389538f526e5` (tree `7c2cdffbac9887d974f886d8144cff330029c691`), containing fix commit `29d18efbbabe159e5279a01ba767f70e54d8afdc`: Browser 27/27; Electron security-policy/wiring 9/9; TypeScript build; PHDK coherence 52/52. Evidence: `50-uat/evidence/uat-rpa-active-tab-navigation-scope-5.1.43.json`. Wiring assertions and mock WebContents only; no packaged Electron runtime or network endpoint. |

The tenant-origin list is derived from paired vendor configuration by the existing Browser command handlers; the new runtime scope shares it with Electron navigation guards during the flow and restores previous WebContents state in `finally`. Private destinations remain valid only when configured and allowlisted for the tenant.

## Current candidate 5.1.42 — fail-closed RPA tenant scope

| Case | Story / actor | Acceptance / steps | Result and evidence |
|---|---|---|---|
| UAT-038 | US-003 / tenant-configured CRM flow | Execute production RPA code with absent scope, empty scope, an unlisted origin, and a private CRM origin explicitly configured for the tenant. Confirm denied paths do not call `loadURL` or page JavaScript, while the configured private destination remains available. | PASS at exact source `07f979b610b069d675183a7a4ad112b2466c20d2` (tree `a3664bdc9402c7b943e49b2a585b68de741f9f65`), `node browser/tests/rpa-safety.test.cjs`. Uses synthetic Electron WebContents; no real network/private endpoint. Evidence: `50-uat/evidence/uat-rpa-required-tenant-scope-5.1.42.json`. |

The approved policy is enforced in the RPA executor: an omitted or empty tenant-origin allowlist now fails before any flow step; every navigation must match the configured tenant origin. Customer-configured private HTTP(S) CRM destinations remain supported. This is source-level offline evidence only; persisted configuration, subresource behavior, and live customer acceptance remain open.

## Current candidate 5.1.41 — tenant-scoped CRM frame navigation

| Case | Story / actor | Acceptance / steps | Result and evidence |
|---|---|---|---|
| UAT-037 | US-003 / tenant administrator configuring a private CRM | Verify a configured private HTTP(S) origin remains usable; an unconfigured origin including a metadata-service address, file URL, or embedded credentials is denied; frame redirects and the trusted navigation IPC use the same tenant allowlist; `about:blank` inherits its parent origin. | PASS on exact candidate `718ce3d4cf9c4e51b71ec163e9749307997d85d2` (tree `14e5c085771a1e556692991fd1724e747b164ee7`), offline Browser policy/wiring tests 8/8 and TypeScript build; no real CRM, network request, DB, or device used. Evidence: `50-uat/evidence/uat-vendor-frame-scope-5.1.41.json`; test `browser/test/security-policy.test.cjs`; code `browser/src/security-policy.ts`, `browser/src/tab-manager.ts`, `browser/src/ipc-handlers.ts`. |

The selected per-customer CRM policy is private destinations only when explicitly configured, URL-validated, and allowlisted within that tenant. Whole Auto remains partial: disposable PostgreSQL/identities, persisted CRUD, native device/audio, broad accessibility/localization, deployed SEO/AEO, and live customer-specific acceptance remain open.

## Current candidate 5.1.40 — diagnostics and Knowledge role acceptance

| Case | Story / actor | Acceptance / steps | Result and evidence |
|---|---|---|---|
| UAT-034 | US-002 / coordinator and admin using diagnostics | Open `/management/debug` as a synthetic coordinator and admin; verify coordinator is redirected before any protected deep-health request, while admin can enable the local diagnostics panel and receive the mocked deep-health response. | PASS on source `8d000a5d4aa95dc361d19a5eca02fe4544be0417` (tree `cc41a3b3d030d72db006809553983abb2368d54b`), dedicated production-SPA test `services/web/test/management-debug-role-uat.test.cjs`; coordinator redirect, admin access, every response synthetic and all other external traffic blocked. Evidence: `50-uat/evidence/uat-management-debug-role-5.1.40.json`; no database or live service used. |
| UAT-035 | US-002 / coordinator, superadmin and user managing Knowledge | As a coordinator, create a knowledge base and verify only the coordinator's company is selectable; as superadmin, select a second company; as user, verify manager controls are absent. | PASS on test source `2edc20cdc524f39718c486395677e0532af5a972` (tree `dbd5dd8a2e02dfbea38ae72a4c74e3c50d5c21bc`), exact built-SPA test `services/web/test/knowledge-manager-role-uat.test.cjs`. Responses are synthetic, all other external traffic blocked; this does not prove persisted API authorization. Evidence: `50-uat/evidence/uat-knowledge-manager-roles-5.1.40.json`. |
| UAT-036 | US-002 / full local Web regression suite | Run the combined Web UAT command on the built 5.1.40 SPA, covering all baseline role/localization/keyboard/device journeys plus the diagnostics and Knowledge role tests. | All four browser test files pass; each API response is synthetic, external traffic is blocked, and screenshots/JSON go to an isolated candidate evidence folder. | PASS at source `c9ff85f4094f60491def1bc3680b8758ac11dde6` (tree `c788d3e3323215a39e977f9a39a237b35dc05536`), `npm run test:uat`, 4/4 tests and 17 local journey checks. Evidence folder: `50-uat/evidence/uat-web-suite-5.1.40-source-c9ff85f4/`. |

Overall UAT remains **ACCEPTANCE INCOMPLETE — 33 PASS, 2 BLOCKED, 1 MANUAL**. UAT-009/010 PostgreSQL/identities and UAT-006 native device/audio remain open; full CRUD operation-role-surface coverage, broad accessibility/localization and deployed SEO/AEO remain partial or unverified. UAT-034/035 close scoped UI gaps; UAT-036 confirms the combined local Web suite.

---

## Current candidate 5.1.39 — exact-SHA write-contract case

| Case | Story / actor | Acceptance / steps | Result and evidence |
|---|---|---|---|
| UAT-033 | US-002 / US-004, API and Cloud management caller | Send server-owned fields, unsupported types and spoofed FlowVersion creator fields; verify the controller forwards the authenticated actor; compare mirrored backends. | PASS, regression 48/API and 41/Cloud, three assertions each; API 36/36 and Cloud 16/16 suites; exact source `a8a89f928312db2fef5142a0e07ac18a197b6c19`. Synthetic Web UAT is 2/2 and diagnostics 19/19. Evidence: `evidence/uat-local-web-5.1.39.json`; no DB/provider/client system used. |

---

Current candidate: KELEDON 5.1.26 on `fix/audited-uat-test-profiles`, based on `8dfc1fca7de253a017acb6f291ff278699915beb`. Source commit is `6a99281e8c74c5d40590aca146a03786324dc340`; post-commit UAT is recorded in `docs/phdk/evidence/uat-local-web.json`. All fixtures are synthetic; browser API requests are intercepted, external requests blocked, and API guard tests use isolated in-process fixtures.

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-001 | US-001 / anonymous, user | Open public/login, copy report, test denied clipboard, reset owned state, inspect 390px/200%-400% reflow and themes. | Safe report, truthful feedback, owned-state reset, responsive layout. | Local built SPA / Playwright, intercepted APIs | PASS, `docs/phdk/evidence/uat-local-web.json`. |
| UAT-002 | US-002 / admin, coordinator, superadmin | Exercise management, diagnostics and write-only provider replacement with synthetic tenants. | UI follows capability; secret fields remain blank and replacement-only. | Local built SPA; isolated API regressions | PASS in scoped UI/server tests; no real login. |
| UAT-003 | US-002 / cross-tenant and non-superadmin | Attempt cross-company IDs, stale actor, role/company escalation and low-role mutations. | DB-derived actor/tenant policy denies unauthorized access and mutations. | API regression / in-process Nest HTTP | PASS, API regression 20/20 suites; fixtures are isolated, no persistent DB. |
| UAT-004 | US-003 / integration administrator | Configure validated private HTTP(S) origin; attempt malformed, unlisted and cross-tenant targets. | Configured private origins are accepted only through tenant allowlist; unsafe inputs denied. | API/Cloud policy and Browser offline tests | PASS in source tests; no private destination contacted. |
| UAT-005 | US-004 / operator | Run deterministic synthetic call-command lifecycle through registered handlers and injected CRM adapter. | Valid sequence completes; failures remain explicit and safe. | Browser offline runtime tests | PASS, 27/27; no live call/provider. |
| UAT-006 | US-004 / desktop operator | Pair native Browser with test device; exercise OS media consent and audio lifecycle. | Permission and cleanup behavior works on supported device. | Native manual UAT | MANUAL/BLOCKED — device/audio environment unavailable. |
| UAT-007 | US-005 / release owner | Compare five package/lock roots and renderer version. | Candidate versions agree; release only after PR and remote readback. | Source/Git | PASS, candidate 5.1.26; PR/readback pending. |
| UAT-008 | US-002 / superadmin test operator | Select configured synthetic profile; test bounded session; return to original admin. | Server requires current DB superadmin; audited start/end; nonproduction-only, allowlisted, <=10 min, no persisted role change; return revokes token. | Local built SPA + isolated in-process Nest HTTP/regression tests | PASS, scoped. Browser UI uses mocked API; server audit/expiry/guard/revocation verified separately. |
| UAT-009 | US-002 / superadmin and test users | Authenticate to a safe development target with actual synthetic identities and verify roles. | Actual DB-backed access matches role policy; no production identity/data. | Development deployment | BLOCKED — no verified target or test identities configured. |
| UAT-010 | US-002 / data administrator | Run vendor-secret migration and persisted CRUD matrix on disposable DB. | Idempotent migration, safe projections and persisted role/tenant matrix. | Isolated disposable PostgreSQL DB | BLOCKED — no disposable DB configured; production DB excluded. |

## Historical records from earlier candidates

# UAT cases — latest local candidate 5.1.16

## Candidate 5.1.17 — current Auto continuation

Candidate: `fix/phdk-keledon-voice-profile-accessibility`, product source `4e874c14cde10fd5b1a0ce521ee097e67823e120`; all five app roots 5.1.17. Post-commit browser execution reran the exact suite and intercepted every API response; evidence is bound to that source SHA.

| Case | Story / actor | Preconditions and synthetic data | Actions / expected observable result | Channel | Result / evidence |
|---|---|---|---|---|---|
| UAT-T-008 | US-008 / Company administrator | Local built SPA; Company Co tenant fixture; API routes intercepted. | Voice-profile list failure shows retry; create submits only name/provider/language/enabled/default; detail shows safe display fields; edit submits no caller `companyId` or credential/config fields; synthetic 403 create/update/delete leaves records unchanged and shows visible `role=alert`; successful update/delete refreshes the list. | Local Edge/Playwright UI with synthetic API. | PASS 1/1 post-commit on `4e874c14cde10fd5b1a0ce521ee097e67823e120`; `docs/phdk/evidence/uat-local-web.json`; persistence is not inferred. |
| UAT-T-009 | US-007 / Company administrator | Local built SPA; synthetic Company Co brand/team/company records; API routes intercepted. | Labeled selectors create a KELEDON with exact service input shape, without caller `companyId` or stringified `uiInterfaces`; delete confirmation opens and cancel preserves the record. | Local Edge/Playwright UI with synthetic API. | PASS, `docs/phdk/evidence/uat-local-web.json`, `UAT_REPORT.md`; persistence is not inferred. |
| UAT-T-010 | US-007/US-008 / administrators and all app users | Built web SPA. | Trigger a localized failed mutation; a global Sonner notification is mounted and actionable failure feedback is also in the form dialog. | Local Edge/Playwright UI with synthetic API. | PASS for in-dialog voice-profile 403; app-wide notification renderer is source/build verified. Broader toast journeys not exercised. |

## Current continuation — 2026-10-13

Candidate branch `fix/phdk-route-accessibility-i18n` at `7ce3509aeb4d53ce3a90d16153996abf35446024`, based on fetched `origin/main` `c8534e6f6568922d540eabfba4abe90cc93749c1`. Built-SPA UAT uses Company Co synthetic fixtures and intercepted API/WebSocket traffic. UAT-T-005 covers dashboard/session/detail routes; UAT-T-007 covers profile role/date formatting in en/es/pt, translated device status/empty state, valid launcher navigation and API failure recovery. Diagnostics tests, SEO source test and web typecheck/build are recorded in `UAT_REPORT.md`; locale parity is checked separately. This scoped evidence does not close broad route accessibility/localization, persisted CRUD/migration, native device/audio or deployed SEO/AEO acceptance.

Prior UAT record: 2026-10-13; product PR #62 merged at `a806617f430d084831a079b92c821a694b925467`; local main was `0be102b8b7847bfed3441ff00e00ba4477c57a1e`. `npm run test:uat` passed 1/1 on the 5.1.10 bundle with synthetic fixtures and intercepted API/WebSocket traffic. API regression 14/14; Browser build/regression 24/24. Native Electron 44.7 launched and renderer loaded; see startup and media-permission cases below.

| Case / story | Acceptance | Latest result |
|---|---|---|
| UAT-T-005-DASHBOARD / J-005 | Spanish dashboard empty/completed-session states, English/Portuguese greeting and metrics, and accessible table caption/headers | PASS in local production SPA with synthetic identity and intercepted APIs; not backend or screen-reader acceptance. |
| UAT-T-005-SESSIONS / J-006 | Spanish live/history and call-monitor copy, superadmin filter labels, statuses, accessible tables and detail action | PASS in local production SPA with synthetic identity and intercepted APIs; no live call or backend authorization inferred. |
| UAT-T-007-PROFILE-DEVICES / J-007 | Profile role/date formatting in en/es/pt; Spanish device status, empty state, localized launcher navigation and API errors/retry | PASS in local production SPA with synthetic identity and intercepted APIs; native pairing is not inferred. |
| UAT-T-005-SESSIONS / J-008 | Session-detail copy, session ID and accessible return link | PASS in local production SPA with synthetic sessions; recordings/transcripts remain placeholders. |
| UAT-001/UAT-002/UAT-004/UAT-006 | Current diagnostics widget and selected public/login/admin journeys, widget actions, themes, narrow viewport, role controls and safe diagnostics | PASS, local UI subset, synthetic fixtures; APIs intercepted. Evidence: `docs/phdk/evidence/uat-local-web.json` and screenshots. |
| UAT-API / US-004 | Current DB-derived role/company/team/session checks, startup fail-closed behavior, and selected cross-tenant denials | PASS, API regression 14/14 with isolated doubles; not persisted acceptance. |
| UAT-BROWSER-PERMISSION / US-002/US-003 | Per-origin HTTPS media consent; deny other permissions; remember grants only for session; reject stale navigation | PASS, unit/policy contract tests; native dialog itself not exercised. |
| UAT-ROLE/UAT-CRUD | Full persisted resource × role × tenant × operation matrix and migration ledger | BLOCKED: no isolated PostgreSQL runtime; PHDK scope prohibits provisioning/administering it in this run. |
| UAT-ELECTRON-STARTUP | Native app startup, renderer, widget and version | PASS: Electron 44.7.0 and renderer v5.1.10 launched; screenshots under `docs/phdk/evidence/`. |
| UAT-ELECTRON-PERMISSION/UAT-DEVICE-AUDIO | Native media dialog, OS permission, device and call/audio lifecycle | BLOCKED/NOT TESTED: native UI controller unavailable; no permission was granted and no client call. Unit policy tests pass; physical audio not exercised. |
| UAT-A11Y-I18N | Broad screen-reader, 200%/400% zoom, contrast and en/es/pt route review | ACCEPTANCE INCOMPLETE: selected keyboard/focus/theme/mobile flows passed only. |
| UAT-SEO-AEO | Local source route/indexability/content controls | SOURCE PASS; deployed headers, crawler behavior, field metrics and answer-engine citations remain NOT MEASURED. |
| UAT-CLIENT-CRM | Tenant-specific live telephony/CRM workflow | NOT APPLICABLE to universal flow; vendors are client-selected. |

No in-scope source FAIL remains in the tests executed. Overall UAT is **ACCEPTANCE INCOMPLETE**; full action cards are in `UAT_REPORT.md`.

---

Latest source regression: PR #58, version 5.1.9, product merge SHA `6d0112dd940c142c20b5e4c56c766da64d000b3b`; PHDK handoff PRs #59 and #60 are also merged on `main`. API regression is 12/12, including operational tenant-boundary checks. This does not constitute a new browser journey; the local Edge journey below remains bound to its recorded 5.1.7 source revision. The exact current `main` SHA is in `PHDK_DELIVERY_EVIDENCE.json`.

Current evidence revision: `edce7eafbe13ac16ab93274a87e12571e7b04b2e`; verified remote main `a854ca7634307538305cd9b5ad1f91f8a066b1a1`; identical Git tree. Environment: local built web SPA in headless Edge with Company Co/Other Co synthetic fixtures, blocked external network and intercepted APIs. Full details and actions: `UAT_REPORT.md`.

| Case / story | Acceptance | Result |
|---|---|---|
| UAT-001 / US-001 | Candidate package/lock version and target PR/SHA reconciliation | PASS, scoped; PR #56 merged at `f44f76a8bfb46e4ef60bfbe99982a8d787bc00a6`, all five app roots 5.1.8. The local browser journey remains bound to verified 5.1.7 source tree. |
| UAT-002 / US-002 | Anonymous public home/login widget, exact compact version→clipboard→trash row, successful and failed copy, app-owned reset, foreign state preserved, 390px layout | PASS in current local Edge UAT; home/login mounts observed; click paths exercised on login. |
| UAT-003 / US-003 | Provider-independent voice→Cloud→Browser execution contracts and safe failure behavior | PASS in isolated API/Cloud/Browser regression contracts; no live vendor or audio call. |
| UAT-004 / US-004 | Selected admin/coordinator/superadmin tenant controls; user creation/reassignment; secret replacement without response prefill | PASS in mocked UI journeys plus isolated Nest guards/regressions; persistence and complete operation matrix remain open. |
| UAT-004-CREDENTIAL / US-004 | User CRUD cannot accept client-supplied password hashes on create/update, for any role | PASS in API guard regression integrated by PR #56 (admin/coordinator POST+PUT; superadmin POST). Source/API test only; persistence remains open. |
| UAT-005 / US-003 | Startup migration/count failures stop before seeding/server, no automatic rollback | PASS, API regression suite 11/11. |
| UAT-006 / US-002 | Diagnostics debug-off privacy, protected read, safe explicit probe and manual-only CRM control | PASS in mocked UI + isolated API contract tests; not deployed behavior. |
| UAT-THEME / US-006 | Login shell dark/light/corporate selection and persistence | PASS for executed shell. |
| UAT-ACCESS / US-006 | Company-detail dialog keyboard/focus and 390px login reflow | PASS for exercised subset only. |
| UAT-CRUD / US-004 | Complete persisted CRUD × resource × role × tenant × surface, detail, negative direct-ID and migration ledger | BLOCKED: no isolated PostgreSQL runtime/DB-backed test identities. Exact action in `UAT_REPORT.md`. |
| UAT-ROLE / US-004 | Real DB-derived role and tenant sessions across full matrix | BLOCKED: synthetic frontend role contexts and fake-Prisma tests are not end-to-end auth sessions. |
| UAT-ELECTRON / US-002/US-006 | Native Electron render, device, microphone/audio and recovery | MANUAL: requires Windows device/runtime acceptance. |
| UAT-A11Y-I18N / US-006 | Broad active-route locale/copy, WCAG keyboard/zoom/contrast/screen-reader acceptance | BLOCKED: only selected UI subset was exercised. |
| UAT-SEO-AEO / US-001/US-006 | Deployed headers and public discovery evidence | BLOCKED: no deployed target/measurement. |
| UAT-CLIENT-CRM / US-003 | Tenant-selected real call/CRM integration | NOT APPLICABLE to universal source gate; validate only when a client/provider is selected. |
