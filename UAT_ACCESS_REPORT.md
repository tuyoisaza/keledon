# UAT access report — run 20261014-0007-phdk-auto-completion

## Browser Readiness — UAT-089 admin audit accessibility (2026-10-17)

- Stage/run/revision: Auto UAT re-entry; run `20261014-0007-phdk-auto-completion`; exact candidate revision and timestamp are recorded in `docs/phdk/workstreams/ADMIN-AUDIT-UAT.json`.
- Target URL/environment: ephemeral `http://127.0.0.1:<port>/admin/audit` recorded in the evidence JSON; local production-built Web SPA only.
- Permission: `ACTIVE_UAT_EXCEPTION`. Browser capability: `AVAILABLE_VERIFIED` through installed Microsoft Edge launched by Playwright; actual page navigation and UI assertions passed.
- Target/data/roles: intercepted synthetic superadmin and tenant-admin fixtures; synthetic `.invalid` user and redacted event; outbound non-loopback HTTP is aborted. No real login, database, provider, CRM or customer record.
- Spend: `NO_NEW_SPEND`; billing remains unverified.
- Cases: UAT-089; 44px target sizing, keyboard-visible focus, 390×844 reflow, keyboard-accessible scrolling to the final mobile nav link, redacted data, bounded CSV audit event before download, fail-closed download and pre-read tenant denial. Result: PASS, 12 scoped checks. Desktop/mobile screenshots and response evidence are versioned under `50-uat/evidence/`.
- Owner action/retest cue: none for this scoped journey. PostgreSQL-backed export persistence and migrations remain blocked until an isolated disposable database is available; resume with UAT-089 database/restart companion after provisioning it.

## Browser Readiness — candidate 5.1.78 UAT entry

- Stage/run/revision: UAT and UAT Fix; run 20261014-0007-phdk-auto-completion; exact source commit `93c83bc3789f5fe5269f5dabd2c9f4557404c3e8`, version 5.1.78.
- Target URL/environment: local production-built Web SPA served on loopback by `services/web/test/google-oauth-uat.test.cjs`; no deployed URL or real login target was selected.
- Timestamp: 2026-10-17 America/Mexico_City.
- Permission: ACTIVE_UAT_EXCEPTION. Browser capability: USED for the local synthetic OAuth handoff only.
- Channel/operation: installed headless Edge via Playwright; code arrives as a URL fragment, is removed before POST, and is exchanged against an intercepted synthetic endpoint. Browser outbound HTTP/WebSocket traffic is blocked.
- Target/data/roles: `.invalid` Company Co user fixture and synthetic exchange/access tokens; API regression uses isolated actor, audit-log and user fixtures. No account, PostgreSQL, customer data, call, Google request or CRM.
- Spend: NO_NEW_SPEND; billing is UNVERIFIED.
- Cases: Cloud managed-runtime 6/6, API managed-AI contract 9/9, cross-backend regressions 19/19, API regression 42/42 suites, API build, Web typecheck/build, Web journeys 8/8 plus standalone admin-settings/theme-template/AI-admin, API OAuth exchange replay/expiry and current-database actor tests. Full database e2e remains BLOCKED pending disposable PostgreSQL. Browser OAuth does not prove a real provider login.
- Owner action/retest cue: provide an isolated disposable PostgreSQL service inside the local environment for the blocked migration/restart and persisted auth cases; the Railway owner action is recorded in the delivery report.

### Authentication evidence — candidate 5.1.78

