# PHDK Lifecycle Handoff — UAT Fix

## 5.1.23 candidate

UAT exposed one release hygiene issue after the five-root version bump: the Electron renderer still displayed v5.1.22. `browser/scripts/sync-renderer-version.js` synchronized the source widget to v5.1.23. Browser build and renderer-boundary/version-action tests pass; exact-SHA Web UAT then passes on `0e724bfe1fec269ad6037104ad0a01e474172b93`.

## 2026-10-14 integrated-source fixes

The native Browser version/action row now follows package version on standard build/start/make commands, uses the runtime Electron version, assembles allowlisted diagnostics, checks reset acknowledgements and reloads only after success is visible. Packaged debug mode defaults off, the console waits for main-process authorization, and no renderer setter remains. Web/Landing now reload anonymous clients after successful owned-state reset; authenticated clients navigate to login after the success interval. Focused Browser tests 5/5, Web widget/diagnostics tests 17/17, Browser build, and Web/ Landing build/typecheck pass. Integrated main is 5.1.22 at `48ab2023236ba5de56c046f99670a2abab866707`. Native visual/runtime UAT remains BLOCKED.

Run ID: `20261013-1900-phdk-auto`
Stage: 60-uat-fix
Status: COMPLETED
Started from revision: dirty 5.1.17 candidate on base `60d7382f0e2003597690673103ace4e785f0c018`
Completed at revision/worktree: same candidate
Date/time: 2026-10-13 America/Mexico_City

## Goal / scope
Repair in-scope UAT defects and repeat impacted cases.

## Inputs verified
UAT report/cases and the two exact failures recorded during the current run.

## Work performed
- Made synthetic device fixture version derive from current package version.
- Mounted global Sonner Toaster and added visible in-dialog Voice Profile mutation error alerts.
- Rebuilt and reran local web UAT after product/test fixes.

## Deliverables
`UAT_REMEDIATION.md`, `UAT_RETEST_REPORT.md`, `UX_UI_REMEDIATION_REPORT.md`, updated UAT artifacts; snapshots included here.

## Exit gate
- [x] Impacted local UAT: 1/1 passes; 14 journey groups logged.
- [x] API/web/error behavior truthfully reflected; no false success on synthetic 403.
- [x] Remaining blockers have specific responsible actor, environment, steps and evidence.

## Decisions / assumptions
App-wide Toaster makes existing notification calls render. Broader untranslated legacy toast copy is tracked for Check.

## Risks / blockers
The UAT evidence still ran against an uncommitted working tree and is not bound to a source commit. Repeat after code commit. No database or native media acceptance.

## Evidence
Web typecheck, focused ESLint, build, UAT 1/1; `UAT_RETEST_REPORT.md`.

## Next stage
Stage: SEO. Read the exact UAT/UAT Fix handoffs, inspect public/private source metadata and all 25 controls, run source tests without browser or live probes.
