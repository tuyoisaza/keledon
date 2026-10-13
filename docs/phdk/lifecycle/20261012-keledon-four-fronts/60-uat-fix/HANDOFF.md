# PHDK Lifecycle Handoff — UAT Fix

Run ID: `20261012-keledon-four-fronts`
Stage: `60-uat-fix`
Status: `SCOPED PASS — diagnostics fixes and current-candidate user-management restriction retested; broader product acceptance remains partial`
Candidate: `74c849effa6ecb1c9e33790e2387a70c4afa4079`
Date: `2026-10-13 America/Mexico_City`

## Reproduced failures and disposition

- Stale local test expected diagnostics clipboard output to be JSON. Product correctly emits a formatted, redacted report; corrected the test to assert its displayed version.
- Playwright attempted to click a screen-reader-only checkbox whose visible switch thumb receives pointer events. Changed UAT interaction to click the visible label/control and assert the checkbox state.
- Rebuilt production SPA and reran `npm run test:uat`; Edge UAT passes 1/1 with no failures, including the newly covered diagnostics flow.
- Visual screenshot review found the global floating debug panel covered navigation on the dedicated `/management/debug` page. It now hides only on that route; the rerun assertion and screenshot confirm all diagnostic controls stay unobstructed.
- No new product defect reproduced in this UAT-Fix pass. Earlier product remediations remain in `UAT_REMEDIATION.md` and `UAT_RETEST_REPORT.md`.
- Current-candidate synthetic browser retest verified that a Company Co admin sees no role/company assignment controls, sees only Company Co brand/team options, and submits a payload without role/company/brand fields; superadmin controls remain visible. Details and exact observed payload: `MANAGEMENT_USERS_RETEST.md`.

## Exit gate

- [x] Fix each currently reproduced harness failure and rerun the complete scoped browser suite.
- [x] Record generated evidence and preserve synthetic-only boundaries.
- [ ] Broader backend role/resource CRUD, Electron, full accessibility, deployment header and complete localization gaps remain open for Check; the scoped browser retest does not establish those behaviors.

## Evidence

`services/web/test/local-uat.test.cjs`, `services/web/package.json`, `services/web/dist` build output, `docs/phdk/evidence/uat-local-web.json`, `docs/phdk/evidence/uat-admin-endpoint-diagnostics.png`, and `MANAGEMENT_USERS_RETEST.md`.

## Next stage

Return to `70-check` and reconcile this retest with the full CRUD, accessibility, localization and deployment evidence limits.

## 5.1.7 integrated rerun

`services/web npm run test:uat` passes on the current 5.1.7 tree (same Git tree as remote main); diagnostics tests pass 18/18 and API regressions 11/11. No new UAT FAIL was reproduced, so no further product fix was indicated by this rerun. Acceptance remains incomplete for the exact CRUD/role DB matrix, native Electron/device/audio, broad accessibility/localization and deployed SEO/AEO. See current root UAT report for owner/runtime actions.
