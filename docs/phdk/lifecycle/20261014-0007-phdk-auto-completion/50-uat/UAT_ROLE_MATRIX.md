# UAT role matrix — run 20261014-0007-phdk-auto-completion

All browser personas are synthetic fixture data. UI role selection is not treated as authentication evidence. The 2026-10-14 continuation added DB-backed login and role/tenant checks on a disposable loopback PostgreSQL instance. This proves the exercised local API paths only; it is not a deployed development target or exhaustive model/operation acceptance.

| Persona | Source-backed intended access | Local UI fixture | Access verification |
|---|---|---|---|
| Anonymous/guest | Public/login and public-safe diagnostics; no management | Local production SPA, mocked endpoints | UI journey passes; live auth not verified. |
| user | Own profile/devices and permitted operator flows; no management/elevation | Synthetic DB-backed ordinary user | Registration and login returned persisted role=user; company-management request denied. |
| coordinator | Company-bounded administration; cannot elevate roles or delete companies | Synthetic persisted coordinator in tenant A | Login and same-tenant company list passed; attempted role elevation denied. |
| admin | Company-bounded administration; cannot elevate roles or delete companies | Synthetic persisted admin in tenant A | API showed tenant A only; same-tenant read allowed; cross-tenant read, company create/delete, role elevation and company reassignment denied. New user forced to role=user in tenant A. Candidate 5.1.52 also persisted session `metadata` updates; legacy `summary` and session team reassignment were denied with 403. |
| superadmin | Global administration and role/company assignment from current DB authority | Synthetic persisted root fixture | Login used the test database; company creation and role/company assignment to tenant admin succeeded through the API. Initial fixture role was set directly in the empty disposable database. |
| Temporary UAT profile | Synthetic allowlisted profile in development/staging, max 10 min; no persisted role change | Visible temporary-mode banner and return control | PASS scoped: server-authorized start/end audit, allowlist, expiry, current-actor checks, revocation and original-admin return tested with isolated fixtures. |
| Native Browser/device | Paired tenant runtime and explicitly permitted media/vendor origin | Not exercised through OS/Electron | MANUAL/BLOCKED pending supported desktop/device/audio setup. |

No real accounts or hosted development targets were used. UAT-009 passes for the local synthetic development target; UAT-010 passes for migrations, secret migration, and the core persisted role/tenant/session operations exercised. Knowledge deletion remains blocked without a local Qdrant fixture. The complete 35-model/operation map and native Browser/device acceptance remain open.


## Historical records from earlier candidates

# UAT role matrix
## Current 5.1.17 local candidate (synthetic frontend only)

| Persona | Observed UI coverage | Server evidence / limitation |
|---|---|---|
| anonymous | Public home/login diagnostics actions, viewport/theme and safe state reset. | No authentication; API behavior intercepted. |
| guest | Management access denial/redirect without a loop. | Synthetic session only; server guard regressions are separate. |
| user / agent | No separate persisted identity journey in this candidate. | API regression contains low-role denies; no provisioned account or session. |
| coordinator | Selected tenant-admin detail/navigation and mutation restriction presentation. | API guard/policy regression uses isolated fake persistence, not live DB. |
| admin | KELEDON create/cancel and Voice Profiles create/delete/error states; other admin flows in existing UAT. | API regression covers current-DB tenant derivation and role boundaries; no persisted CRUD. |
| superadmin | Selected company detail and privileged affordance presentation. | No role switching or impersonation was performed in the browser; DB-derived controls covered only by isolated API regression. |

Each browser persona is a synthetic session value in an isolated context. It does not represent a real login, provisioned test identity or role-switching acceptance.

Candidate5.0.54; Company Co fixtures only, separate fresh browser context per role; no production accounts created.

| Role | Rendered local journeys | Backend evidence |
|---|---|---|
| anonymous | home/login diagnostics, reset, mobile, themes | auth/pairing denial tests |
| guest | management redirect without loop | DB-role rejection tests |
| user/agent | not rendered separately | CRUD/runtime negative contracts |
| coordinator | management detail keyboard, disabled company mutation, collapsed widget | scoped CRUD/resource contracts |
| admin | same plus provider write-only replacement | cross-tenant and escalation negatives |
| superadmin | details, create-form labels/Escape/focus; AI screens separately tested | DB-authorized prompts/revisions/schema/usage |
No frontend fixture is represented as real login, OAuth or DB authorization acceptance.

## Current candidate 5.1.7 status

Revision `edce7eafbe13ac16ab93274a87e12571e7b04b2e` was exercised in local Edge UAT; the tree matches remote main. Anonymous, guest, admin, coordinator and superadmin **UI presentations** were exercised with synthetic sessions and intercepted APIs. Only the test values are synthetic identities, not provisioned backend accounts. Selected server-side roles/tenant denial paths were exercised in isolated Nest HTTP tests (API suite 11/11); user/agent persistence and the exhaustive resource × role × tenant × surface × operation matrix are not verified. Do not interpret frontend role selection as authorization evidence.
