# PHDK Check — 5.1.7 local candidate

Date: 2026-10-13 America/Mexico_City · PHDK 2.50.10 · Goal: the four owner-confirmed KELEDON fronts and maximum applicable code conformity. Candidate branch: `fix/fail-closed-api-migrations`; candidate changes remain uncommitted and unpublished. Current remote `main` is `3c6e4c71bc5672984a1fd07df62d722f95beb4e7`, version 5.1.6. PRs #51–53 are merged; no open PR exists.

## Findings remediated

- The API Dockerfile generated a separate inline `/start.sh` which unconditionally ran `prisma migrate resolve --rolled-back` for two hard-coded migrations on every startup. The deployed startup logs for SHA `3c6e4c7` show seven migrations and no pending work, but also show the old command marking `20260529220000_add_rpa_provider_config` rolled back. The exact deployed database ledger was not queried.
- After five failed migration attempts, the old loop continued into seeding and API startup. The reviewed `services/api/start.sh` now exits nonzero after five failures, before database seed or server startup; all automatic migration rollback resolution is removed.
- The previous empty-database check treated a failed `company.count()` as zero. Startup now exits before seeding/API startup if it cannot verify the count.
- Docker now copies and invokes the checked-in startup script, so the tested script is the production entrypoint.
- API lint previously used `--fix`, making a verification command mutating. That flag is removed. Typed ESLint rules remain enabled through TypeScript Project Service, and the canonical API tsconfig includes all `src/**/*.ts`. The missing Prettier peer is pinned at 3.9.9, matching the plugin's peer requirement.
- Full-source API type checking initially showed eight errors. Seven were repaired in Analytics/gateway typing, unreachable AI-loop success reporting, and duplicate modules. The final missing import was resolved by retiring the two unreferenced `MinimalCloudServer` entrypoints and their duplicate runtime manifests. Git history shows the former `CloudServer` implementation had already been intentionally removed in the Supabase-only migration; current Docker and runtime scripts launch Nest `dist/main`. All-source API TypeScript checking now passes.

## Candidate verification

- `services/api`: production/C13 build PASS; full regression runner PASS, 11/11 suites; startup harness PASS for normal startup, five migration failures, failed company-count query, Docker entrypoint wiring, and no migration rollback; startup shell and regression JavaScript syntax PASS.
- `services/api`: full typed ESLint PASS across 184 files, 0 errors and 139 warnings. Diagnosis found the configured Prettier rule depended on an uninstalled peer; Prettier 3.9.9 is now pinned and source follows the existing `.prettierrc`. Nine surfaced rule errors were fixed without disabling any rule.
- `services/web`: typecheck PASS; Vite build PASS; diagnostics tests PASS 18/18; SEO tests PASS 1/1. Lint exits 0 with 134 warnings and 0 errors; existing React hooks and `any` warnings remain. Build reports a 698.72 kB minified JS chunk.
- `landing`: typecheck PASS; Vite build PASS; lint PASS. Build reports a 576.72 kB minified JS chunk.
- `browser`: regression tests PASS 19/19.
- `cloud`: production/C13 build PASS; regression tests PASS 8/8.
- Other source has no TypeScript product changes in this candidate. Existing 5.1.6 UAT/migration evidence is reused as historical evidence only; it does not exercise a deployed 5.1.7 container or database.
- `git diff --check` and version-root consistency PASS at final review. Candidate has not been committed, pushed, or opened as a PR.

## Remaining gaps

The full persisted resource × role × tenant × surface CRUD matrix, production migration ledger/runtime, native Electron rendering/device/audio, broad route/theme/localization/accessibility, and deployed SEO/AEO remain open. Provider integrations remain tenant-selected; no vendor was hard-coded or contacted. No direct production database access, production migration, customer data access, live application probe, or deployment was performed for this candidate.

Check result: **SOURCE CHECKS PASS / ACCEPTANCE PARTIAL**. API/Cloud builds and source typing, API full typed lint, and available product regression suites pass. Remaining runtime and broad acceptance evidence stays open; keep Auto **PARTIALLY DELIVERED** pending normal PR delivery and those acceptance items.

## Post-merge readback and current UAT — 2026-10-13

The candidate described above was integrated by PR #54. Remote `main` is `a854ca7634307538305cd9b5ad1f91f8a066b1a1`, version 5.1.7; tested commit `edce7eafbe13ac16ab93274a87e12571e7b04b2e` has the identical tree. Fresh local Edge UAT passes 1/1 suite; web diagnostics pass 18/18 and API regression passes 11/11. PHDK mechanical completion gate and coherence 52/52 pass. Delivery is now MERGED/REMOTE VERIFIED; the Check conclusion remains SOURCE CHECKS PASS / ACCEPTANCE PARTIAL. No deployed DB, native device/audio, broad accessibility/localization or SEO/AEO evidence is claimed.
