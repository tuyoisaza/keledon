# Current Auto Force UAT Prep revalidation — 2026-10-18

**Status: PARTIAL / BLOCKED for authenticated fixtures.** Goal remains the four ordered KELEDON commitments. Candidate under delivery review is PR #259 (5.2.11, head `293532e3404f84a08725a0662acd56bf42543184`) with PR #258 (PHDK/lifecycle evidence, head `a8c6ddf26e8bfe91b2c52959cf4328f7c5203c11`) against remote `main` `edd18be5dd8fd2c49c866f9006ee0f408642e9b4`. These PRs are open; production deployment of 5.2.11 is not verified. Installed PHDK is 2.54.0, canonical SHA `63e8cd28bbb4d412954abda6fb7fe9b79568ba9d`, coherence PASS 66/66.

The four UAT Prep artifacts and PIA CMT-003C1 were re-read against current source and owner restrictions. The existing local fixture seeder explicitly rejects production; production test-as is disabled; general company deletion is hard-delete; the global audit interceptor is asynchronous and cannot guarantee transactional audit. No compliant audited, reversible production fixture operation is currently evidenced. No owner-controlled synthetic mailbox/login is evidenced. Therefore no production user, tenant, brand/team, device, flow, database row, invite or email was created; no customer identity or data was accessed. No app test/build/lint was run locally, per owner instruction.

| Gate | Current result |
|---|---|
| PHDK 2.54.0 coherence | PASS, 66/66 static mappings |
| Candidate / deployment | PR #259 open; production 5.2.11 deployment UNVERIFIED |
| Synthetic login identity | BLOCKED — no owner-controlled synthetic normal-login account/mailbox evidenced |
| Audited reversible fixture lifecycle | BLOCKED — no safe production path; current seeder excludes production |
| Allowed fixture size/policy | READY as a documented boundary only: two temporary synthetic tenants, one regular user and Browser device per tenant, one inert no-PII flow on Team A, TTL ≤24h, immediate cleanup; no elevated test users, no invites, live CRM/call or private hosts |
| Authenticated role/tenant acceptance | BLOCKED pending both identity and compliant lifecycle |
| Anonymous public acceptance | Independent cases may proceed in Stage 50 against verified deployed production |
| Local application tests/build/lint | NOT RUN by explicit owner restriction |

**Next:** enter Stage 50 for harmless anonymous production journeys after browser readiness and exact target verification. Carry authentication, device/flow and private-egress cases as BLOCKED. Keep PIA CMT-003C1 as the implementation design gate; no source implementation is claimed by this Prep revalidation.
---

# Historical evidence follows

# UAT Prep Report — KELEDON

## Current production-only Prep revalidation — v5.2.7 / 2026-10-17

**Status: PARTIAL / BLOCKED.** Product source is `a7ca8689265642e6fe1f2f69aa4fa2c90b81867b` (Web v5.2.7); documentation main entering this revalidation is `7c9ad9accd74a11c6049949fa9f0d52927e6a34c`; installed PHDK is v2.53.1 with static coherence 64/64. The owner authorizes production-only acceptance and the bounded temporary non-privileged fixtures listed in `PIA-CMT-003C`.

The authorized plan is two isolated synthetic tenants with one ordinary user and one device per tenant, one no-PII flow and cleanup immediately after acceptance (24-hour maximum proposed). It does not authorize production `admin`, `coordinator` or `superadmin` test identities, role elevation, email/invitations, real customer data or provider/private-network calls. No fixture was created.

Source review confirms the existing `uat-prep-companyco` seeder is hard-restricted to loopback database `keledon_phdk_uat` in development/test; it refuses production. No authenticated production admin session or first-party audited provision/cleanup operation was available in this run. Therefore FIXTURE-01 scope authorization is recorded, but FIXTURE-02..05 and authenticated UAT remain **BLOCKED**. Do not weaken the seeder, add a public bypass, use direct production database writes, or expose secrets in chat/evidence.

