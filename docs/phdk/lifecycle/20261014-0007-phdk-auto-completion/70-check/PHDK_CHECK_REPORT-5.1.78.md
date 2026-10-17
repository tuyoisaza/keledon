# PHDK Check — 5.1.78 candidate

Run `20261014-0007-phdk-auto-completion`; source candidate `93c83bc3789f5fe5269f5dabd2c9f4557404c3e8` on branch `fix/phdk-auto-continuation-5-1-78`; subsequent status and UAT evidence updates are pushed to the same PR branch. Fetched base `origin/main` `383fd84f2fd1c7218882dc840db7e5be1957246a`; product version 5.1.78; installed PHDK 2.52.2, coherence 63/63.

## Checks passed

- Cloud managed runtime Jest: 6/6; Cloud regressions: 19/19; scoped ESLint; production TypeScript build.
- API managed AI contract: 9/9; API regression runner: 42/42; focused RolesGuard Jest: 3/3; API production build.
- Authentication follow-up: current DB actor role/email regression, OAuth abuse/exchange regression, scoped API auth lint and API build pass; one-use Google exchange browser UAT is 1/1 on source candidate `93c83bc`.
- Production-built local Web UAT is 8/8 journeys plus standalone admin-settings, theme-template and AI-admin UAT; Web OAuth flow is included and synthetic/intercepted only.
- API/Cloud mirrored migration/default parity regression: PASS.
- Web and Landing production builds; Web typecheck; Browser TypeScript build and renderer version synchronization.
- Browser security/runtime and synthetic call lifecycle regressions: 22/22; Landing SEO source test: 1/1.
- Prisma schema validate and generate with a placeholder local-only URL; no database connection was made.
- Five package/lock roots and Browser renderer align at 5.1.78; `git diff --check` passes; PHDK coherence 63/63.
- Follow-up AI-admin publish gate: API contract 10/10 and Cloud managed-runtime Jest 7/7 pass; API/Cloud schemas validate and clients generate with placeholder local URLs. Built-Web UAT confirms a save remains staged until the superadmin publishes; no provider call is made. API/Cloud migration files are byte-identical and additive. No database migration was applied.

## Automation and Cost Hygiene

- Repository/base: `tuyoisaza/keledon`, fetched base `383fd84f2fd1c7218882dc840db7e5be1957246a`. Static collector reports no automation source findings. No root `.github/workflows` exists; GitHub Actions currently lists 0 workflows. Branch `main` is unprotected. The most recent visible historical `Version Bump` run (2026-09-29) failed while pushing a stale generated commit with non-fast-forward; it is not an active workflow because the remote inventory is empty. No runs were dispatched.
- Railway `KELEDON` production metadata was refreshed read-only on 2026-10-17. `keledon-api` and `keledon-web` both source `tuyoisaza/keledon:main`; `keledon-web` still has live root directory `/services/web`, RAILPACK, and service `checkSuites: false` (no Wait for CI dependency). The newest Web deployment remains FAILED for main commit `383fd84f` (5.1.77), and the four preceding Web deployments are also FAILED at build. Existing 5.1.73 Web deployment is SLEEPING. No cron is configured in the live service config.
- Source remediation makes `services/web/Dockerfile` use repo-root context and copies the Web package plus canonical `shared/` theme tokens; `services/web/railway.toml` points to `services/web/Dockerfile`. Local Docker is unavailable, so the container build is not verified. Railway's live service setting is external and was not changed.
- Required owner action before Web deploy can pass: set Railway `keledon-web` root directory to `/` and config-as-code file to `/services/web/railway.toml`. Railway's documented root-directory setting is provider-level; config-as-code is read from the explicitly configured path. Retest by observing a successful Web deployment from the resulting main SHA. Until that setting is changed, production Web delivery is EXTERNAL / MANUAL and automation alignment is incomplete. Restart policy details and billing trends were not available in the read-only view; do not infer costs or savings.

Overall automation status: **ALIGNMENT INCOMPLETE** because Railway root-directory correction, Web deploy success, restart-policy readback and billing/usage trend inspection remain external/unverified. Preserve GitHub-connected Railway autodeploy; no provider writes were made.

## Open and limited checks

- Full API Jest excluding the database-dependent e2e case passes 48/48. The e2e requiring `DATABASE_URL`/disposable PostgreSQL remains BLOCKED. The broader API regression runner passes 42/42 suites. No full database-suite pass is claimed.
- Prisma migrations, including the new staged/published AI revision migration, were not applied and restart persistence was not tested.
- `cloud/` is the legacy/source parity runtime, not the production Railway API service.
- Repository still has 396 BLOCKED CRUD rows, 132 N/A, 3 decision-needed and 29 previous PASS; do not treat this backend slice as closing them.
- Local Web journeys were exercised against synthetic fixtures; they do not replace a packaged Browser/Electron journey. No live AI provider, customer call/CRM, private endpoint or candidate production deployment was used. Read-only Railway deployment/config metadata and GitHub workflow inventory were inspected; billing trends remain unavailable.

Theme audit: the vendored static scanner returns STATIC_PASS with no findings; runtime theme switching/editor persistence remains unverified and existing accessibility/manual gates stay open.

## Finding disposition

The stale `RolesGuard` test expectation was corrected. The subsequent auth review found two additional source issues: normal protected requests trusted token role/email and a Google callback put the application bearer token in the query string. The guard now resolves the current account/role/email from the database, and OAuth exchanges a short-lived, hashed, single-use code by POST after the SPA clears its URL fragment. API actor/replay tests and local browser exchange UAT pass. Remaining database, external integration, Railway provider configuration and manual acceptance gates are open.

## Delivery

PR #198 is open; GitHub reports no hosted checks or reviews, and the repository has no active workflow. The PR branch is synchronized; `main` remains at fetched base `383fd84f2fd1c7218882dc840db7e5be1957246a`. Merge and remote-main verification remain pending the Railway external root/config correction and successful Web build. Portfolio remains **0/4 commitments DONE; 4/4 ACTIVE/PARTIAL**.
