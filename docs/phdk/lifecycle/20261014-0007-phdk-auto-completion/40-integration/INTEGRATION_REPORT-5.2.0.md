# Integration Report — KELEDON 5.2.0

**Candidate base:** remote `main` `6ae4e0a07fa6b0683ad3d32878a00feb6a88dc50` (tree `096589d3716e76d05df9b64c196c06b92a88fd34`). **PHDK:** v2.53.0. **Integration state:** source-integrated; database-backed UAT Prep is blocked and browser UAT has not started.

## Integrated change

Admin and Coordinator can view company-owned ManagedInterface entries and assign them to teams in their company. The API and Cloud derive actor and tenant from the database, filter catalog and assignment reads by that company, reject cross-tenant catalog/team IDs, omit credentials from responses, and retain platform-owned assignments. Global catalog administration remains superadmin-only. API and Cloud Prisma migrations add nullable `companyId` to ManagedInterface so existing global entries remain unchanged.

Stage 45 also includes a guarded Company Co seeder for synthetic identities and database-backed login/role/tenant/Test-as checks. It requires explicit confirmation, non-production development/test configuration, a dedicated loopback PostgreSQL database and ownership-marker-safe cleanup. Fixture cleanup preserves append-only audit evidence. The seeder is implemented but has not been run against a database.

## Verification performed

| Check | Result |
|---|---|
| API regression suite | PASS, 45/45 suites |
| Cloud regression suite | PASS, 21/21 suites |
| API TypeScript build | PASS |
| Cloud production TypeScript build | PASS |
| API standalone TypeScript typecheck | PASS |
| Web lint and production build | PASS; existing >500 KB bundle warning |
| API and Cloud Prisma schema validation/client generation | PASS using a synthetic loopback URL; no database connection |
| Tenant interface scope tests | PASS in API and Cloud |
| UAT Prep target safety regression | PASS; seeder correctly refuses missing explicit confirmation |
| Live migration, seeding, DB login/role/Test-as and cleanup | BLOCKED: no loopback PostgreSQL listener; Windows Application Control rejected local PostgreSQL startup |
| Browser UAT | NOT STARTED: stage 45 is not READY |

The current CRUD capability matrix contains 560 rows: 406 BLOCKED, 122 NOT APPLICABLE, 3 DECISION NEEDED and 29 PASS. Source regressions do not close persisted UAT rows. PHDK coherence must be rerun after candidate documentation and version reconciliation.

## Open integration gates

1. Run API migrations and the guarded Prep seeder against the dedicated isolated loopback database; verify normal sign-in, DB-derived roles, cross-tenant denials, Test-as lifecycle and cleanup.
2. Reconcile evidence after the database proof, then enter browser UAT and validate the selector with Admin, Coordinator, foreign tenant and superadmin roles.
3. Keep customer-specific voice/Cloud/Browser/CRM acceptance pending each customer's chosen provider and CRM; do not use customer endpoints in synthetic tests.

**Candidate readiness:** integrated source checks pass; complete UAT readiness is **BLOCKED** pending stage 45 database-backed proof. Whole PHDK Auto remains partially delivered (0/4 commitments complete).
