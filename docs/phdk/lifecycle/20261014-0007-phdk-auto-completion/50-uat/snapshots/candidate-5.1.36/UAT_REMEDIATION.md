# UAT remediation — run `20261013-1900-phdk-auto`

## Candidate 5.1.36 — Device management source finding

- Finding: Check source review found no manager revoke affordance on `/devices` although a tenant-scoped API operation existed; the registration guard could also bind an actor with no company, creating an unpairable pending row.
- Expected: tenant managers can deliberately revoke their company's device; users/agents remain read-only; registration requires a database-derived company binding and cannot use caller-supplied IDs.
- Repair: added an EN/ES/PT accessible confirmation modal using `ManagementModal`, exposes the action only to admin/coordinator/superadmin, removes the device after success, and keeps retryable visible errors. API guard now denies company-less registration and derives identity from the current DB actor.
- Retest: API regression 21 and all 35 API regression suites pass; local production-SPA UAT 2/2 covers user denial, admin cancel, failed request and successful revoke. API build, Web typecheck/build, focused lint and PHDK coherence 52/52 pass.
- Limits: synthetic UI and isolated guard evidence only; persistent DB, real device and pairing lifecycle remain untested. No original UAT failure was overwritten; this is a Check-discovered source issue.

## Defect 1 — stale candidate version in synthetic device fixture

- Expected: local UAT candidate at 5.1.17 reports device fixture version in sync with package.
- Observed: the built 5.1.17 diagnostics row showed the hard-coded 5.1.16 device record; this did not identify a product version-source bug, but made the fixture stale.
- Root cause: `services/web/test/local-uat.test.cjs` pinned device `version` to 5.1.16.
- Repair: derive fixture version from `package.json` `appVersion`.
- Risk: test-only, no product payload changes.
- Retest: clean web build followed by `npm run test:uat`; passed 1/1 after correction.

## Defect 2 — mutation errors were not visible

- Expected: failed voice-profile create/delete shows an actionable error and does not report success.
- Observed: no `Toaster` component was mounted in `App.tsx`, so existing `toast.error()` calls could not render; the first UAT waited for the Spanish create-error message and timed out.
- Root cause: `sonner` API calls existed but their global renderer was absent.
- Repair: mount global `<Toaster position="top-right" richColors />`; keep persistent, dialog-scoped `role="alert"` messages for Voice Profile create/delete failures; UAT asserts visible failure/no record mutation for synthetic 403 and success paths for 200/204.
- Risk: notifications are now visible app-wide and may reveal existing untranslated legacy toast copy; broader route localization remains in Check backlog. No auth/data policy changed.
- Retest: web typecheck, focused ESLint, production build and Company Co local UAT pass 1/1.

Historical initial failure output is summarized here; final run evidence is recorded separately and remains bound to the uncommitted 5.1.17 working tree until post-commit retest.


## Historical records from earlier candidates

# UAT remediation — run `20261013-1900-phdk-auto`

## Defect 1 — stale candidate version in synthetic device fixture

- Expected: local UAT candidate at 5.1.17 reports device fixture version in sync with package.
- Observed: the built 5.1.17 diagnostics row showed the hard-coded 5.1.16 device record; this did not identify a product version-source bug, but made the fixture stale.
- Root cause: `services/web/test/local-uat.test.cjs` pinned device `version` to 5.1.16.
- Repair: derive fixture version from `package.json` `appVersion`.
- Risk: test-only, no product payload changes.
- Retest: clean web build followed by `npm run test:uat`; passed 1/1 after correction.

## Defect 2 — mutation errors were not visible

- Expected: failed voice-profile create/delete shows an actionable error and does not report success.
- Observed: no `Toaster` component was mounted in `App.tsx`, so existing `toast.error()` calls could not render; the first UAT waited for the Spanish create-error message and timed out.
- Root cause: `sonner` API calls existed but their global renderer was absent.
- Repair: mount global `<Toaster position="top-right" richColors />`; keep persistent, dialog-scoped `role="alert"` messages for Voice Profile create/delete failures; UAT asserts visible failure/no record mutation for synthetic 403 and success paths for 200/204.
- Risk: notifications are now visible app-wide and may reveal existing untranslated legacy toast copy; broader route localization remains in Check backlog. No auth/data policy changed.
- Retest: web typecheck, focused ESLint, production build and Company Co local UAT pass 1/1.

Historical initial failure output is summarized here; final run evidence is recorded separately and remains bound to the uncommitted 5.1.17 working tree until post-commit retest.