| Case | Persona / tenant | Mechanism | Result | Cleanup / limit |
| --- | --- | --- | --- | --- |
| OAuth callback handoff | Synthetic Company Co user / fixture only | Built local SPA, fragment code removed before intercepted POST; API returns synthetic session token | PASS (browser contract) | Evidence: `docs/phdk/evidence/uat-auth-oauth-5.1.78.json`; no provider call; browser context closed; not real authentication |
| Exchange replay and expiry | Synthetic user `u-a` / fake audit persistence | In-process `LocalAuthService` fixtures; concurrent redemption | PASS (source regression) | No DB; only one concurrent request succeeds; not database-backed proof |
| Current actor lookup | Synthetic user `u1`; signed claims carry stale email/forged role | Nest guard regression with isolated user fixture | PASS (source regression) | Deleted actor rejected before bearer expiry; not live account evidence |
| Google provider login | No configured test tenant | Not run | BLOCKED | Requires authorized non-production provider account/configuration |
| Persistent tenant personas and migration | Company Co / Other Co | No isolated PostgreSQL target configured | BLOCKED | No DB connection or migration was run |

## Candidate 5.1.73 — UAT-081 local synthetic superadmin

Target: local production-built Web SPA served on ephemeral loopback by the Playwright harness; role response, two companies and all flow APIs are synthetic in-memory fixtures. A synthetic `superadmin@company-co.invalid` session drives the UI; the browser blocks non-local HTTP and all WebSockets. The test verifies company switching, scoped flow operations and legacy assignment. No real account, test-profile switch, database or external service is accessed; browser/server close in `finally`. This is not live authentication or backend superadmin authorization evidence.

UAT-083 exercised the built API and Cloud HTTP routes with synthetic PostgreSQL superadmin/coordinator identities and signed tokens. DB actor scope overrode forged claims and query/body filters, and approved versions, permissions, mappings and legacy ownership persisted across clients. Requests stayed on loopback; no customer/provider traffic was used. The four superadmin flow API rows are PASS; Web roles remain open. Evidence: `docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/50-uat/evidence/uat-083-superadmin-flow-config-http-5.1.73.json`.

## Candidate 5.1.66 — local synthetic UAT target

Target: local production-built `services/web` SPA served by its finite Playwright test harness on loopback. Company Co is the synthetic demo tenant; actors and API responses are in-memory fixtures, and all outbound HTTP/WebSocket requests are blocked. The tenant-flow case uses company ID `company-co`, role `admin`, and an `.invalid` email alias. No account, email, customer record, credential or database was created. Browser contexts and the ephemeral HTTP server close in the test's `finally` block. Full `services/web npm run test:uat` passes 6/6 plus the separate AI-admin journey; UAT-058 source contracts pass in API/Cloud.

No deployed development URL or real login was configured or verified. No test-role switch was performed in this execution; prior server-side test-profile policy evidence remains separate from this browser fixture. The new UAT-060 persisted migration test is BLOCKED because this workstation has no PostgreSQL service, `psql`, or Docker. No database or migration was run. No native device/audio target, customer-selected provider/CRM endpoint, production user data, or deployment was used.

## Candidate 5.1.56 — exact-source disposable PostgreSQL access

The API UAT used the retained disposable PostgreSQL 16.15 cluster and DB `keledon_phdk_uat`, bound only to `127.0.0.1:55432`; the API was bound to `127.0.0.1:3041`. The database contained prior synthetic `.invalid` UAT fixtures. New accounts and tenant companies used for this case were synthetic, and all were deleted through the API afterward. Verification returned to the pretest counts (two companies; one admin, one superadmin and two users; no PHDK-created test users). API and PostgreSQL stopped after testing. No production credentials, customer data, provider requests, private CRM endpoints or external services were used. Exact redacted results: `evidence/uat-postgres-roles-5.1.55-8999dfd9.json`.

Earlier sections below document the environment status at their historical candidate dates; this continuation supersedes their “disposable DB not configured” result for UAT-009/010 only. Exhaustive persisted CRUD remains open.

## Candidate 5.1.36 Device UAT access and scope

`services/web npm run test:uat` served the local production Web build on ephemeral loopback with Playwright and installed Edge. Browser contexts used synthetic `user`/`admin` session responses and in-memory devices; all API requests were intercepted, non-local HTTP and WebSockets were blocked, and server/browser were closed in `finally`. API registration/revocation checks used isolated guard fixtures; no credentials, database or device token were used. No live device pairing, CRM target or deployed account was accessed.

