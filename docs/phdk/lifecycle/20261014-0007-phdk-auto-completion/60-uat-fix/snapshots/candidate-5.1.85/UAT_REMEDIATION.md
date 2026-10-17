# UX/UI Remediation — candidate 5.1.85

Finding UX-A11Y-025 / CHK-AUTO-025: Web and Landing agent cards used pointer-only click handlers on div elements. Replaced that interaction with a native selection button per card, explicit accessible name, aria-pressed state, visible Selected label, focus ring and 44px minimum hit size.

Retest: services/web/test/agent-selection-accessibility.test.cjs passes 2/2. Web and Landing production builds, typechecks and lint pass; local built Web candidate navigation passes. The authenticated dashboard card and screen-reader journey could not be exercised without a safe synthetic socket fixture and remain MANUAL.

SIGUIENTE PASO: resume the populated-card keyboard and screen-reader retest when the synthetic fixture is available.

---
# UAT remediation — run `20261013-1900-phdk-auto`

## Candidate 5.1.73 — AI workflow UAT fixture missing managed metadata (RESOLVED)

- Finding: after the AI workflow editor added required input/output/hop metadata, UAT-084's synthetic prompt omitted those fields, so the browser correctly rejected its draft before testing the stale-revision case.
- Repair: update the synthetic managed prompt with a typed input source/sensitivity, owning feature/callsite, output destination and empty next-hop list.
- Retest: `services/web npm run test:uat` passes 7/7, then the theme-template UAT and AI-admin UAT both pass; no API/provider call or external request was used.
- Status: RESOLVED for the synthetic UAT fixture; real database metadata and full workflow execution remain unverified.

## Candidate 5.1.73 — independent template previews and corporate fallback (RESOLVED FOR SELECTED UAT)

- Finding: each template card used global active-theme variables, so the three cards could display the same current theme instead of previewing their own preset. Cancel also restored form state without restoring the rendered preview.
- Repair: bind each real component preview to its own editable semantic palette; Cancel reapplies the saved configuration.
- Retest: production-built UAT-085 passes preview distinction, edit/cancel/save, stored fixture reload, corporate selection fallback, retained superadmin editing and tenant-admin denial (12 assertions).
- Status: RESOLVED for selected synthetic UI states; DB persistence/restart, complete contrast matrix, mobile admin layout and broader assistive-technology acceptance remain open.

## Candidate 5.1.73 — legacy flow assignment view lost the saved record (RESOLVED)

- Finding: UAT-081's first production-built browser run assigned an unowned legacy flow to a selected company, but the editor remained in the legacy-only view; after the successful save response, the flow disappeared from the visible list.
- Expected: after a superadmin assigns a legacy definition to a company, the editor should open that company's view and retain the saved definition as the selected item.
- Root cause: the save handler reloaded with the old `__legacy__` scope after changing the record's company, so the newly assigned flow no longer matched the view filter.
- Repair: let the loader accept an explicit company scope; after a successful legacy assignment, switch to the target company and read the saved definition there.
- Retest: production Web build and UAT-081 superadmin tenant-switch/definition CRUD/version approval/availability/mapping/legacy reassignment journey PASS; existing tenant-admin flow-editor journey PASS. UAT-083 then passed 24 HTTP assertions in each backend against separate disposable PostgreSQL databases, including DB-derived superadmin scope and persisted cross-company definition, version, availability, mapping and legacy assignment operations.
- Status: RESOLVED for the covered superadmin Web and API slice. Web authentication and the remaining roles/operations stay open in the CRUD matrix.

## Candidate 5.1.66 — mobile flow editor shell (RESOLVED)

- Finding: UAT screenshot at 390×844 showed the desktop sidebar held a 224px column beside the content, leaving the management flow editor too narrow.
- Expected: the tenant manager can reach navigation and edit flow configuration on a narrow phone viewport without losing actions or horizontal page overflow.
- Root cause: `AppLayout` was permanently a horizontal split and `Sidebar` never switched to a mobile layout.
- Repair: use a compact mobile header with the same diagnostics/version controls, horizontally scrollable primary navigation, visible user/role and logout control; keep the desktop sidebar at the medium breakpoint and above. App content uses the full viewport width with mobile padding.
- Retest: the production-built flow editor UAT runs creation/version/availability/mapping actions by keyboard, verifies no document overflow at 390px, and captures desktop/mobile screenshots; Web lint, typecheck, build and full `npm run test:uat` pass.
- Status: RESOLVED for the tested editor journey. Screen-reader and all-route mobile acceptance remain open.

## Candidate 5.1.66 — legacy importer company ownership (RESOLVED)

- Finding: deriving tenant permissions from stale company IDs in the legacy JSON could conflict with the actual database owner of a definition skipped during idempotent import.
- Expected: import must use the persisted definition's company before writing versions, availability or intent mappings.
- Root cause: the importer built its flow-to-company map from file contents after `createMany(skipDuplicates)`.
- Repair: read persisted definition IDs/company IDs back from Prisma after import, then use that map to filter versions, permissions and intent mappings. Add API/Cloud regression cases for a stale foreign company hint.
- Retest: API flow persistence tests 8/8 and Cloud 7/7; full API/Cloud regression suites pass. No database execution is claimed.
- Status: RESOLVED in source; isolated migration/import acceptance remains BLOCKED under UAT-060.

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
