# Remediation continuation — 5.1.7

Date: 2026-10-13 America/Mexico_City · Branch: `fix/fail-closed-api-migrations` · Base: remote `main` `3c6e4c71bc5672984a1fd07df62d722f95beb4e7` (5.1.6) · Installed PHDK: 2.50.10.

## Change and evidence

Railway's bounded existing deployment logs for the base SHA reported seven migrations found and no pending migrations, then showed the old startup script resolving `20260529220000_add_rpa_provider_config` as rolled back. This is deployment-log evidence only; no database was queried or changed.

The candidate removes both hard-coded startup rollbacks, moves Docker startup to the checked-in `services/api/start.sh`, stops after five unsuccessful `migrate deploy` attempts, and stops if it cannot verify the company count before deciding to seed. `services/api/test/regression/26-startup-migrations.test.js` covers startup success, migration failure, count-query failure, and Docker wiring.

Verification after the final source edit:

- `npm run build` — PASS (C13 sentinel and TypeScript build).
- `node test/regression/run.js` — PASS, 11/11 suites.
- Startup-specific regression — PASS.
- POSIX shell syntax and regression test JavaScript syntax — PASS.
- Full typed API ESLint — PASS on all 184 source files (0 errors, 139 warnings). The existing Prettier rule was waiting on a missing peer; Prettier 3.9.9 is now pinned, formatting follows `.prettierrc`, and nine surfaced rule errors were fixed without disabling rules.
- Full API `src/**/*.ts` type checking now passes. The final unresolved import was in an unreferenced, duplicate legacy `MinimalCloudServer` runtime whose former CloudServer source had already been deleted in the Supabase-only migration. Both stale runtime manifests/entrypoints and obsolete TypeScript path references were retired; production Docker and scripts use Nest `dist/main`.

## Stage state

UAT Fix for the startup defects is **SCOPED PASS** by deterministic shell regression. Full UAT remains incomplete: the migration script was not run against any persistent or production database; native Electron/device/audio, exhaustive CRUD, broad accessibility/localization, and deployed SEO/AEO remain open. Source Check passes; acceptance remains **PARTIAL** on those runtime gaps.

No commit, push, PR, or deployment has been made yet. With source checks passing, proceed to normal versioned PR delivery; retain the acceptance gaps as partial. See `../70-check/PHDK_CHECK_REPORT_5.1.7.md` and `../90-delivery/DELIVERY_REPORT_5.1.7_PREMERGE.md`.
