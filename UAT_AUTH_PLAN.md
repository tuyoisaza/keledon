# UAT Authentication Plan — KELEDON

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
