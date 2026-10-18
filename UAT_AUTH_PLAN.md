# Current UAT Auth Plan — Auto Force revalidation (2026-10-18)

## Candidate and environment

PR #259 proposes KELEDON 5.2.11 (head `293532e3404f84a08725a0662acd56bf42543184`) over remote main `edd18be5dd8fd2c49c866f9006ee0f408642e9b4`; PR #258 carries PHDK 2.54.0 lifecycle alignment. Both are open and production deployment is UNVERIFIED. The permitted functional environment remains the deployed production site; no application behavior is inferred from source or PR state.

## Supported identity and boundary

Use KELEDON's ordinary first-party email/password or Google sign-in, never test-as in production, forged claims, manually minted tokens, direct database writes, a public fixture endpoint, or provider-setting changes. New identities receive only `user`; actor and tenant come from the database. Only an existing authorized superadmin can bind/provision fixtures through an audited first-party path if one becomes available. No such completed reversible path or owner-controlled synthetic mailbox/account is currently evidenced. Do not use the owner's normal identity as a test persona.

## Authorized fixture scope

Two temporary isolated synthetic tenants, one regular `user` and one Browser device per tenant, minimum Brand/Team structure, and one inert no-PII flow on Team A. TTL at most 24 hours and immediate cleanup. No elevated test users, email/invitations, customer data, live calls/CRM, private-network requests, metadata access, secrets or credentials in evidence. Private CRM acceptance additionally needs a tenant-selected synthetic host/port/CIDR and connection-level enforcement.

## Current decision and next action

Authenticated UAT remains BLOCKED until both an owner-controlled ordinary synthetic identity and an authenticated, durable-audit, reversible cleanup path exist. No production mutation was made. Stage 50 may proceed with independent anonymous journeys after exact production target and browser readiness are verified; leave authentication cases blocked and resume them only when the safe prerequisites are actually available.
---

# Historical evidence follows

# UAT Authentication Plan — KELEDON

## Current production-only authorization scope — v5.2.7 / 2026-10-17

- Candidate product source: `a7ca8689265642e6fe1f2f69aa4fa2c90b81867b`, KELEDON Web `5.2.7`; PHDK v2.53.1, static coherence 64/64. Documentation main entering this record: `7c9ad9accd74a11c6049949fa9f0d52927e6a34c`.
- Owner instruction authorizes acceptance on the production site and preparation/provisioning/cleanup of the bounded synthetic scope recorded in `PIA-CMT-003C`: two temporary isolated tenants, one non-privileged user and synthetic device per tenant, one flow with no PII, cleanup immediately after acceptance (24-hour maximum proposed).
- Excluded: `admin`, `coordinator` or `superadmin` test identities, elevation, invitations/email, real tenant/customer data, provider calls and private/metadata destinations.
- Safe production identity/bootstrap path: **NOT AVAILABLE/VERIFIED**. The guarded seeder only permits isolated loopback `keledon_phdk_uat` in development/test. No authenticated administrative session or production provisioning/cleanup path was available in this run. Do not invoke the seeder against production, add a bypass, write directly to the production DB, or store credentials in artifacts.
- Browser state: anonymous production public `/login` only. UAT-132 proves localized form labels and one keyboard sample; it does not authenticate a persona.
- Readiness: **BLOCKED** for authenticated fixture provisioning until an existing first-party audited path can be used. Public anonymous UAT remains permitted. No local application tests/builds were run.

## Current candidate revalidation — 5.2.1 / 2026-10-17

- Exact candidate branch/revision: `feature/tenant-interface-selector-5.2.0` / `ef6fe6dbf7eca04708c7200615e7538812751f7e`.
- Current PHDK: v2.53.1. The already-implemented normal local login and DB-derived authorization remain the only acceptable identity path.
- Requested production target: `https://keledon.tuyoisaza.com/`. A harmless public-home navigation displayed product version 5.1.85. It is not the 5.2.1 candidate and cannot accept its TeamInterface selector.
- Safe authenticated target: none verified. No real production accounts, passwords, tokens, tenant records or database will be used as test fixtures. The current seeder refuses production and needs an isolated loopback PostgreSQL target.
- Result: authenticated current-candidate Prep remains BLOCKED; continue the permitted public, read-only production surface check only.

## Candidate and trust boundary

- Product candidate: KELEDON 5.2.0, source base `6ae4e0a07fa6b0683ad3d32878a00feb6a88dc50`.
- Standards: PHDK 2.53.0 (64 manifest mappings).
- App identity: local email/password login issues the existing HMAC bearer token; Google OAuth is also supported but requires customer/provider access. The API re-reads the user and current role from PostgreSQL for authorization.
- Tenancy: multi-tenant. `superadmin` is platform-wide; `admin` and `coordinator` are tenant-scoped; `agent` and `user` are lower-privilege personas.
- Safe target: a dedicated PostgreSQL database named `keledon_phdk_uat` on loopback, never Railway or customer data. No `DATABASE_URL` is configured in this shell. Windows Application Control blocked execution of the available PostgreSQL 16.15 `pg_ctl.exe`; no database listener was present on port 55432. No account was provisioned in this Prep.

## Authentication and authorization path

Use the existing local login and `AuthGuard`; do not add JWT or a second issuer. `services/api/scripts/uat-prep-companyco.ts` now contains the guarded idempotent fixture seeder and in-process authentication/role checks; it generates random passwords in memory and stores only bcrypt hashes. The current `UAT_TEST_PROFILE_SESSION` mechanism is a separate, superadmin-only, ten-minute audited reduction of privileges. Its API and Web paths are `services/api/src/auth-local/uat-test-profiles.service.ts`, `services/api/src/auth-local/uat-test-profile.policy.ts`, `services/api/src/guards/auth.guard.ts`, and `services/web/src/components/layout/UatTestProfileControl.tsx`. It requires explicit non-production configuration and an allowlist of synthetic user IDs. Google identities cannot be provisioned without customer-specific provider authorization and remain an external UAT blocker.

## Planned synthetic personas

Company Co uses fictional records only, with `.invalid` addresses. Use one isolated Company Co tenant plus a second synthetic tenant only when verifying cross-tenant denial. The minimum identities are platform superadmin; Company Co admin, coordinator, agent and user; and an Other Co user. Do not use the live-domain examples in the canonical demo data. Never write passwords, tokens, hashes, OAuth settings or browser auth state into reports.

## Provisioning, proof and cleanup

No fixture credentials or test accounts are currently available. The seeder validates exact loopback host and database name, requires explicit confirmation and development/test mode, refuses production/staging and non-loopback URLs, checks ownership before reusing or deleting records, provisions `.invalid` synthetic identities and mock CRM catalog rows, authenticates every role through the normal login service, and verifies role, tenant and Test as lifecycle checks. It includes `--cleanup` for owned fixtures. It has not passed a live database run because Windows blocked the local PostgreSQL process. Do not enable the adapter in production or write identity-provider/hosting settings.

## Readiness

Prep is **PARTIAL/BLOCKED** until the isolated database accepts a real seed/login/permission/cleanup run. The existing mocked HTTP regression proves guard wiring and fail-closed Test as behavior, but does not prove current database-backed identities or independent sign-in. Google login remains customer-specific and is not represented as ready.
