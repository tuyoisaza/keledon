# PHDK Lifecycle Handoff — UAT Fix continuation

Run ID: `20261012-keledon-four-fronts`
Stage: COMPLETED (scoped fixes); lifecycle acceptance remains incomplete
Started from revision: `b3f2853a509b35e7ad803b4b25ef93142afee5b8`
Completed at revision/worktree: `0d98f2812d8eb88a8626101f81f9bf9ca6d52de0`
Date: 2026-10-13

## Goal / scope
Repair UAT findings in diagnostics and approved admin/team flows.

## Inputs verified
- UAT-007/008 and prior failure records.
- Owner-approved DB-derived tenant and role policy.

## Work performed
- UAT-FIX-002 removed raw logging/config disclosure from CRUD health.
- UAT-FIX-003 enabled manager same-company team reassignment in UI/guard.
- Added accessible label to fixed manager company context and API/service regression coverage.
- Replaced the paragraph label with native `fieldset`/`legend` and reran the exact candidate UAT successfully.

## Deliverables
- Canonical: `UAT_REMEDIATION.md`, `UAT_RETEST_REPORT.md`, `UAT_CASES.md`.
- Historical snapshot: this continuation and `docs/phdk/evidence/uat-admin-users-team-scope.png`.

## Exit gate
- [x] Fixable in-scope failures were retested on exact 5.1.2 source.
- [x] Prior failures remain documented.
- [ ] Persistent CRUD and native/broad UX cases remain outside verified acceptance.

## Decisions / assumptions
Manager team assignment is permitted only when the API confirms the target team belongs to the actor's DB-derived company. Superadmin keeps role/company administration.

## Risks / blockers
UI calls are intercepted; Nest fixtures are isolated; no persistence proof.

## Evidence
`services/web npm run test:uat` 1/1; API regression 10/10; changed API ESLint clean.

## Next stage
Stage: SEO/AEO-GEO/Check
Required inputs: updated UAT and remediation records, current source SHA
Verify: revalidate source-relevant controls; preserve deployed/external limitations.

## Database persistence continuation — 2026-10-13

A fresh isolated PostgreSQL run found that the historical Speaches migration altered Team while Prisma maps the model to 	eams. The migration SQL now targets 	eams; an additive idempotent forward repair supports installations that already recorded the historical migration. Fresh seven-migration deploy, forward repair, schema status, Prisma Company/Brand/Team/User synthetic CRUD transaction and rollback all passed. The exact local evidence and important checksum limitation are recorded in DATABASE_MIGRATION_RETEST_20261013.md. No live database was accessed. Acceptance remains partial until deployment migration history, exhaustive CRUD matrix, native device/audio, broad accessibility/localization and deployed metadata are verified.
