# UAT cases — integrated 5.1.7 plus 5.1.8 API security regression

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
