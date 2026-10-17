# UAT Fix revalidation — v5.2.7 / UAT-130 (2026-10-17)

UAT-130 found no regression in the deployed public Web copy action: production announced “Diagnóstico copiado”. Source review confirms Landing now withholds API/OAuth hostnames. No product code repair is indicated by the Web journey. UAT remains acceptance-incomplete because Railway deploys only `services/web` and API; it has no Landing service, so the fixed `landing/` package has not received runtime acceptance. Required follow-up: identify the authoritative customer-facing Landing production URL/deployment and verify it runs this merged main revision; then repeat UAT-130's anonymous copy-status check without reading clipboard contents.

No authenticated/runtime testing was attempted. CMT-003/004 remain subject to the existing PHDK-compliant synthetic identity/tenant/device/CRM sandbox and cleanup blocker. App tests/builds remain unrun locally per owner instruction. Historical remediation below is retained as prior work.

---

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
