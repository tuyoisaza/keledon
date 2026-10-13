# UAT report — KELEDON 5.1.7 (continuation)

## Latest local candidate — 5.1.14 (scoped UAT pass; overall acceptance incomplete)

Run: local production web UAT on the 5.1.14 Vite build, 2026-10-13. The existing synthetic Company Co fixture intercepted every API route and external requests/WebSockets were blocked. The 1/1 UAT suite passes for Spanish companies, brands, teams, users and vendors search/screens; manager user creation/update still omits role/company controls and payload fields and excludes foreign-company teams. Spanish provider settings and write-only key behavior also pass: saved keys are not prefilled, replacement clears after save, and untouched keys are omitted. Theme/widget, role-fixture and safe-diagnostics cases in the same suite also pass; these are UI-only results. This does not establish persistence, backend auth (covered by separate API regression 14/14), whole-app localization/accessibility or client-specific live CRM/telephony behavior.

`services/web` typecheck and production build pass. English, Spanish and Portuguese catalogs have identical 404-key sets. API regression passes 14/14; focused AI administration contracts pass 6/6. No database, provider, CRM, customer record, native device or deployed endpoint was contacted. This closes provider-page localization evidence for the tested Spanish route only; whole-app locale and accessibility acceptance remain incomplete. Per-client telephony/CRM selection remains outside the common-flow test.

## Latest local candidate — 5.1.10 (ACCEPTANCE INCOMPLETE)

Run: `20261013-keledon-v5110` (continuation of `20261012-keledon-four-fronts`), 2026-10-13. Source delivered by PR #62 (squash merge `a806617f430d084831a079b92c821a694b925467`); the verified local main checkout is `0be102b8b7847bfed3441ff00e00ba4477c57a1e`. The five app package roots are 5.1.10. Intent and roles remain the four owner-confirmed fronts; client telephony/CRM systems are tenant-selected.

The built web SPA UAT was rerun on the 5.1.10 bundle in headless Microsoft Edge. It passed 1/1 suite and exercised the synthetic Company Co public/login widget, themes, 390px layout, role views, keyboard/focus for selected dialogs, same-company user assignment, write-only provider keys, guest denial, and safe diagnostics. APIs and WebSockets were intercepted/blocked; this proves local UI behavior only. API regression passes 14/14 and includes the DB-derived authorization/startup cases, but does not prove persisted CRUD.

Additional same-candidate results: Browser unit/source regression 24/24 and TypeScript build pass. `permission-policy.test.cjs` verifies secure origin matching, user consent/session scope, denial of other permissions, rejection on navigation, and English/Spanish prompt copy. After owner authorization, `npm run dev` launched Electron 44.7.0. Startup logs and renderer screenshot show KELEDON Browser v5.1.10 ready with home/widget loaded. Native media/OS permission and physical audio remain untested because native app control is unavailable on this host. See UAT-ELECTRON-STARTUP below.

| Case | Result | Evidence / limitation |
|---|---|---|
| UAT-001 / UAT-002 / UAT-004 / UAT-006 | PASS (local UI subset) | `npm run test:uat`: 1/1 suite; updated `docs/phdk/evidence/uat-local-web.json` and `uat-*.png`; all API routes mocked, external HTTP/WebSockets blocked. |
| UAT-API | PASS (isolated source regression) | `services/api npm run test:regression`: 14/14; no PostgreSQL connection or persistent CRUD acceptance. |
| UAT-BROWSER-PERMISSION | PASS (policy contracts) | `browser/tests/permission-policy.test.cjs`: user consent, HTTPS origin/context, media-only session grant, navigation race and deny behavior. No native dialog was clicked. |
| UAT-ELECTRON-STARTUP | PASS (native renderer) | Electron 44.7.0 launched; v5.1.10 home/widget loaded. `docs/phdk/evidence/uat-browser-native-initial.png`. |
| UAT-ROLE / UAT-CRUD | BLOCKED | Full DB-derived identities, persisted CRUD matrix and migration ledger cannot be verified: no isolated PostgreSQL runtime is available, and PHDK execution scope prohibits provisioning/administering one in this run. |
| UAT-ELECTRON-PERMISSION / UAT-DEVICE-AUDIO | BLOCKED / NOT TESTED | Native app control unavailable (`Trusted RPC service is not configured`; no native apps enumerated). No media permission was granted, no device/audio test or customer call. |
| UAT-A11Y-I18N | ACCEPTANCE INCOMPLETE | Selected keyboard, focus restoration, theme, mobile and diagnostics flows pass; full route/role screen-reader, 200%/400% zoom, contrast and translated-copy acceptance remain. |
| UAT-SEO-AEO | SOURCE PASS / FIELD BLOCKED | Source metadata/routes/copy/link tests pass. Deployed headers, crawl/render behavior, field performance and external discovery/citations are not measured. |
| UAT-CLIENT-CRM | NOT APPLICABLE to common flow | User confirmed integrations vary by client; only provider-independent contracts were tested, with synthetic fixtures. |

### Action plan

