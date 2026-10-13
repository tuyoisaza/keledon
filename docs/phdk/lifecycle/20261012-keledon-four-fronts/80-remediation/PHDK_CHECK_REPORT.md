# PHDK Check report — remediation update, 5.1.0

Date: 2026-10-13. This handoff updates the earlier Check snapshot after source-only landing repairs. It applies to branch `chore/phdk-install-v2.50.8` at base `ef93da12c7d1a771eb29f52548479f8ad5530823` plus the current uncommitted worktree; it is not a merged release.

## Remediation verified

- Landing TypeScript typecheck and production build pass.
- Fixed selected-agent comparisons, API JSON body typing/serialization, snake_case relationship reads, category unions, company-country narrowing, a team fetch signature, and the Vite config's unused environment load.
- Replaced the device page's forged `x-user-id` request and unsupported pairing call with session-authenticated listing and navigation into the Keledon launch flow.
- Replaced the launch page's hard-coded fake pairing code with authenticated fetch/rotation, expiry display and copy behavior backed by the existing superadmin-protected endpoints.
- Removed two unreferenced stale components and dead imports/state; removed a constant, nonfunctional “real-time” toggle from Agent Control Center.
- Updated root `CRUD_MATRIX.md` with current evidence language and an explicit list of omitted persisted resource families. The CRUD gate remains BLOCKED because that inventory still requires complete role × surface × operation rows and evidence.

Targeted ESLint for the changed dashboard, device, launch and document-add flows passes with 0 errors and one hook-dependency warning. Full `landing npm run lint` still exits nonzero with 99 errors and 8 warnings across legacy source; no global lint pass is claimed. The whole project TypeScript check and build are separate and pass.

## Remaining gates

Full CRUD role/tenant/API/browser tests and database persistence; accessible management detail journeys; landing localization and broad rendered accessibility; native Electron widget acceptance; deployed SEO response headers; clean full-project landing lint; normal PR review and merge; required-check and main SHA/version readback. Browser UAT is not run during Check; prior Edge evidence is limited to synthetic fixtures. No production database or migration was used.

PR #42 remains OPEN/DRAFT. Status is PARTIAL/BLOCKED until the incomplete gates and normal delivery controls are resolved. Do not mark the Auto goal complete.
