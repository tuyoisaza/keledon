# UAT cases — run 20261014-0007-phdk-auto-completion

Current candidate: KELEDON 5.1.26 on `fix/audited-uat-test-profiles`, based on `8dfc1fca7de253a017acb6f291ff278699915beb`. Source commit is `6a99281e8c74c5d40590aca146a03786324dc340`; post-commit UAT is recorded in `docs/phdk/evidence/uat-local-web.json`. All fixtures are synthetic; browser API requests are intercepted, external requests blocked, and API guard tests use isolated in-process fixtures.

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-001 | US-001 / anonymous, user | Open public/login, copy report, test denied clipboard, reset owned state, inspect 390px/200%-400% reflow and themes. | Safe report, truthful feedback, owned-state reset, responsive layout. | Local built SPA / Playwright, intercepted APIs | PASS, `docs/phdk/evidence/uat-local-web.json`. |
| UAT-002 | US-002 / admin, coordinator, superadmin | Exercise management, diagnostics and write-only provider replacement with synthetic tenants. | UI follows capability; secret fields remain blank and replacement-only. | Local built SPA; isolated API regressions | PASS in scoped UI/server tests; no real login. |
| UAT-003 | US-002 / cross-tenant and non-superadmin | Attempt cross-company IDs, stale actor, role/company escalation and low-role mutations. | DB-derived actor/tenant policy denies unauthorized access and mutations. | API regression / in-process Nest HTTP | PASS, API regression 20/20 suites; fixtures are isolated, no persistent DB. |
| UAT-004 | US-003 / integration administrator | Configure validated private HTTP(S) origin; attempt malformed, unlisted and cross-tenant targets. | Configured private origins are accepted only through tenant allowlist; unsafe inputs denied. | API/Cloud policy and Browser offline tests | PASS in source tests; no private destination contacted. |
| UAT-005 | US-004 / operator | Run deterministic synthetic call-command lifecycle through registered handlers and injected CRM adapter. | Valid sequence completes; failures remain explicit and safe. | Browser offline runtime tests | PASS, 27/27; no live call/provider. |
| UAT-006 | US-004 / desktop operator | Pair native Browser with test device; exercise OS media consent and audio lifecycle. | Permission and cleanup behavior works on supported device. | Native manual UAT | MANUAL/BLOCKED — device/audio environment unavailable. |
| UAT-007 | US-005 / release owner | Compare five package/lock roots and renderer version. | Candidate versions agree; release only after PR and remote readback. | Source/Git | PASS, candidate 5.1.26; PR/readback pending. |
| UAT-008 | US-002 / superadmin test operator | Select configured synthetic profile; test bounded session; return to original admin. | Server requires current DB superadmin; audited start/end; nonproduction-only, allowlisted, <=10 min, no persisted role change; return revokes token. | Local built SPA + isolated in-process Nest HTTP/regression tests | PASS, scoped. Browser UI uses mocked API; server audit/expiry/guard/revocation verified separately. |
| UAT-009 | US-002 / superadmin and test users | Authenticate to a safe development target with actual synthetic identities and verify roles. | Actual DB-backed access matches role policy; no production identity/data. | Development deployment | BLOCKED — no verified target or test identities configured. |
| UAT-010 | US-002 / data administrator | Run vendor-secret migration and persisted CRUD matrix on disposable DB. | Idempotent migration, safe projections and persisted role/tenant matrix. | Isolated disposable PostgreSQL DB | BLOCKED — no disposable DB configured; production DB excluded. |

## Historical records from earlier candidates

# UAT cases — latest local candidate 5.1.16

## Candidate 5.1.17 — current Auto continuation

Candidate: `fix/phdk-keledon-voice-profile-accessibility`, product source `4e874c14cde10fd5b1a0ce521ee097e67823e120`; all five app roots 5.1.17. Post-commit browser execution reran the exact suite and intercepted every API response; evidence is bound to that source SHA.