- **UAT-ROLE / UAT-CRUD:** persisted evidence needs an owner-managed disposable PostgreSQL environment with Company Co-only synthetic fixtures and isolated role accounts. PHDK must not create/administer the database in this run. After the environment is prepared through the owner’s permitted process, record each resource × role × tenant × operation result and migration ledger; reconcile whether the current execution scope permits any connection before attempting it.
- **UAT-ELECTRON-PERMISSION / UAT-DEVICE-AUDIO:** runtime launch and renderer startup now pass. This host cannot target native windows, so the in-app media dialog could not be inspected or exercised; no mic/camera permission was granted. Retest when Windows app control is available, and obtain separate action-time consent before any OS microphone/camera grant. Never place a client call.
- **UAT-A11Y-I18N:** a human reviewer with an approved screen reader should check representative public/login/app/admin routes, roles, themes and en/es/pt at 200% and 400% zoom and with keyboard-only navigation; report exact route/control and observed result so source defects can be fixed and retested.
- **UAT-SEO-AEO:** deployed measurement remains outside this code UAT; after an authorized deployment/status target is supplied, use only the existing bounded read-only evidence route permitted by PHDK. Do not probe the application or infer indexation from source.

No source-code FAIL remains in the tests that ran. **Acceptance remains INCOMPLETE** because persistence, native/device, broad a11y/i18n and deployed discovery are not proven. No customer/provider/production call, database mutation, migration, paid model, email, or deployment was performed.

---

### 5.1.9 operational authorization regression

PR #58 integrates version 5.1.9 at `6d0112dd940c142c20b5e4c56c766da64d000b3b`. The 12-suite API regression now includes DB-derived escalation actor/company/team/session scope, cross-tenant and low-role denials, current-DB superadmin checks for global analytics/dashboard/RBAC, and authenticated listening-session routes with UUID-strength capabilities and expiry. API build/typecheck passes and touched-file ESLint exits 0 with 15 existing warnings. This is isolated source/API regression evidence; the Edge journey below remains on its recorded 5.1.7 tree, and persisted CRUD/runtime and device acceptance remain incomplete.

### 5.1.8 API security follow-up

The subsequent code audit identified generic user CRUD accepting caller-provided password hashes. PR #56 integrates 5.1.8 at `f44f76a8bfb46e4ef60bfbe99982a8d787bc00a6`, removes that input, and passes source regressions for admin/coordinator create/update and superadmin create attempts. This is backend regression evidence, not a second browser UAT: the local Edge journeys below remain explicitly bound to the 5.1.7 revision. Full database-backed CRUD acceptance remains blocked as described below.

Run `20261012-keledon-four-fronts`; executed 2026-10-13 in America/Mexico_City. Test source revision: `edce7eafbe13ac16ab93274a87e12571e7b04b2e`; its Git tree exactly matches independently fetched `origin/main` `a854ca7634307538305cd9b5ad1f91f8a066b1a1` (tree `a77afde0f6142583887921fe46376b84cf3af279`). Candidate/version: 5.1.7. The production Vite bundle was rebuilt, then exercised in headless Microsoft Edge through a finite local server. External HTTP and all WebSockets were blocked; `/api` calls were intercepted with synthetic Company Co/Other Co fixtures. No deployed service, account, database, OAuth provider, vendor, customer record or metered API was contacted.

Intent alignment: `PROJECT_INTENT.md` INT-001..003 and `REQUIREMENTS_TRACEABILITY.md` FR-001..004, SEC-001..003, NFR-001..002. Stories US-001..006 in `UAT_STORIES.md` trace to the four confirmed fronts. The owner has confirmed call/CRM vendors are client-selected; source acceptance stays provider-independent, and no client vendor is being treated as universal.

## Executed results