No local application tests/builds were run per owner instruction. Production public UAT-132 remains narrowly PASS; it is not authentication evidence. No production mutation, email, API probe or customer-data access occurred.

**Next action:** make an existing first-party audited provisioning and cleanup path available for the explicitly authorized non-privileged fixture. Until then continue only source work independent of authenticated fixtures and keep role-based acceptance BLOCKED.

**Status: PARTIAL / BLOCKED.** Candidate 5.2.0 is based on remote `main` commit `6ae4e0a07fa6b0683ad3d32878a00feb6a88dc50`; PHDK is v2.53.0. Prep did not run a browser, headless browser, screenshot or OAuth flow.

The source audit confirmed local email/password HMAC authentication, database-derived roles, tenant-aware API guard, and a ten-minute audited superadmin Test as flow. The test profile policy is explicitly limited to development/staging and synthetic allowlisted identities. Existing regressions passed: `26-uat-test-profile.test.js` and `22-admin-http-wiring.test.js`. PHDK coherence passes v2.53.0 with 64/64 mappings.

The guarded fixture seeder is implemented at `services/api/scripts/uat-prep-companyco.ts`, with explicit environment/target policy in `services/api/scripts/uat-prep-companyco.policy.cjs`. Its policy regression verifies safe-target rules and append-only audit preservation; the command refuses to run without the explicit confirmation flag. Actual account provisioning and database-backed login are not proven: `DATABASE_URL` is absent, port 55432 has no listener, and Windows Application Control rejected the local PostgreSQL 16.15 `pg_ctl.exe`. No attempt was made against a hosted, customer or production database. No UAT credentials were generated or persisted. Live seeding, normal login, role/tenant checks and fixture cleanup remain BLOCKED until an allowed isolated PostgreSQL runtime is available; cleanup deliberately retains append-only audit events.

| Persona / proof | Result |
|---|---|
| Existing source-backed Test as policy and API guard wiring | PASS (regression only) |
| Actual current DB identities and normal login | BLOCKED |
| Cross-tenant persistence denial with seeded identities | BLOCKED |
| Test as session issuance/revocation against current DB | BLOCKED (mocked regression only) |
| Google OAuth test accounts | EXTERNAL/BLOCKED per customer provider |
| Production exclusion | PASS by source policy and target-policy regression; production/staging and non-loopback hosts are rejected |
| Cleanup of newly seeded records | N/A; nothing was created |

**Next:** run API migrations and `npm run uat:prep` on the dedicated loopback database when Windows permits the local test runtime; verify seeding, login, role, tenant, Test as lifecycle and `npm run uat:prep:cleanup`. Then enter browser UAT only after the separate UAT browser-readiness gate passes.
# UAT Prep revalidation — candidate 5.2.1 (2026-10-17)

**Result: PARTIAL / BLOCKED.** Candidate: `feature/tenant-interface-selector-5.2.0` at `ef6fe6dbf7eca04708c7200615e7538812751f7e`; PHDK v2.53.1. The existing guarded Company Co fixture seeder and source policy are retained, but no safe isolated PostgreSQL target is available. Production is explicitly rejected by the seeder and is not used for synthetic users or assignments. The live public homepage was later visited read-only and showed v5.1.85, so it is not the candidate under test.

| Prep gate | Result |
|---|---|
| Fixture infrastructure and production exclusion | PASS by existing source/policy regression only |
| Isolated DB migrations, seed/idempotency, normal login, role/tenant readback and cleanup | BLOCKED; no permitted isolated DB |
| Current candidate hosted target | BLOCKED; production serves 5.1.85 |
| Provider-backed test identities / Google OAuth | BLOCKED / customer-specific |
| Credentials or data created | None |

The user's production-only testing preference is honored for harmless public-page inspection. It cannot safely substitute for the isolated tenant-authentication and persistence checks the candidate requires. Resume this Prep when a dedicated non-production database/target is available; do not run the seeder against production.