| Case | Story / actor | Preconditions and synthetic data | Actions / expected observable result | Channel | Result / evidence |
|---|---|---|---|---|---|
| UAT-T-008 | US-008 / Company administrator | Local built SPA; Company Co tenant fixture; API routes intercepted. | Voice-profile list failure shows retry; create submits only name/provider/language/enabled/default; detail shows safe display fields; edit submits no caller `companyId` or credential/config fields; synthetic 403 create/update/delete leaves records unchanged and shows visible `role=alert`; successful update/delete refreshes the list. | Local Edge/Playwright UI with synthetic API. | PASS 1/1 post-commit on `4e874c14cde10fd5b1a0ce521ee097e67823e120`; `docs/phdk/evidence/uat-local-web.json`; persistence is not inferred. |
| UAT-T-009 | US-007 / Company administrator | Local built SPA; synthetic Company Co brand/team/company records; API routes intercepted. | Labeled selectors create a KELEDON with exact service input shape, without caller `companyId` or stringified `uiInterfaces`; delete confirmation opens and cancel preserves the record. | Local Edge/Playwright UI with synthetic API. | PASS, `docs/phdk/evidence/uat-local-web.json`, `UAT_REPORT.md`; persistence is not inferred. |
| UAT-T-010 | US-007/US-008 / administrators and all app users | Built web SPA. | Trigger a localized failed mutation; a global Sonner notification is mounted and actionable failure feedback is also in the form dialog. | Local Edge/Playwright UI with synthetic API. | PASS for in-dialog voice-profile 403; app-wide notification renderer is source/build verified. Broader toast journeys not exercised. |

## Current continuation — 2026-10-13

Candidate branch `fix/phdk-route-accessibility-i18n` at `7ce3509aeb4d53ce3a90d16153996abf35446024`, based on fetched `origin/main` `c8534e6f6568922d540eabfba4abe90cc93749c1`. Built-SPA UAT uses Company Co synthetic fixtures and intercepted API/WebSocket traffic. UAT-T-005 covers dashboard/session/detail routes; UAT-T-007 covers profile role/date formatting in en/es/pt, translated device status/empty state, valid launcher navigation and API failure recovery. Diagnostics tests, SEO source test and web typecheck/build are recorded in `UAT_REPORT.md`; locale parity is checked separately. This scoped evidence does not close broad route accessibility/localization, persisted CRUD/migration, native device/audio or deployed SEO/AEO acceptance.

Prior UAT record: 2026-10-13; product PR #62 merged at `a806617f430d084831a079b92c821a694b925467`; local main was `0be102b8b7847bfed3441ff00e00ba4477c57a1e`. `npm run test:uat` passed 1/1 on the 5.1.10 bundle with synthetic fixtures and intercepted API/WebSocket traffic. API regression 14/14; Browser build/regression 24/24. Native Electron 44.7 launched and renderer loaded; see startup and media-permission cases below.

| Case / story | Acceptance | Latest result |
|---|---|---|
| UAT-T-005-DASHBOARD / J-005 | Spanish dashboard empty/completed-session states, English/Portuguese greeting and metrics, and accessible table caption/headers | PASS in local production SPA with synthetic identity and intercepted APIs; not backend or screen-reader acceptance. |
| UAT-T-005-SESSIONS / J-006 | Spanish live/history and call-monitor copy, superadmin filter labels, statuses, accessible tables and detail action | PASS in local production SPA with synthetic identity and intercepted APIs; no live call or backend authorization inferred. |
| UAT-T-007-PROFILE-DEVICES / J-007 | Profile role/date formatting in en/es/pt; Spanish device status, empty state, localized launcher navigation and API errors/retry | PASS in local production SPA with synthetic identity and intercepted APIs; native pairing is not inferred. |
| UAT-T-005-SESSIONS / J-008 | Session-detail copy, session ID and accessible return link | PASS in local production SPA with synthetic sessions; recordings/transcripts remain placeholders. |
| UAT-001/UAT-002/UAT-004/UAT-006 | Current diagnostics widget and selected public/login/admin journeys, widget actions, themes, narrow viewport, role controls and safe diagnostics | PASS, local UI subset, synthetic fixtures; APIs intercepted. Evidence: `docs/phdk/evidence/uat-local-web.json` and screenshots. |
| UAT-API / US-004 | Current DB-derived role/company/team/session checks, startup fail-closed behavior, and selected cross-tenant denials | PASS, API regression 14/14 with isolated doubles; not persisted acceptance. |
| UAT-BROWSER-PERMISSION / US-002/US-003 | Per-origin HTTPS media consent; deny other permissions; remember grants only for session; reject stale navigation | PASS, unit/policy contract tests; native dialog itself not exercised. |
| UAT-ROLE/UAT-CRUD | Full persisted resource × role × tenant × operation matrix and migration ledger | BLOCKED: no isolated PostgreSQL runtime; PHDK scope prohibits provisioning/administering it in this run. |
| UAT-ELECTRON-STARTUP | Native app startup, renderer, widget and version | PASS: Electron 44.7.0 and renderer v5.1.10 launched; screenshots under `docs/phdk/evidence/`. |
| UAT-ELECTRON-PERMISSION/UAT-DEVICE-AUDIO | Native media dialog, OS permission, device and call/audio lifecycle | BLOCKED/NOT TESTED: native UI controller unavailable; no permission was granted and no client call. Unit policy tests pass; physical audio not exercised. |
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
