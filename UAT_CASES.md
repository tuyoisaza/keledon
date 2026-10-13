# UAT cases — latest local candidate 5.1.10

Latest run: 2026-10-13; candidate branch `v5.1.10-browser-permission-consent`, based on `origin/main` `f5b9e43bd272408b3b5493c6eddfd24fc2095c75`; not yet committed/merged. `npm run test:uat` passes 1/1 suite on the current 5.1.10 production bundle with synthetic Company Co fixtures and intercepted API/WebSocket traffic. API regression passes 14/14; Browser build/regression 24/24. The native Electron launch was stopped when its missing runtime began downloading; no native UAT is claimed.

| Case / story | Acceptance | Latest result |
|---|---|---|
| UAT-001/UAT-002/UAT-004/UAT-006 | Current diagnostics widget and selected public/login/admin journeys, widget actions, themes, narrow viewport, role controls and safe diagnostics | PASS, local UI subset, synthetic fixtures; APIs intercepted. Evidence: `docs/phdk/evidence/uat-local-web.json` and screenshots. |
| UAT-API / US-004 | Current DB-derived role/company/team/session checks, startup fail-closed behavior, and selected cross-tenant denials | PASS, API regression 14/14 with isolated doubles; not persisted acceptance. |
| UAT-BROWSER-PERMISSION / US-002/US-003 | Per-origin HTTPS media consent; deny other permissions; remember grants only for session; reject stale navigation | PASS, unit/policy contract tests; native dialog itself not exercised. |
| UAT-ROLE/UAT-CRUD | Full persisted resource × role × tenant × operation matrix and migration ledger | BLOCKED: no isolated PostgreSQL runtime; PHDK scope prohibits provisioning/administering it in this run. |
| UAT-ELECTRON/UAT-DEVICE-AUDIO | Native render, OS permission decision, device and call/audio lifecycle | MANUAL/BLOCKED: Electron runtime download requires owner action-time authorization; no physical audio/client call. |
| UAT-A11Y-I18N | Broad screen-reader, 200%/400% zoom, contrast and en/es/pt route review | ACCEPTANCE INCOMPLETE: selected keyboard/focus/theme/mobile flows passed only. |
| UAT-SEO-AEO | Local source route/indexability/content controls | SOURCE PASS; deployed headers, crawler behavior, field metrics and answer-engine citations remain NOT MEASURED. |
| UAT-CLIENT-CRM | Tenant-specific live telephony/CRM workflow | NOT APPLICABLE to universal flow; vendors are client-selected. |

No in-scope source FAIL remains in the tests executed. Overall UAT is **ACCEPTANCE INCOMPLETE**; full action cards are in `UAT_REPORT.md`.

---

Latest source regression: PR #58, version 5.1.9, product merge SHA `6d0112dd940c142c20b5e4c56c766da64d000b3b`; PHDK handoff PRs #59 and #60 are also merged on `main`. API regression is 12/12, including operational tenant-boundary checks. This does not constitute a new browser journey; the local Edge journey below remains bound to its recorded 5.1.7 source revision. The exact current `main` SHA is in `PHDK_DELIVERY_EVIDENCE.json`.

Current evidence revision: `edce7eafbe13ac16ab93274a87e12571e7b04b2e`; verified remote main `a854ca7634307538305cd9b5ad1f91f8a066b1a1`; identical Git tree. Environment: local built web SPA in headless Edge with Company Co/Other Co synthetic fixtures, blocked external network and intercepted APIs. Full details and actions: `UAT_REPORT.md`.

| Case / story | Acceptance | Result |
|---|---|---|
| UAT-001 / US-001 | Candidate package/lock version and target PR/SHA reconciliation | PASS, scoped; PR #56 merged at `f44f76a8bfb46e4ef60bfbe99982a8d787bc00a6`, all five app roots 5.1.8. The local browser journey remains bound to verified 5.1.7 source tree. |
| UAT-002 / US-002 | Anonymous public home/login widget, exact compact version→clipboard→trash row, successful and failed copy, app-owned reset, foreign state preserved, 390px layout | PASS in current local Edge UAT; home/login mounts observed; click paths exercised on login. |
| UAT-003 / US-003 | Provider-independent voice→Cloud→Browser execution contracts and safe failure behavior | PASS in isolated API/Cloud/Browser regression contracts; no live vendor or audio call. |
| UAT-004 / US-004 | Selected admin/coordinator/superadmin tenant controls; user creation/reassignment; secret replacement without response prefill | PASS in mocked UI journeys plus isolated Nest guards/regressions; persistence and complete operation matrix remain open. |
| UAT-004-CREDENTIAL / US-004 | User CRUD cannot accept client-supplied password hashes on create/update, for any role | PASS in API guard regression integrated by PR #56 (admin/coordinator POST+PUT; superadmin POST). Source/API test only; persistence remains open. |
| UAT-005 / US-003 | Startup migration/count failures stop before seeding/server, no automatic rollback | PASS, API regression suite 11/11. |
| UAT-006 / US-002 | Diagnostics debug-off privacy, protected read, safe explicit probe and manual-only CRM control | PASS in mocked UI + isolated API contract tests; not deployed behavior. |
| UAT-THEME / US-006 | Login shell dark/light/corporate selection and persistence | PASS for executed shell. |
| UAT-ACCESS / US-006 | Company-detail dialog keyboard/focus and 390px login reflow | PASS for exercised subset only. |
| UAT-CRUD / US-004 | Complete persisted CRUD × resource × role × tenant × surface, detail, negative direct-ID and migration ledger | BLOCKED: no isolated PostgreSQL runtime/DB-backed test identities. Exact action in `UAT_REPORT.md`. |
| UAT-ROLE / US-004 | Real DB-derived role and tenant sessions across full matrix | BLOCKED: synthetic frontend role contexts and fake-Prisma tests are not end-to-end auth sessions. |
| UAT-ELECTRON / US-002/US-006 | Native Electron render, device, microphone/audio and recovery | MANUAL: requires Windows device/runtime acceptance. |
| UAT-A11Y-I18N / US-006 | Broad active-route locale/copy, WCAG keyboard/zoom/contrast/screen-reader acceptance | BLOCKED: only selected UI subset was exercised. |
| UAT-SEO-AEO / US-001/US-006 | Deployed headers and public discovery evidence | BLOCKED: no deployed target/measurement. |
| UAT-CLIENT-CRM / US-003 | Tenant-selected real call/CRM integration | NOT APPLICABLE to universal source gate; validate only when a client/provider is selected. |
