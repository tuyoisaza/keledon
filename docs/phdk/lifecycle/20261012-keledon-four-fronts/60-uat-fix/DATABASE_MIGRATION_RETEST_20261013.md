# Database migration UAT — 2026-10-13

Run `20261012-keledon-four-fronts`; KELEDON candidate 5.1.6, product commit `ffb973fb354d2f0509f22d1f12361573b16948f6`. All database activity used a disposable PostgreSQL 15.19 cluster on loopback port 51009 under the user's temporary directory. No service was installed, no production/customer/provider database was read, and no credentials or external endpoints were used.

## Reproduced failure and repair

A fresh `prisma migrate deploy` stopped at `20260610195649_add_speaches_fields`: SQL targeted quoted table `"Team"`, while Prisma maps model `Team` to `"teams"`. The migration now targets `teams` and is idempotent. A later forward migration `20261013000000_repair_speaches_team_columns` also adds both columns idempotently for databases that already recorded the older migration.

## Evidence

- Fresh database: all seven migrations applied; `prisma migrate status` reports schema up to date.
- Upgrade path: the prior six-migration database accepted the new forward migration; status reports all seven up to date.
- Prisma schema validation and client generation passed.
- A rolled-back synthetic Prisma transaction created/read/updated Company → Brand → Team → User; verified foreign-key relations, default user role and Speaches columns, then rolled back all fixtures.
- API regression suite: 10/10 suites passed. API build and C13 sentinel passed.
- Web build, typecheck, diagnostics (18/18), SEO (1/1), and production-SPA Edge UAT (1/1; nine synthetic journeys) passed at version 5.1.6.

## Migration history limitation

The original Speaches migration is historical. This repair changes its SQL so a fresh database can pass the sequence. [Prisma migration history guidance](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/migration-histories) recommends not editing migrations already applied elsewhere. The forward migration repairs schema state for installations that recorded the old migration, but the deployed migration ledger and checksum are unknown because no customer or production database was inspected. Before applying to an environment that may have recorded the old checksum, reconcile that environment's migration history with its owner. This local pass is not approval to run a live migration or claim deployment acceptance.

## Acceptance

The scoped migration and synthetic persistence case pass. Full CRUD role/resource/surface coverage, deployed migration-ledger state, live native device/audio, broad accessibility/localization and deployed SEO/AEO remain incomplete.