Target exercised: local built production SPA served at loopback with Company Co synthetic fixture and intercepted API; outbound HTTP/WebSocket is blocked by the harness. This does not verify a deployed development URL or authenticate a real account.

| Access target | Method | Identity/data | Result / cleanup |
|---|---|---|---|
| Local Web SPA | Local static build and Playwright; isolated ephemeral contexts | Synthetic fixtures only; role values mocked by `/api/auth/me`; emails use `.invalid` domain | Allowed UAT-only local test; server/context closed at completion. |
| API/Cloud policy | Local regression scripts and Jest fixtures | Synthetic actor/company IDs; no DB connection or provider requests | Isolated process; no persistent writes. |
| Deployed development | No reachable/verified safe target configured | No accounts, credentials or tokens used | BLOCKED; user can resume by providing the non-secret development URL and confirming it contains synthetic test data, then authenticate in their own secure interface if needed. |
| Native Electron/device | No supported physical media session in this UAT run | No camera/mic/device data captured | MANUAL/BLOCKED; requires permitted test device and supported Windows host. |
| Disposable DB | Not configured | No persistent test data | BLOCKED; requires isolated disposable PostgreSQL URL/backup plus migration rollback plan; never provide production URL. |

No account provisioning, test-role switch, email delivery, production browsing, provider write, paid call, database migration or secret read occurred.



## Historical records from earlier candidates

# UAT access and provenance
## Current candidate 5.1.17 — 2026-10-14 UTC

`npm run build` and `npm run test:uat` in `services/web` used a local production SPA served on loopback by the test harness and installed headless Microsoft Edge through the existing Playwright package. The harness blocks external HTTP and WebSockets and intercepts `/api` with synthetic Company Co/Other Co data. Each persona uses a separate browser context and synthetic session token; no user account or password was provisioned. The browser and server close in the test's `finally` block.

The test was run before commit while Git HEAD remained `60d7382f0e2003597690673103ace4e785f0c018` and the working tree was modified. The JSON's `candidateRevision` is therefore the base HEAD, **not a claim that the tested source equals that commit**. Repeat after source commit and replace evidence with the committed revision before delivery. This is local UI evidence, not backend/database authorization or production acceptance.

The approved management policy regression separately exercised Nest routes/guards with isolated fake persistence. No PostgreSQL connection, schema migration, CRM/call provider, paid model, external account, customer data or production endpoint was used.
Finite local built-SPA server on127.0.0.1; installed Edge headless via existing Playwright package. All external requests and websockets blocked; /api responses intercepted using synthetic Company Co records. Each role has an isolated context with an explicitly synthetic session token. Browser and server close in finally. No network/provider writes, metered inference, customer data or real account provisioning.
Actual Nest in-process HTTP test22 exercises real decorators/guards with isolated fake persistence. OAuth state tests use local signed fixtures, not a Google request. Live telephony/CRM and real audio are NOT EXECUTED by owner scope.

## 2026-10-13 current candidate rerun

- Built `services/web` 5.1.7 production SPA locally; served on loopback only through `services/web npm run test:uat` and installed headless Edge/Playwright. The harness blocks non-local HTTP and all WebSockets and intercepts every `/api` route with synthetic Company Co/Other Co fixtures. Browser and local server close in `finally`.
- Test revision `edce7eafbe13ac16ab93274a87e12571e7b04b2e` has the same Git tree as refreshed `origin/main` `a854ca7634307538305cd9b5ad1f91f8a066b1a1`. This is local UAT of the main source tree, not a deployment.
- Fresh isolated verification: `services/web npm run test:diagnostics` 18/18; `services/api npm run test:regression` 11/11. No user accounts, MFA, credentials, email, live API, database, provider, customer data or paid call was used.
- No Docker command or PostgreSQL service is available in this workstation session. DB-backed roles, full CRUD persistence, migration ledger, native Electron/device/audio, complete screen-reader/zoom/contrast and deployed SEO/AEO remain BLOCKED/MANUAL, as enumerated in `UAT_REPORT.md`.
