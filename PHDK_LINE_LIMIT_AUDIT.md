# PHDK physical line limit audit

## Current candidate 5.1.24 — 2026-10-14

The live source inventory covers **1,077 files; 0 are at or above 600 physical lines**. The candidate adds the API/Cloud vendor URL policy, CRUD regressions and Browser/Web configuration within the limit. Generated bundles, dependencies, JSON locale/data catalogs, lockfiles, Git metadata, lifecycle docs and vendored PHDK standards are excluded. The prior 5.1.23 boundary split remains intact.

## Current Auto candidate 5.1.23 — 2026-10-13

The live application/test inventory covers **1,072 files; 0 are at or above 600 physical lines**. Inventory includes TS, TSX, JS, JSX, MJS, CJS and Vue files, and excludes dependencies, build output, Git metadata, vendored standards and immutable lifecycle snapshots. The historical snapshot under `docs/phdk/lifecycle/20261013-1900-phdk-auto/40-integration/snapshots/` retains the prior 610-line `crud-api.ts` exactly as evidence and is not live product source.

This candidate fixes the live findings in `services/api/src/crud/crud.service.ts` (601 lines) and `services/web/src/lib/crud-api.ts` (610 lines): health-report generation now lives in `crud-health.ts`, and public CRUD/runtime data shapes live in `crud-api.types.ts`. The API health-disclosure regression loads the extracted helper and passes; API regression is 18/18, API build passes, Web typecheck/build pass, and focused lint reports zero errors. The Web build retains its existing large-chunk advisory. This audit covers the physical-size criterion only; the broader PHDK Auto remains partial.

## Current Auto candidate 5.1.17 — 2026-10-14

Fresh `rg --files` inventory of repository TS/TSX/JS/JSX/CJS/MJS sources, excluding `node_modules` and generated `dist`: **1,068 files; 0 at or above 600 lines**. Current candidate pages and tests are included. This confirms only the physical-size rule, not other PHDK Check criteria.

## Latest integrated candidate — 5.1.10

Date: 2026-10-13. Inventory covered all repository application/test files with extensions `.ts`, `.tsx`, `.js`, `.jsx`, `.html`, `.css`, `.mjs`, `.cjs`, and `.vue`; `node_modules`, generated `dist`, and `.git` were excluded. `rg --files` returned 1,086 source/test files. **0 files are at or above 600 lines.**

This check corrected the prior 5.1.5 report, which incorrectly claimed zero over-limit files. Six over-limit files found in the integrated 5.1.9 tree were split by responsibility: agent message contracts/trace metadata; device escalation handlers; voice WebRTC handlers; TTS HTTP providers; database backup storage; and the API-management regression harness. Dedicated synthetic regressions cover backup lifecycle/selection/restore and TTS request contracts. `browser/tests/renderer-module-boundaries.test.cjs` also retains its Browser-local 600-line assertion.

Evidence: repository-wide physical-line inventory, API build, API regression 14/14, Browser build and its line-boundary test. This is source/test-size compliance, not a claim that every large document or generated file follows the application-code rule.

---

Date: 2026-10-13. Candidate: 5.1.5 (`fc114099cd805dd90d8ba1f3bdcddbcb54d464ba`). Rule: all application source and test files remain below 600 physical lines, including blank lines. Inventory extensions: `.ts`, `.tsx`, `.js`, `.jsx`, `.html`, `.css`, `.mjs`, `.cjs`, `.vue`; generated, dependency and Git directories are excluded.

The prior audit counted only tracked files at that snapshot and missed one current Cloud source file at 612 lines. The flow-normalization types/helper now live in `cloud/src/services/decision-engine.flow-types.ts`, reducing `decision-engine.methods.ts` below the limit without changing its call contract. The broader inventory then found `services/api/test/regression/20-admin-boundaries.test.js` at 719 lines. Its authorization and management-policy suites are now split into `20-admin-boundaries.test.js` and `25-approved-management-policy.test.js` without changing assertions; both suites and the full API regression runner pass. Fresh inventory across 1,077 tracked and untracked application/test source files: **0 files at or above 600 lines**. Check remains partial for other findings even though the line-limit criterion passes.
