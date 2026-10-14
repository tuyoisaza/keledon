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
