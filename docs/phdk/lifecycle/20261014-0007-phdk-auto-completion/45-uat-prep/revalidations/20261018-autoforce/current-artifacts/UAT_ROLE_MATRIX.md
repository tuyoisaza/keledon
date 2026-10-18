# Current UAT Role Matrix — Auto Force revalidation (2026-10-18)

Candidate PR #259 / 5.2.11 is not verified deployed. Role evidence below is source-backed readiness, not live acceptance. New users default to `user`; tenant and actor authority are database-derived. No authenticated synthetic role is currently provisioned.

| Persona | Allowed scope | Required negative case | Status |
|---|---|---|---|
| Anonymous visitor | Public pages only | Protected API/admin redirects or denies | UAT case may run on verified production target |
| Existing superadmin operator | Fixture administration only through normal authenticated, audited path | No test superadmin, arbitrary ID cleanup, or actor/tenant from request body | BLOCKED — no fixture path/session evidenced |
| Synthetic User A | Tenant A permitted features | No access to Tenant B or admin/settings/secrets | BLOCKED — no synthetic account |
| Synthetic User B | Tenant B permitted features | No access to Tenant A or Flow A | BLOCKED — no synthetic account |
| Browser device A/B | Paired device's own tenant command scope | Cross-tenant command/result and revoked-device denial | BLOCKED — no fixtures |
| Admin/Coordinator | Their tenant only | Cannot elevate roles, cross tenant, or delete companies | Not in this fixture; CMT-004 requires separate approved role acceptance |

No live authorization result is claimed from this matrix. Authenticated journeys resume only with a compliant identity and cleanup path.
---

# Historical evidence follows

# UAT role matrix — run 20261014-0007-phdk-auto-completion

## Production UAT-Prep authorization — v5.2.7 / 2026-10-17

| Persona | Production fixture authority | Current readiness |
|---|---|---|
| Ordinary `user` in synthetic tenant A | Owner authorized as part of the temporary non-privileged fixture scope. | BLOCKED: no audited production provisioning/session/cleanup path verified. |
| Ordinary `user` in synthetic tenant B | Owner authorized as part of the temporary non-privileged fixture scope for tenant-denial cases. | BLOCKED: same missing path; no tenant data created. |
| `admin`, `coordinator`, `superadmin` | Not authorized as production test identities by the current scope; no role elevation. | BLOCKED / EXCLUDED until a compliant approved route exists. |
| Anonymous visitor | Public unauthenticated acceptance only. | UAT-132 PASS for scoped `/login` locale/theme AX states and one keyboard sample; no authenticated identity proof. |

No account, tenant, device or flow fixture was provisioned. This section supersedes earlier candidate rows only for current production authorization; historical local test personas remain non-production evidence.

## Current candidate 5.2.1 — role readiness revalidation (2026-10-17)

Candidate branch: `feature/tenant-interface-selector-5.2.0`, source `ef6fe6dbf7eca04708c7200615e7538812751f7e`; PHDK 2.53.1. The role expectations below remain source-backed, but no account is READY for this candidate: Production displays 5.1.85, and no isolated PostgreSQL seeding/login was available. Admin/coordinator selector, positive same-tenant assignment, negative foreign-tenant direct access, stale-response handling under real sessions, and persisted readback are BLOCKED pending an isolated current-candidate target. No role session was opened in production.

## Candidate 5.2.0 — Stage 45 synthetic identity readiness

Source roles are `superadmin`, `admin`, `coordinator`, `agent`, and `user`. Tenant scope is resolved from the current database user record. These are planned fixture rows only; no current-candidate identity is marked READY because Prep could not provision accounts.

