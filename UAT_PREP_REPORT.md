# UAT Prep Report — KELEDON

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
