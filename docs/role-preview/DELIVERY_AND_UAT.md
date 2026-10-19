# Superadmin role selector — 5.3.0

Current request (2026-10-18): let the superadmin switch to other roles to try their interfaces. This is scoped implementation, not activation of an earlier Auto/PMO task.

## Commitment ledger

| ID | Outcome | Source state | Production acceptance |
|---|---|---|---|
| ROLE-01 | Visible desktop/mobile selector, preparation, loading/error/retry | Implemented | NOT RUN |
| ROLE-02 | User, agent, admin and coordinator DB identities; isolated Company Co tenant | Implemented | NOT RUN |
| ROLE-03 | Audited signed session, <=10-minute expiry, current actor/role/tenant/run checks, no writes/provider/runtime access | Implemented; assistant source/security review performed | NOT RUN |
| ROLE-04 | Return, reload and expired-preview recovery without discarding original admin session | Implemented | NOT RUN |
| ROLE-05 | Versioned PR, merge and independent remote-main readback | Pending publication | Pending |

## Use

In the sidebar, **Probar como rol → Preparar o renovar perfiles → select a role → Entrar al perfil**. Preview opens Profile in a fresh page context, clearing previous page/socket state. **Volver a superadmin** ends the audited preview and restores the original still-valid admin session. The selector is also available in the mobile user area.

This feature previews navigation and reviewed read-only data routes. Mutations, pairing/launch/debug routes, Brain/provider calls and sockets are unavailable in preview. It does not provide functional write acceptance or impersonate an existing human/customer. Guest/public views remain anonymous, outside this authenticated selector.

## Server boundaries and lifecycle

- Only a current active DB superadmin can prepare/list/start/return. Preparation is an explicit UI POST, never an automatic side effect of loading the selector.
- `RolePreviewFixturesService` uses the existing fixture advisory lock and serializable transaction. With no fixture run, it creates one bounded run with two synthetic companies/brands/teams, two inert regular seed users/devices/KELEDONs and four passwordless role profiles in Company Co A. No schema migration, credentials, real users or provider calls are added.
- An existing run is reused only by its creator while active. Its first member's actual tenant/team must match its manifest. Existing UAT run expiry/retirement is not overridden. Dedicated runs created for this feature may be explicitly renewed for 24 hours without adding tenants/users; renewal resets authentication boundaries and is audited.
- Managed profile validation requires the exact reserved synthetic address, allowed persisted role, no password, active user/run, run creator, manifest tenant/team and matching provisioning audit event. Start captures actor, target, role, company, team, reason and expiry. Each request revalidates that evidence, current memberships, actor role, fixture TTL/retirement and return revocation.
- The global guard allows only GET `/api/auth/me`, device list/status and enumerated CRUD collection/detail reads (plus team interfaces and knowledge documents); existing resource guards still enforce RBAC/tenant scope. Other protected operations fail closed and record denial against the originating actor/session. Existing explicitly allowlisted staging profiles retain the non-production policy.
- Preview credentials have no ordinary issued-at claim and cannot use the fixture account's normal-login/runtime credential path. The frontend disconnects sockets; TTS additionally rejects preview credentials through the existing guard. Return uses the preserved original admin credential, verifies ownership, records end and is idempotent after a lost response. Reload uses the global guard's validated preview identity for `/me`.
- Existing `POST /api/admin/uat-fixtures/:runId/retire` also retires preview users. Retirement retains evidence/inert synthetic records; there is no destructive deletion or background cleanup job. Fixture/session TTL is enforced on requests. Dedicated renewal is explicit and does not restore device credentials or activate flows/agents.

## Checks and limits

- Static TS/TSX syntax: 10 changed files, zero parse errors. Locale JSON syntax: es/en/pt passed. PHDK coherence: 69/69, v2.56.0. Diff whitespace passed.
- Web static type analysis (`tsc --noEmit --incremental false -p tsconfig.app.json`): passed. No application tests, emitted builds or lint ran locally.
- API static type analysis cannot pass with the checkout's stale generated Prisma client: its schema lacks the already-versioned `UatFixtureRun` and User lifecycle fields. This affects existing authentication/fixture source as well as this change. No client generation, database connection/migration or local application build was performed. The existing API Dockerfile generates Prisma before its TypeScript build; that production-hosted build outcome remains unverified here. This is not an acceptance PASS.
- No production accounts or fixtures were created by the assistant. No browser/app endpoint acceptance, customer data, metered API, provider write, Actions or deployment command was used.

## Scoped production UAT backlog

All cases below are **BLOCKED / NOT RUN** until the deployed candidate and an approved, authenticated synthetic elevated session are available through the existing audited path. The owner's habitual identity must not substitute for the missing fixture/session. Read `UAT_BROWSER_READINESS_STANDARD.md` before execution; record actual browser access separately. This document does not activate UAT.

| Case | Required production evidence |
|---|---|
| ROLE-UAT-01 | Synthetic elevated actor prepares bounded fixtures; second click reuses IDs; ordinary user preparation/list/switch returns 403 |
| ROLE-UAT-02 | Each of four roles opens Profile, updates navigation and shows unmistakable read-only banner; desktop/mobile keyboard and error/retry behavior |
| ROLE-UAT-03 | Direct mutation, pairing/launch/debug, Brain/TTS/runtime requests denied before effects; original actor/session identifiable in denial audit |
| ROLE-UAT-04 | Tenant A profile cannot retrieve Company Co B or a real tenant via URL/query/ID; existing RBAC rejects forbidden resources |
| ROLE-UAT-05 | Changed target role/membership, removed actor privilege, retired/expired run and expired/revoked session fail closed |
| ROLE-UAT-06 | Reload works; expiry preserves return control; return revokes old token; replayed return succeeds safely; original session expiry requires normal sign-in |
| ROLE-UAT-07 | Retire run via audited endpoint, confirm all preview users denied and devices inert; explicit dedicated renewal reuses rows and does not revive old sessions |

Prerequisite owner/operator action: provide a compliant synthetic superadmin session using the established provider/authentication path and a deployed candidate matching the delivered SHA. Then invoke scoped production UAT for ROLE-UAT-01..07. If an unrelated fixture run already exists, its owner must reconcile its lifecycle first; this feature will return 409 rather than replace it or add tenants.

Delivery and acceptance remain separate: source implementation is ready for PR delivery; production behavior is unverified.