| Persona | Synthetic identity | Intended allowed scope | Required denial proof | Prep status |
|---|---|---|---|---|
| Platform administrator | `phdk-uat-superadmin` / `uat-superadmin@companyco.example.invalid` | Platform administration and tenant assignment; may start/return audited Test as | Cannot retain platform privilege while switched to a lower role; ended/expired switch denied | BLOCKED: no isolated DB seed/login run |
| Company Co administrator | `phdk-uat-admin` / `uat-admin@companyco.example.invalid` | Company Co users, teams and tenant configuration | Other Co records, company creation/deletion, role elevation and secret disclosure denied | BLOCKED: no isolated DB seed/login run |
| Company Co coordinator | `phdk-uat-coordinator` / `uat-coordinator@companyco.example.invalid` | Company Co operational records within permitted role scope | Other Co records, role elevation, company lifecycle and platform catalog denied | BLOCKED: no isolated DB seed/login run |
| Company Co agent | `phdk-uat-agent` / `uat-agent@companyco.example.invalid` | Assigned team and permitted agent operations | Admin endpoints, foreign team and role changes denied | BLOCKED: no isolated DB seed/login run |
| Company Co user | `phdk-uat-user` / `uat-user@companyco.example.invalid` | Ordinary user routes and own permitted records | Admin endpoints, other users' restricted records and foreign tenant denied | BLOCKED: no isolated DB seed/login run |
| Other Co user | `phdk-uat-other-user` / `uat-user@otherco.example.invalid` | Its own tenant only | Company Co direct-ID/API access denied | BLOCKED: no isolated DB seed/login run |
| Anonymous / invalid session | No account | Public routes only | Protected route without, expired, revoked or invalid token denied | Source regression PASS; current DB run BLOCKED |
| Google OAuth persona | Customer-owned provider identity | Provider-authorized account only | Unprovisioned external identity cannot be treated as authenticated | EXTERNAL/BLOCKED: provider belongs to each customer |

Evidence references: `services/api/test/regression/26-uat-test-profile.test.js` and `services/api/test/regression/22-admin-http-wiring.test.js` pass source-level fail-closed assertions. They are not database-backed UAT evidence.

## Historical candidate role coverage

## Candidate 5.1.73 — UAT-081 superadmin flow configuration

The production-built Web journey uses a synthetic `superadmin` response and intercepted APIs. It verifies company switching, tenant-filtered flow lists and writes, version lifecycle, availability/mapping updates and legacy ownership assignment. UAT-083 separately exercises API/Cloud HTTP with DB-backed superadmin/coordinator identities: all four superadmin flow-configuration API rows pass with persisted lifecycle readback, while their Web and other-role rows remain BLOCKED.

## Candidate 5.1.66 — flow configuration roles

The local production SPA uses isolated mock sessions: synthetic Company Co `admin` and synthetic superadmin. Admin/coordinator flow configuration requests are scoped to the authenticated fixture company; the company selector is absent to tenant roles. Superadmin legacy assignment is source/API-contract covered but was not exercised as a real login. API/Cloud regressions verify DB-derived source guards using isolated fixtures; persisted tenant roles remain unverified until UAT-060 runs against disposable PostgreSQL.

All browser personas are synthetic fixture data. UI role selection is not treated as authentication evidence. Isolated Nest HTTP/API regression verifies server-side role and tenant guards; persistent DB-backed acceptance remains open.

| Persona | Source-backed intended access | Local UI fixture | Access verification |
|---|---|---|---|
| Anonymous/guest | Public/login and public-safe diagnostics; no management | Local production SPA, mocked endpoints | UI journey passes; live auth not verified. |
| user | Own profile/devices and permitted operator flows; no management/elevation | Synthetic Company Co operator | Mocked UI; server denials covered by isolated regressions. |
| agent | Own safe device summaries/status, no manager revoke or secret read | Synthetic Company Co role in API/UI fixtures | API source guard denies revoke; Web Device page stays read-only. |
| coordinator | Company-bounded administration; cannot elevate roles or delete companies | Synthetic tenant role | UI fixture plus isolated API/Cloud tenant and privilege regressions. |
| admin | Company-bounded administration; cannot elevate roles or delete companies | Synthetic tenant role | UI fixture plus isolated API/Cloud tenant and privilege regressions. |
| superadmin | Global administration and role/company assignment from current DB authority | Synthetic elevated response | Current-DB superadmin checks covered in API guard/controller tests. |
| Device manager action | Admin/coordinator/superadmin revoke within authorized scope; user/agent cannot revoke; raw RPA config remains paired-device-only | UAT-032 separate synthetic role contexts | API regression 21 and local browser UAT; no persisted database acceptance. |
| Temporary UAT profile | Synthetic allowlisted profile in development/staging, max 10 min; no persisted role change | Visible temporary-mode banner and return control | PASS scoped: server-authorized start/end audit, allowlist, expiry, current-actor checks, revocation and original-admin return tested with isolated fixtures. |
| Native Browser/device | Paired tenant runtime and explicitly permitted media/vendor origin | Not exercised through OS/Electron | MANUAL/BLOCKED pending supported desktop/device/audio setup. |

No real accounts were authenticated and no hosted development target was used. UAT-009 real development login and UAT-010 persistent DB/migration acceptance remain blocked.


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