| Case | Result | Evidence |
|---|---|---|
| UAT-001 baseline/version, widget identity, compact size and remote version alignment | PASS (scoped) | `docs/phdk/evidence/uat-local-web.json`; current main SHA/version readback; visible row measured 12px/28×28/14px/4px. |
| UAT-002 anonymous login/home diagnostics actions | PASS (local UI) | Headless Edge: copy payload/version, green check only on success, failure leaves original icon, owned cache/storage reset preserves foreign state, 390px login; public home and login each mount one row. Screenshots under `docs/phdk/evidence/uat-login-*.png`. |
| UAT-003 provider-independent voice/cloud/browser contracts | PASS (isolated source contracts) | Existing Cloud/API/Browser regression suites; no live call, external provider or client CRM was exercised. |
| UAT-004 selected administration policy journeys | PASS (UI fixture + isolated API tests) | Admin user create/update payload omits role/company, foreign team excluded, superadmin role/company controls remain, provider key is write-only in UI; Nest HTTP/regression suite exercises selected authorization negatives. Not a persisted DB matrix. |
| UAT-005 fail-closed API startup | PASS (isolated regression) | `services/api npm run test:regression`: 11/11 suites, including migration/count failure exits before seed/server and no rollback resolution. |
| UAT-006 diagnostics access and probe control | PASS (mocked UI + isolated API) | Debug off causes no deep read; enabled diagnostics read once; safe probe requires click; manual-only CRM endpoint has no probe button; isolated API tests cover actor/role response filtering. |
| UAT-THEME / UAT-ACCESS | PASS for exercised subset | Login shell dark/light/corporate persistence; company detail keyboard, Escape/focus restoration and visible controls. This is not full app contrast, zoom, screen-reader or locale-flow certification. |
| UAT-CRUD / UAT-ROLE | BLOCKED / ACCEPTANCE INCOMPLETE | No local Docker/PostgreSQL service and no DB-backed isolated identity sessions; current fake-Prisma tests do not prove persistence or the full matrix. |
| UAT-ELECTRON | MANUAL | Browser package regression/build is not native rendering, device, microphone or audio acceptance. |
| UAT-A11Y-I18N | BLOCKED / ACCEPTANCE INCOMPLETE | Current journey covers 390px, selected keyboard/focus, and en/es/pt catalog parity; broad route, zoom, contrast, screen-reader and translated-copy review remains. |
| UAT-SEO-AEO | BLOCKED / ACCEPTANCE INCOMPLETE | Source SEO regression passes, but deployed headers and external discovery/citation are unverified. |
| UAT-CLIENT-CRM | NOT APPLICABLE to universal acceptance | No client/provider is selected. Per owner direction, validate each tenant's configured provider when that client scope exists; provider-independent contracts are checked here. |

`services/web`: `npm run build` PASS; `npm run test:uat` PASS (1 suite / 1 test, nine journey assertions groups); `npm run test:diagnostics` PASS (18/18). `services/api npm run test:regression` PASS (11/11). The diagnostics test script is not present in the separate `landing` package; it imports source mirrored from web, whose cross-package parity assertion passed. The landing package's prior typecheck/build/lint remain the available evidence for that app.

## Acceptance blockers and exact actions

- **UAT-CRUD / UAT-ROLE** — missing isolated PostgreSQL-backed test environment and provisioned synthetic identities. Owner/runtime action: provide an isolated disposable PostgreSQL/staging environment with Company Co-only fixture data and test accounts for user, coordinator, admin and superadmin; keep credentials in the environment, never in chat/artifacts. Then exercise list/detail/create/update/delete-or-documented-immutable behavior, cross-tenant direct IDs, migration ledger and role revocation; attach per-case evidence, cleanup result and rerun `services/api npm run test:regression` plus the browser UAT. PHDK can prepare code/tests now; persistence acceptance cannot be performed with the current environment.
- **UAT-ELECTRON** — requires a Windows Electron run with an available device/microphone and permitted local test backend. Human/runtime action: launch the 5.1.7 package on a test workstation, verify widget and device permission/audio start-stop/error/recovery without placing a customer call; record OS/device, steps and redacted screenshots/logs; then rerun Browser regression/build. PHDK cannot produce physical-device evidence from this headless SPA run.
- **UAT-A11Y-I18N** — broad manual accessibility and active-route copy review remains. Reviewer action: test full app at 200%/400% zoom, keyboard and screen reader across roles/routes/themes/locales, record contrast and translation defects, then run the affected local journeys. PHDK can address any exact source defects once evidenced; catalog shape alone is not full translation acceptance.
- **UAT-SEO-AEO** — needs a deployed revision and public discovery measurement. Owner/runtime action: after an authorized deployment exists, provide its public target and permit a bounded read-only header/content review; report observed canonical/robots/meta headers and verifiable discovery evidence. Do not infer it from the local source test.

No code-repairable FAIL was reproduced in this rerun. **Acceptance remains INCOMPLETE** due to the environment/manual items above. No automatic role switching, live identity provisioning, email, provider request or production operation was performed. Historical candidate results remain in the prior UAT handoff; this continuation supersedes only the current candidate and rerun facts.

## UAT-ELECTRON-STARTUP — local native launch (2026-10-13)

After the owner authorized the Electron runtime, `browser/npm run dev` launched Electron 44.7.0 on Windows x64. Startup output reports `Keledon Browser v5.1.10 ready`; `did-finish-load` recorded the renderer. CDP inspection and screenshot confirm the native renderer title `KELEDON Browser`, v5.1.10 toolbar, home page, connection/activity widget, and initialized device status. Evidence: `docs/phdk/evidence/uat-browser-native-initial.png`.

A safe local New Tab UI action created the second tab. KELEDON automatically navigated it to its default `https://www.google.com` page; the tab was closed while loading. No content was reviewed, no account or data was entered, and no client service was accessed. Evidence of the transition: `docs/phdk/evidence/uat-browser-native-new-tab.png`.

The native renderer startup is **PASS**. Native media-consent dialog, OS microphone/camera permission, physical device/audio and call lifecycle remain **NOT TESTED**. CUA inventory returned no native apps, its app-list API was unavailable, and Sky reported `Trusted RPC service is not configured`; therefore no Windows app UI input was possible. The local permission-policy unit tests remain the only consent-dialog behavior verification. No permission was granted and no customer call occurred.
