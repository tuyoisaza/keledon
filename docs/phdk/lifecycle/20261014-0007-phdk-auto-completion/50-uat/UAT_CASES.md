## Candidate 5.2.1 — UAT-104 production candidate availability smoke

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-104 | CMT-001/CMT-004 / anonymous release observer | After PR #210 merge and connected autodeploy, GET the public homepage, referenced JavaScript bundle, API `/health`, and guarded `/api/crud/interfaces` without an Authorization header. Do not log in or submit application data. | HTTP 200 from page/bundle/health; API and bundle report 5.2.1; unauthenticated catalog access is denied (401). This is availability/version and anonymous-denial smoke only. | Production HTTPS GET, no session | **PASS (scoped smoke):** homepage, bundle and API health returned 200; the API and bundle identify v5.2.1; anonymous catalog GET returned 401 with no authorization header. No authenticated selector, role-specific tenant scope, database, migration, or credential behavior was tested. Evidence: `evidence/uat-104-production-candidate-smoke-2026-10-17.json`. |

## Candidate 5.2.1 — UAT-105 production widget accessibility-tree presence

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-105 | CMT-002 / anonymous public visitor | Open production `/` in a browser and inspect only the accessibility tree; do not click controls, log in, clear storage, copy clipboard or submit data. | Candidate version, truthful illustrative-demo disclaimer, localized named diagnostic/cache controls, theme/language selectors and public navigation are exposed to accessibility APIs. | Production browser read-only tree | **PASS (presence only):** observed version 5.2.1 in pt locale, demo disclaimer, named copy/cache buttons, theme/language selectors and public content. Does not prove interaction, focus, screen-reader announcements or RBAC. Evidence: `evidence/uat-105-production-widget-ax-readonly-2026-10-17.json`. |

## Candidate 5.2.1 — UAT-110 public keyboard and accessibility-tree sample

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-110 | CMT-002 / anonymous public visitor | On production `/` in a disposable anonymous browser at pt/dark/1280×720, inspect the accessibility tree, traverse the header with Tab, observe visible focus and repeat Tab through the header cycle. Do not activate controls or use a screen reader. | Main landmark, headings and control names are exposed; keyboard sequence is stable, focus is visible, and no header keyboard trap occurs. | Production UI / isolated anonymous IAB | **PASS FOR LIMITED PUBLIC KEYBOARD/AX SAMPLE:** one main-content landmark, named headings and controls, stable header sequence, visible focus on “Criar conta”, and no trap in repeated Tab cycle. No screen-reader speech or other theme/locale/viewport is claimed. Evidence: `evidence/uat-110-production-public-keyboard-ax-2026-10-17.json`. |

## Candidate 5.2.1 — UAT-111 landing CTA contrast baseline (production)

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-111 | CMT-002 / anonymous public visitor | On production `/`, 1280×720, inspect computed text and rendered container colors for all visible landing text in dark/light/corporate; calculate WCAG relative-luminance ratios for flat CSS backgrounds and visually inspect CTA. Do not activate links. | Text meets 4.5:1, or 3:1 for qualifying large text; identify and report unmeasured gradient/image surfaces separately. | Production UI / isolated anonymous IAB / read-only CSS and screenshot | **FAIL FOR CTA SAMPLES:** lower CTA title 2.38:1 dark and 1.49:1 corporate (3:1 required); white “Começar” label 2.49:1 dark (4.5:1 required). Light-theme flat-color samples had no failures. Ten text nodes over gradients/images and one unresolved background remain outside the calculation. Evidence: `evidence/uat-111-production-cta-theme-contrast-2026-10-17.json`. Candidate fix requires post-deploy UAT-112. |

## Candidate 5.2.2 — UAT-112 production CTA contrast revalidation

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-112 | CMT-002 / anonymous public visitor | After 5.2.2 is deployed, inspect the production landing CTA in dark/light/corporate at the observed 1265×720 CSS viewport; read computed foreground, flat background, font metrics and verify the visible rendered card. Do not activate CTA links. | CTA title and description use primary-foreground over primary; primary action uses foreground over background. All measured pairs meet WCAG text-size thresholds in all themes; gradient/image and other page states remain separately scoped. | Production UI / isolated anonymous IAB / read-only CSS and screenshot | **PASS FOR SAMPLED CTA PAIRS:** production source `818ac9c8f1043cfc04768c30770f505b48d5087c`, version 5.2.2, bundle `index-i9Z2OoIq.js`, stylesheet `index-CV49ph3H.css`. Title/description ratios: dark 7.84:1, light 5.47:1, corporate 9.83:1; primary-action label ratios: dark 18.68:1, light 17.06:1, corporate 13.53:1. The CTA card rendered visibly in the dark-theme capture; theme restored to dark. This is limited to the measured flat-color CTA pairs and does not accept excluded gradient/image text or other routes, states, viewports or full-page WCAG conformance. Evidence: `evidence/uat-112-production-cta-theme-contrast-2026-10-17.json`. |

## Candidate 5.2.2 — UAT-113 public login accessibility sample

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-113 | CMT-002 / anonymous visitor | Open production `/login` in a disposable anonymous browser at pt/dark/1280×720. Inspect the accessibility tree and screenshot; sample text contrast in dark/light/corporate. Traverse controls with Tab through email and password; do not fill or submit the form, activate Google, or create an account. | Version, diagnostic/theme/language controls and login form fields/actions have accessible names; keyboard reaches email/password in document order and current focus is visible; sampled text reaches its WCAG contrast threshold. | Production UI / isolated anonymous IAB / read-only tree, CSS and keyboard | **PASS FOR LIMITED PUBLIC LOGIN SAMPLE:** observed v5.2.2, named email/password and Entrar/Google/Criar conta controls. Tab reached email and password in sequence; password showed a visible 2px teal focus ring. Measured heading/subtitle/form-label/primary-action/signup samples pass in dark (18.68/7.62/17.01/7.84/7.14), light (17.06/7.24/17.85/5.47/5.47), and corporate (13.53/5.62/14.64/9.83/9.83). The login route has no demo-disclaimer text. No credentials were entered and no form/OAuth/account action was activated. This does not prove authentication, error states, placeholder contrast, screen-reader output, other locales/viewports, or RBAC. Evidence: `evidence/uat-113-production-login-public-accessibility-2026-10-17.json`. |

## Candidate 5.2.2 — UAT-114 public landing demo disclosure in accessibility tree

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-114 | CMT-002 / anonymous public visitor | Open production `/` anonymously and inspect the accessibility tree only. Do not activate navigation, diagnostic, cache, theme or locale controls. | Version and named public controls are present; the illustrative session preview is accompanied by a disclosure that there are no live sessions or service metrics. | Production UI / isolated anonymous IAB / read-only accessibility tree | **PASS FOR TREE PRESENCE AND DISCLOSURE ONLY:** v5.2.2, main landmark, named public controls and Portuguese disclosure “Interface ilustrativa; sem sessões ou métricas de serviço em tempo real.” are exposed in the tree; preview label says “Prévia ilustrativa de sessão”. Viewport and visual rendering were not measured; no screen reader was used and no control was activated. Evidence: `evidence/uat-114-production-landing-demo-disclosure-2026-10-17.json`. |

## Candidate 5.2.2 — UAT-115 responsive public landing sample

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-115 | CMT-002 / anonymous public visitor | On production `/` in Portuguese/dark theme, inspect responsive geometry at 320×720, 375×812 and 768×1024 CSS px; visually inspect the 320px screenshot. Do not activate links or buttons. | No horizontal overflow; demo disclosure and hero heading stay within the document viewport; mobile menu target is at least 44×44px. | Production UI / isolated anonymous browser / read-only DOM geometry and screenshot | **PASS FOR SAMPLED RESPONSIVE LAYOUT:** document/body scroll widths equal client widths at all three sizes; disclosure and title remain in bounds; menu target measures 44×44px at 320/375/768. The 320px screenshot shows the disclosure below the navigation and readable hero copy. Other viewport content, themes/locales, zoom, screen reader and full WCAG conformance remain open. Evidence: `evidence/uat-115-production-responsive-layout-2026-10-17.json`. |

## Candidate 5.2.2 — UAT-116 Spanish/corporate mobile landing sample

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-116 | CMT-002 / anonymous public visitor | On current production deployment, select Spanish and corporate theme; inspect `/` at 375×812 CSS px using accessibility tree, DOM geometry and screenshot. Do not activate links or buttons. Restore Portuguese/dark and default viewport afterward. | Spanish demo disclosure and named navigation control; no horizontal overflow; hero, disclosure and primary/secondary actions remain in bounds; menu target at least 44×44px. | Production UI / anonymous browser / read-only tree, geometry and screenshot | **PASS FOR THIS SPANISH/CORPORATE MOBILE SAMPLE:** v5.2.2 deployment `413a409b-5356-4f1c-a023-62ea0d15b15d`, source `9f8df3cc8316bffd51c69900816170b819e28d8c`; disclosure, title and CTAs stayed inside the 360px client width; document/body width 360px; menu target 44×44px. Screenshot inspected. No contrast ratios were measured. Locale, theme and viewport were restored. Evidence: `evidence/uat-116-production-spanish-corporate-mobile-2026-10-17.json`. |
| UAT-117 | CMT-002 / anonymous public visitor | On production `/`, verify deployed version and source contract for copied diagnostic, activate “Copiar diagnóstico completo” once, and observe only the visible accessible status. Never read or export clipboard. | Copy action visibly announces success; source withholds configured API/OAuth hostnames; no cache clear, auth, probe, customer data or clipboard read. | Production anonymous UI / accessibility tree; reviewed deployed source SHA | **PASS AFTER SOURCE REMEDIATION, SCOPED TO COPY STATUS + SOURCE HOSTNAME WITHHOLDING:** 5.2.2 source review found the API/OAuth host interpolation (privacy control FAIL; clipboard was not inspected), fixed in PR #229. Retest on v5.2.3 Web deployment `3e168f0c-50b9-4ebb-b3c1-0cd5bd81b2a7`, source `3cccb4b2f88828fa5d273b682925d3a106dd3b9b`; AX status “Diagnóstico copiado”; merged source fixes both host lines to static withheld text. API Railway status was still BUILDING and is outside this Web UAT. Evidence: `evidence/uat-117-production-copy-status-2026-10-17.json`. |
| UAT-118 | CMT-002 / anonymous public visitor | On current production `/`, use Tab/Shift+Tab through brand, copy, cache-clear and first nav link; inspect keyboard focus styles and target sizes. Do not activate controls. | Stable observed order; copy/cache targets ≥44×44 CSS px and visible focus outline. No control action, login or data mutation. | Production anonymous accessibility tree, keyboard and read-only computed geometry | **PASS FOR THIS PUBLIC KEYBOARD SAMPLE:** v5.2.3 source `3cccb4b2f88828fa5d273b682925d3a106dd3b9`; Tab traversed KELEDON → copy → clear → Recursos; both buttons measured 44×44 with 2px solid teal outline. No control activated. Reader, other routes/locales/themes/zoom not covered. Evidence: `evidence/uat-118-production-diagnostics-keyboard-2026-10-17.json`. |
| UAT-119 | CMT-002 / anonymous public visitor | Open production `/login`, inspect the accessibility tree and traverse forward through email, password, submit, Google and account-creation controls; verify reverse Tab from the last action. Do not enter data or activate any action. | Fields and actions have accessible names; keyboard order is stable and returns correctly in reverse. | Production UI / anonymous IAB / accessibility tree and keyboard | **PASS FOR PUBLIC LOGIN KEYBOARD ORDER SAMPLE:** v5.2.3 Web assets `index-MRgeTPqB.js` / `index-CV49ph3H.css`; Tab reached E-mail → Senha → Entrar → Google → Criar conta; Shift+Tab returned to Google. No form submission or action. Browser autofill suggestion appeared but was not selected and no field value was captured. Document language metadata remained `en` while Portuguese was selected. Focus style, screen reader, auth, other route/theme/locale/viewports remain unaccepted. Evidence: `evidence/uat-119-production-login-keyboard-2026-10-17.json`. |
| UAT-120 | CMT-002 / anonymous public visitor | After candidate 5.2.4 deploys, select each supported locale (`es`, `en`, `pt`) on production `/login` and inspect only the document `lang` attribute and visible locale. Do not submit forms or activate login/account actions. | `<html lang>` matches the selected locale after initialization and after switching locale; no data is entered or sent. | Production UI / anonymous IAB / read-only DOM and selector | **PASS FOR PRODUCTION LOCALE/LANG SYNC:** v5.2.4 Web on commit `6715ea986bf9058b8f7d50edae1efe2ed4f65b81`, deployment `228369da-23e8-49e0-8345-2469f9fd4863`. After selecting ES/EN/PT, visible login heading and root `lang` matched `es`/`en`/`pt`; restored initial PT. No form or auth action. Other routes/assistive tech remain open. Evidence: `evidence/uat-120-production-locale-lang-2026-10-17.json`. |

## Candidate 5.2.1 — UAT-109 sampled contrast in production themes

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-109 | CMT-002 / anonymous public visitor | On the deployed production 5.2.1 page in a disposable anonymous session, read computed CSS token and representative hero/CTA colors in dark, light and corporate themes; calculate relative-luminance contrast. | Sampled text/background pairs reach 4.5:1. Record exact colors and scope; do not treat token samples as full-page WCAG acceptance. | Production UI / isolated anonymous IAB / computed styles | **PASS FOR SAMPLED PAIRS ONLY:** foreground/background 18.68:1 dark, 17.06:1 light, 13.53:1 corporate; hero copy/disclaimer 7.62:1, 7.24:1, 5.62:1; CTA text 7.84:1, 5.47:1, 9.83:1. Does not include gradient compositing, every page element/state or screen-reader acceptance. Evidence: `evidence/uat-109-production-theme-contrast-samples-2026-10-17.json`. |

## Candidate 5.2.1 — UAT-108 post-deploy responsive production revalidation

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-108 | CMT-002 / anonymous public visitor | After PR #213 and Railway deployment `05e6bd08-4d52-4ea2-ac42-36d1a1c29ede` succeed, open production with a disposable anonymous context at 320×720, 375×812, 768×1024 and 1440×900 CSS px; inspect visual layout and read-only geometry. One stale HTML asset reference is invalidated using app-owned cache cleanup plus a cache-busting homepage URL. | No horizontal overflow; copy/CTA fit; demo disclaimer clears fixed nav; mobile menu target is 44×44 at mobile/tablet and hidden in desktop navigation. | Production UI / isolated anonymous IAB; Railway metadata readback | **PASS FOR RESPONSIVE LAYOUT:** all four viewports pass. Client/document widths agree (305, 360, 753, 1425 CSS px after scrollbar); hero/CTA bounds fit; disclaimer starts below the 96.6px fixed navigation; mobile menu measures 44×44px at 320/375/768px. Bundle hashes match the deployed build. Does not accept contrast, screen reader, auth, diagnostics RBAC, audio or all locale/theme states. Evidence: `evidence/uat-108-production-mobile-layout-2026-10-17.json`. |

## Candidate 5.2.1 — UAT-107 mobile responsive production baseline before remediation

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-107 | CMT-002 / anonymous public visitor | Open production `/` with isolated viewport overrides 375×812 and 320×720 CSS px before PR #213; inspect visual page and read-only element geometry. | Header does not cover the demo disclaimer; copy and CTA fit within viewport; menu target is at least 44×44; no clipped content/horizontal overflow. | Production UI / isolated anonymous IAB | **FAIL BEFORE REMEDIATION:** hero content measures 439px wide at both viewports and clips at right; 97px fixed nav overlaps disclaimer at y=64..80px; menu is 24×24px. Superseded for current responsive acceptance by UAT-108; preserved as the baseline finding. Evidence: `evidence/uat-107-production-mobile-layout-2026-10-17.json`. |

## Candidate 5.2.1 — UAT-106 production widget actions, theme/locale and keyboard

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-106 | CMT-002 / anonymous visitor in a fresh browser context | On production 5.2.1, switch locale/theme, keyboard-tab to copy/reset controls, copy report without inspecting clipboard, clear only the disposable app context, and confirm the public route recovers. | Locale and theme update; controls retain visible focus and 44×44 targets; copy/reset announce truthful outcome; public page reloads with default local preferences. No application record/server session is touched. | Production UI / isolated anonymous IAB | **PASS FOR THIS PUBLIC SCOPE:** ES and EN rendered translated content; light/corporate theme selected; keyboard reached both 44×44 buttons with a solid teal focus outline; copy announced “Diagnóstico copiado”; app reset announced its exact scope and returned to the public page with pt/dark defaults. Clipboard was not read. Does not prove RBAC, screen-reader quality, mobile, backend state or audio/device acceptance. Evidence: `evidence/uat-106-production-widget-actions-and-keyboard-2026-10-17.json`. |

## Candidate 5.2.1 — UAT-103 production key-config readiness

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-103 | ADM-004 / release reviewer | Read the production `keledon-api` service description and inspect only the returned environment-variable names. Do not call the variable-value endpoint, reveal or copy any secret, or change provider configuration. | Determine whether the candidate's required `KELEDON_VENDOR_KEY` setting is present without reading its value. | Bounded read-only Railway `describe-service` metadata | **BLOCKER CONFIRMED:** variable name is absent from the production API service. No values or production data were read; no provider setting was changed. Evidence: `evidence/uat-103-production-key-config-readiness-2026-10-17.json`. Owner must configure the key through the authorized provider process before credential-storage UAT can pass. |

## Candidate 5.2.1 — UAT-102 production release-target readiness

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-102 | CMT-001/ADM-004 / anonymous observer and release reviewer | Open the public production homepage read-only; compare the visible version to the exact open PR head and check-run state. Do not log in, activate diagnostics, or send application requests. | Confirm whether the credential-remediation candidate is actually deployed and whether hosted checks exist; do not treat an older deployment as acceptance. | Production browser accessibility tree plus read-only GitHub PR metadata | **PASS (scoped readiness check):** production shows v5.1.85; PR #210 is OPEN at `fd7af3b963505fd7756c78ecfa7d8469096a9d84` with no checks. Candidate 5.2.1 is not deployed, so UAT-101 cannot run. Evidence: `evidence/uat-102-production-release-readiness-2026-10-17.json`. |

## Candidate 5.2.1 — UAT-101 ManagedInterface secret storage (production, pending)

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-101 | ADM-004 / synthetic superadmin and tenant fixture | First configure `KELEDON_VENDOR_KEY` through the authorized provider process and verify presence/length without displaying its value. Deploy and identify the exact 5.2.1 candidate. Use a dedicated synthetic Company/Team and synthetic credential that cannot authenticate to any customer/provider. Create an interface, replace its secret, clear it, and read/list/assign it. Verify the stored value is a versioned encrypted envelope without returning plaintext; inspect redacted API/UI responses and logs; clean up the fixture and verify removal. | New/replaced values persist as authenticated ciphertext; missing/short key fails closed; omitted secret preserves the value; clear removes it; ordinary responses expose only `hasCredentials`; no secret appears in UI, API response, diagnostics or logs; API and Cloud behave consistently. | Production candidate site only; bounded synthetic fixture and approved redacted persistence evidence; no local application tests | **BLOCKED / NOT RUN.** Production remains v5.1.85, candidate 5.2.1 is not deployed, and UAT-103 found the required key name absent from the production API service. No synthetic fixture or DB operation was performed. Required evidence: owner-managed key readiness (boolean only), exact candidate deployment SHA/version, encrypted-envelope check for the synthetic row, redacted response/log evidence and cleanup confirmation. |

## Candidate 5.1.77 — UAT-067 widget geometry revalidation

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-067 | CMT-002 / anonymous visitor and synthetic tenant roles | Rebuild Web/Landing 5.1.77; block external traffic and intercept APIs; inspect the widget on Landing at desktop/mobile sizes and Web login/shell flows; exercise keyboard navigation, copy, reset and accessible status. Inspect Browser renderer CSS and run its source contract test. | Each Web hit target is 44×44px and non-overlapping; each visible tile is 28×28px and the two tiles are exactly 4px apart; icon is 14×14px, version text 12px; anonymous/debug-off row, focus, feedback, redaction and app-owned reset remain correct. | Local production-built Web/Landing SPAs with Playwright; Browser source test, outbound app traffic blocked | PASS for Web/Landing synthetic scope. Full Web UAT 7/7 plus admin-settings/theme-template/AI-admin, Web diagnostics 19/19, Browser widget/boundary tests 4/4, Landing geometry evidence at 1280×900 and 390×844. Evidence: `docs/phdk/evidence/uat-local-web.json`, `docs/phdk/evidence/uat-landing-5.1.77-navbar.json`, adjacent desktop/mobile PNGs. Packaged Electron rendering and screen-reader acceptance remain open. |

---

## Candidate 5.1.73 — UAT-087 superadmin Brand/Team Web CRUD

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-087 | CMT-004 / synthetic superadmin | Open built Web against intercepted APIs; create, edit, inspect details, then confirm deletion for a Brand and Team. Verify company/brand/country fields and payloads. | Rows and relations read back correctly; destructive confirmation precedes deletion; synthetic store contains no deleted fixture. | Local production-built Web/headless Edge; outbound requests blocked | PASS. Paired API/Cloud PostgreSQL acceptance is UAT-075/076; Web fixture does not claim backend persistence. Evidence: `docs/phdk/evidence/uat-local-web.json`, `uat-superadmin-brand-detail.png`, `uat-superadmin-team-detail.png`. |

## Candidate 5.1.73 — UAT-086 superadmin User Web CRUD and least-privilege creation

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-086 | CMT-004 / synthetic superadmin | Open built Web against intercepted APIs; create a user in another synthetic company, verify default `user`, assign `admin` as superadmin, inspect details, and confirm deletion. | The create payload uses least privilege; only explicit superadmin edit assigns the elevated role/company; detail readback is correct and delete removes the fixture. | Local production-built Web/headless Edge; outbound requests blocked | PASS. Paired API/Cloud PostgreSQL authorization/persistence is UAT-071/075/076; Web fixture does not claim backend persistence. Evidence: `docs/phdk/evidence/uat-local-web.json`, `uat-superadmin-user-detail.png`. |

## Candidate 5.1.73 — UAT-083 superadmin flow configuration HTTP acceptance

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-083 | US-012/CMT-003/CMT-004 / synthetic superadmin and coordinator | Apply 9 API and 7 Cloud migrations to separate disposable PostgreSQL databases; start the built Nest apps on loopback; send signed-token requests with forged role/company claims through the flow-definition, version, availability and intent-mapping routes; verify via a second DB client. | DB scope overrides forged claims; superadmin manages configuration across tenants; coordinator is tenant-limited; approved versions reject edits; all permitted changes and legacy owner assignment persist. | Real API/Cloud HTTP plus PostgreSQL 16; external provider/customer traffic disabled | PASS: 24 assertions per backend. Closes four superadmin flow-configuration API rows; Web and other-role rows remain open. Evidence: `evidence/uat-083-superadmin-flow-config-http-5.1.73.json`; runner: `services/api/scripts/uat-083-http-flow-config.cjs`. |

## Candidate 5.1.73 — UAT-082 superadmin flow API persistence

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-082 | US-012/CMT-003/CMT-004 / synthetic superadmin and coordinator | Apply migrations to fresh API/Cloud PostgreSQL databases; invoke built guards, controller and service against real Prisma clients with signed tokens carrying forged role/company claims; exercise cross-company superadmin definitions, coordinator scope and approved version persistence. | Superadmin reads/writes across tenants; DB role/company overrides token/filter values for coordinator; foreign records stay hidden or unmodifiable; version and actor persist across clients. | API/Cloud in-process class invocation with PostgreSQL 16; no HTTP listener or external integrations | PASS: 10 assertions per backend, 9 API migrations and 7 Cloud migrations. Evidence: `evidence/uat-082-superadmin-flow-config-postgres-5.1.73.json`. HTTP transport and broad matrix remain outside this case. |

## Candidate 5.1.73 — UAT-081 superadmin flow configuration Web journey

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-081 | US-012/CMT-003/CMT-004 / synthetic superadmin | Open the production-built SPA with intercepted synthetic APIs; switch between two companies; read/create/update/deactivate definitions; create and approve a version; enable/disable company availability; add/remove intent routing; assign an unowned legacy definition to a company. | Reads and writes follow selected company; foreign-company records stay hidden; legacy assignment switches the editor to the new owner and keeps the record visible. | Local Web SPA/headless Edge; external HTTP and WebSockets blocked | PASS after UAT Fix. Initial run found a scope-transition defect. The Web fixture is synthetic; paired superadmin API authorization and persisted lifecycle acceptance pass in UAT-083. Evidence: `evidence/uat-flow-config-superadmin-web-5.1.73.json` and `evidence/uat-083-superadmin-flow-config-http-5.1.73.json`. |

## Candidate 5.1.73 — UAT-080 coordinator flow configuration persistence

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-080 | US-012/CMT-003/CMT-004 / synthetic coordinators in two companies | In separate disposable API and Cloud databases, create tenant definitions with forged IDs, read with foreign filters, update/archive own definitions, create/approve versions, disable an enablement permission, replace mapping flow IDs, attempt foreign writes, restart services and clean fixtures. | Current DB coordinator scope overrides caller IDs; foreign rows/references are hidden or rejected; approved versions remain immutable; disabling retains the permission and mapping update replaces prior IDs; all configuration survives restart and cleanup leaves no UAT-080 rows. | Local API/Cloud HTTP and disposable PostgreSQL 16.15 | PASS in both backends. Closes four coordinator/API rows only. Evidence: `evidence/uat-080-coordinator-flow-config-persistence-5.1.73.json`. |

Portfolio tally: **78 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. Matrix: **547 rows = 395 BLOCKED, 133 NOT APPLICABLE, 3 DECISION NEEDED, 16 PASS**. Native device/audio, broad accessibility/localization, Session lifecycle decisions, deployed SEO/AEO, Qdrant concurrency and per-customer live call/CRM remain open.

## Candidate 5.1.73 — UAT-079 persisted tenant flow configuration

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-079 | US-012/CMT-003 / synthetic admins in two companies | In separate disposable API and Cloud databases, create definitions for two tenants; submit forged company IDs; update/archive; create and approve versions; upsert availability and intent mapping; attempt cross-tenant definition/version/permission/mapping writes; restart services and read back; clean fixtures. | DB-derived company scope overrides caller IDs; tenant reads exclude foreign rows; foreign references fail closed; approved version is immutable; definitions, versions, permissions and mappings persist across restart; cleanup returns named test fixture counts to zero. | Local API/Cloud HTTP and disposable PostgreSQL 16.15 | PASS in both backends. Closes four admin/API matrix rows only; Web and other roles remain open. Evidence: `evidence/uat-079-tenant-flow-config-persistence-5.1.73.json`. |

## Candidate 5.1.73 — UAT-078 persisted tenant Vendor CRUD and private-origin configuration

| UAT | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-078 | CMT-003/CMT-004 / synthetic tenant A and B admins | In separate disposable API and Cloud databases, create an own-team Vendor with an explicitly allowlisted private origin; list/detail/update with masked credential placeholders; create Tenant B Vendor; attempt cross-tenant list/detail/update/delete and forged create; delete fixtures. | Own Vendor CRUD persists; private-origin allowlist reads back; credential values never appear in projections and masked updates preserve configured credentials; all five foreign-tenant attempts receive 403; cleanup leaves no UAT users/Vendors. | Local API/Cloud HTTP and disposable PostgreSQL 16.15 | PASS in both backends. No external host contacted. Evidence: `evidence/uat-078-tenant-vendor-private-origin-5.1.73.json`. |

## Candidate 5.1.73 — UAT-077 persisted superadmin Workflow CRUD

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-077 | CMT-004 / persisted synthetic admin and superadmin | In separate disposable API and Cloud databases, deny admin list/detail/create/update/delete; authenticate superadmin; create, list, detail, update/read back, delete and verify absence of a synthetic Workflow; clean fixtures. | DB-derived admin role is denied for all five methods; superadmin changes persist and read back; all fixture rows are removed. | Local API/Cloud HTTP and disposable PostgreSQL 16.15 | PASS in both backends. Closes only Workflow API role rows; Web and remaining matrix are open. Evidence: `evidence/uat-077-superadmin-workflow-5.1.73.json`. |

## Candidate 5.1.73 — UAT-076 persisted superadmin cross-tenant access

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-076 | CMT-004 / persisted synthetic superadmin | Authenticate in separate disposable API and Cloud databases; inspect global Company/Brand/Team/User lists; direct-read Tenant B Brand/Team/User; create/delete Tenant B Brand and Team; create a Tenant B User as user, assign admin, read safe projection, and clean fixtures. | Global lists and Tenant B direct reads succeed for superadmin; user role update returns admin; credential fields are absent; cleanup returns all UAT-076 fixture counts to zero. | Local API/Cloud HTTP and disposable PostgreSQL 16.15 | PASS in both backends. Representative authorization evidence only; full matrix remains open. Evidence: `evidence/uat-076-superadmin-cross-tenant-5.1.73.json`. |

Portfolio tally: **74 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. The full resource × role × surface × operation matrix, native device/audio, broad accessibility/localization, Session lifecycle decisions, deployed SEO/AEO, Qdrant concurrency and per-customer live call/CRM remain open.

## Candidate 5.1.73 — UAT-075 persisted superadmin resource breadth

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-075 | CMT-004 / persisted synthetic superadmin | Authenticate to API and Cloud against separate disposable PostgreSQL databases; create/update/delete a Brand, a Team and a User under synthetic Tenant A; assign admin role to the created user; verify safe detail projection and remove all fixtures. | Superadmin administration persists across the three resource families; user role assignment is explicit; user detail omits credential fields; cleanup leaves no UAT accounts or created Brand/Team rows. | Local API/Cloud HTTP and disposable PostgreSQL 16.15 | PASS in both backends. This representative slice does not close the full 39-model × role × surface × operation matrix. Evidence: `evidence/uat-075-superadmin-resource-breadth-5.1.73.json`. |

Portfolio tally: **73 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. The full resource × role × surface × operation matrix, superadmin breadth outside Brand/Team/User/Company, native device/audio, broad accessibility/localization, Session lifecycle decisions, deployed SEO/AEO, Qdrant concurrency and per-customer live call/CRM remain open.

## Candidate 5.1.73 — UAT-072 Web superadmin Company CRUD

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-072 | CMT-004 / synthetic Web superadmin | Open the production-built SPA against an intercepted synthetic API; create, edit and delete a Company with country relations. | Exact create/update payloads are sent; company and country labels read back from the mock store; native delete confirmation precedes removal. | Local Web SPA / headless Edge; external traffic blocked | PASS: 6 contract assertions. UI and payload only; backend authorization and persistence are not claimed. Evidence: `evidence/uat-072-web-company-superadmin-5.1.73.json` and screenshot. |

## Candidate 5.1.73 — UAT-073 tenant flow editor Web journey

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-073 | CMT-003 / synthetic Company Co tenant admin | On the production-built SPA, create and edit a flow, save draft and approved versions, enable company availability, add intent mapping, confirm soft deactivation, and test 390px reflow. | Tenant scope is derived into flow create/update and permission/mapping writes; reads include the company filter; no company picker appears; deactivation persists in the synthetic store; 390px view has no horizontal overflow. | Local Web SPA / headless Edge with intercepted API; external network blocked | PASS: flow editor browser suite 1/1. Web fixture is synthetic; paired API/Cloud auth and persistence/restart acceptance is UAT-079. Evidence: `evidence/flow-editor-uat.json` and screenshots. |

## Candidate 5.1.73 — UAT-074 private CRM origin policy parity

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-074 | CMT-003 / source policy contract | Build API/Cloud/Browser and run mirrored vendor URL and Browser security-policy regression suites using synthetic private/public origins. | API/Cloud accept only explicit normalized tenant origins and safe projections; Browser allows configured private endpoints and blocks credentials, unsafe schemes, unconfigured redirects, metadata IP, foreign resources and ambiguous worker scope. | Source tests/builds only; no network calls | PASS: API 3/3, Cloud 3/3, Browser 13/13. No live CRM acceptance. Evidence: `evidence/uat-074-private-origin-policy-5.1.73.json`. |

Portfolio tally: **72 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. The full resource × role × surface × operation matrix, remaining resource families, native device/audio, broad accessibility/localization, Session lifecycle decisions, deployed SEO/AEO, Qdrant concurrency and per-customer live call/CRM remain open.

Portfolio tally before UAT-074: **71 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. The full resource × role × surface × operation matrix, remaining resource families, native device/audio, broad accessibility/localization, Session lifecycle decisions, deployed SEO/AEO, Qdrant concurrency and per-customer live call/CRM remain open.

Portfolio tally before UAT-073: **70 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. The full resource × role × surface × operation matrix, remaining resource families, native device/audio, broad accessibility/localization, Session lifecycle decisions, deployed SEO/AEO, Qdrant concurrency and per-customer call/CRM remain open.

## Candidate 5.1.73 — UAT-071 persisted superadmin Company CRUD

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-071 | CMT-004 / persisted synthetic superadmin | Register a synthetic account in each disposable database and verify default role=user; prepare an isolated superadmin fixture; exercise API and Cloud Company list/detail/create/update/delete, country relations, and role assignment to a user in the created company; verify deletion and cleanup. | Superadmin reads global Company list/detail; create/update/country relations persist; user role/company assignment persists with safe response projection; only the synthetic test user/company are deleted; fixture rows are removed. | Local API/Cloud HTTP and separate disposable PostgreSQL 16.15 databases | PASS: 12 assertions per backend (24 total); company and country relation were absent after deletion. The Web UI sample is tracked separately in UAT-072; the overall CRUD matrix stays open. Evidence: `evidence/uat-071-superadmin-company-crud-5.1.73.json`. |

Portfolio tally at that point: **69 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. The full resource × role × surface × operation matrix, remaining resource families, native device/audio, broad accessibility/localization, Session lifecycle decisions, deployed SEO/AEO, Qdrant concurrency and per-customer call/CRM remain open.

## Candidate 5.1.73 — UAT-070 persisted coordinator CRUD role boundaries

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-070 | CMT-004 / persisted coordinator A plus tenant admin B | Register a synthetic user in each disposable database, prepare the coordinator only as an isolated UAT fixture, verify login role/company from the database, then exercise API and Cloud Company/User/Brand/Team list/detail/create/update/delete and forbidden cross-tenant/privilege operations. | Registration begins at role=user; coordinator lists and records stay in tenant A; company create/delete and role elevation fail; allowed same-tenant CRUD persists and reads back; all temporary records are removed. | Local API/Cloud HTTP and separate disposable PostgreSQL 16.15 databases | PASS: 22 assertions per service (44 total); both databases confirmed coordinator identity/scope; temporary fixtures removed with zero residual test rows. Evidence: `evidence/uat-070-coordinator-crud-5.1.73.json`. Full resource/surface coverage remains open. |

Portfolio tally: **68 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. The full resource × role × surface × operation matrix, native device/audio, broad accessibility/localization, remaining Session lifecycle decisions, deployed SEO/AEO, Qdrant concurrency and per-customer call/CRM remain open.

## Candidate 5.1.73 — UAT-069 persisted tenant CRUD role boundaries

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-069 | CMT-004 / persisted tenant admins A and B | Authenticate synthetic tenant admins against disposable PostgreSQL; exercise API and Cloud HTTP list/detail/create/update/delete for Company, User, Brand and Team, including forged tenant filters, foreign direct IDs, forbidden company create/delete, privilege escalation and cleanup. | Lists use the database actor's tenant; foreign IDs and forbidden privilege/company actions return 403; a newly created user is role=user in the actor's company; allowed same-tenant CRUD persists and reads back; all temporary rows are deleted. | Local API/Cloud HTTP and separate disposable PostgreSQL 16.15 databases | PASS: 19 assertions per service (38 total); API and Cloud resolved persisted actors and applied tenant boundaries; temporary fixtures removed and zero residual test rows. Evidence: `evidence/uat-069-crud-roles-5.1.73.json`. Coordinator's persisted route journey and the complete model/role/surface matrix remain open. |

Portfolio tally: **67 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. Coordinator persistence and exhaustive resource coverage remain open alongside the other portfolio gates.

## Candidate 5.1.73 — UAT-068 authenticated orphan-session cleanup

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-068 | CMT-004 / anonymous, tenant admin and superadmin | Start 5.1.73 API and Cloud against separate disposable PostgreSQL 16.15 databases; issue authenticated GET count and DELETE requests with synthetic/current-DB actors; include active, metadata-bearing and related-record sessions. | Anonymous denied 401; tenant admin denied 403; superadmin sees/deletes only the ended empty orphan; sessions with activity or related Event, FlowRun or SubAgent remain. Test rows/account are removed after readback. | Local API/Cloud HTTP and PostgreSQL | PASS: both API and Cloud returned 401/403 for denials; each superadmin count/delete affected one eligible fixture; five ineligible variants remained; final candidate count zero. Evidence: `evidence/uat-068-orphan-cleanup-5.1.73.json`. |

Portfolio tally at that point: **66 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. The full resource × role × surface × operation matrix, native device/audio, broad accessibility/localization, remaining Session lifecycle decisions, deployed SEO/AEO, Qdrant concurrency and per-customer call/CRM remained open.

## Candidate 5.1.72 — UAT-067 production-built Web widget accessibility and diagnostics

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-067 | CMT-002 / anonymous visitor and synthetic tenant roles | Build Web 5.1.72; block external traffic and intercept APIs; inspect the shared diagnostics widget; exercise keyboard navigation, copy feedback, reset, responsive widths, protected diagnostics and synthetic admin flows. Scan text contrast on management, Knowledge, dashboard, sessions, profile and devices; exercise English/Spanish/Portuguese and dark/light/corporate themes on sampled routes. | Actions have accessible names, 44×44px targets, visible keyboard focus and polite live status; redaction/reset behavior and selected UI journeys work without external calls; scanned text meets WCAG 2.2 AA contrast thresholds, and no sampled failures remain. | Local production-built Web SPA / Playwright Chromium | PASS for this local synthetic scope: production-built UAT 6/6 plus AI-admin UAT; focused diagnostics 19/19; selected multi-route/role/locale/theme contrast scan passes. Corrected the Providers sublabel (4.17:1), primary-action foreground (2.38:1), muted text token (4.06:1), completed badge (4.22:1) and paired-device label (2.12:1); retests pass. Evidence: `evidence/uat-067-web-accessibility-5.1.72.json` and `evidence/uat-web-widget-5.1.72/`. Screen-reader and exhaustive-route certification remain open. |

Portfolio tally: **65 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. Native Electron/device/audio remains MANUAL; broad route/role/screen-reader/localization acceptance, deployed SEO/AEO, Qdrant concurrency, complete resource operations, Session lifecycle policy and per-customer call/CRM acceptance remain open.

## Candidate 5.1.72 — UAT-066 disposable PostgreSQL roles, tenant scope and persistence

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-066 | UAT-060 / synthetic superadmin and tenant admins | Apply API and Cloud Prisma migrations to separate disposable PostgreSQL 16.15 databases; exercise registration, DB-derived identity, two-tenant company/session access, forbidden writes, restart persistence, shared-database API instances and flow permission/version constraints. | Migrations are current and repeatable; persisted actor scope isolates tenants; allowed Session status/metadata writes survive restart; forbidden cross-tenant/reassignment/elevation actions fail closed; schema constraints reject cross-tenant permission and duplicate versions. | Local loopback API and Cloud with synthetic identities | PASS for 26 API and 10 Cloud assertions, restart persistence for both, API two-instance shared-DB behavior, and constraints in both schemas. Evidence: `evidence/uat-postgres-core-5.1.72.json`. Full resource/operation matrix remains open. |

UAT-060 is resolved for this core disposable-PostgreSQL scope. Portfolio tally: **64 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. Native device/audio remains MANUAL; exhaustive CRUD coverage, the three Session lifecycle decisions, broad accessibility/localization, deployed SEO/AEO, Qdrant concurrency and client-specific call/CRM journeys remain open.

## Candidate 5.1.71 — UAT-065 FlowRunEvidence dormancy

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-065 | Owner / CMT-004 | Inspect Prisma model and search API, Cloud, Web and Browser source for runtime references; compare with FlowRun/SubAgentRun execution; review the 39-model/546-row inventory. | FlowRunEvidence remains in Prisma for possible future use; no active reader, writer, route or UI is claimed. All 14 role/surface combinations are NOT APPLICABLE. No role grants, retention job, or schema migration is added. Revisit only with a defined contract and approved migration. | Owner decision, source inventory, API regression 33 | PASS for decision and source classification only. No database migration or persisted evidence lifecycle was tested. |

# UAT cases — run 20261014-0007-phdk-auto-completion

## Candidate 5.1.70 — UAT-064 owner-approved FeatureFlag dormancy

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-064 | Owner / CMT-004 | Confirm FeatureFlag stays dormant; inspect API/Cloud app-module wiring, route/controller consumers, Web surfaces and the 39-model/546-row CRUD inventory. | Schema/service remain retained; no module, route, UI, caller or role grant is added; 14 model/surface rows are NOT APPLICABLE to the active product; retirement or activation waits for a future owner-approved capability and migration review. | Owner decision plus source inventory regression | PASS for decision and source classification only. No database migration, persistence or runtime activation was tested. |

## Candidate 5.1.69 — UAT-063 nested relation and tenant company contract

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-063 | CMT-004 / admin or coordinator | Update countries on the actor's own company, attempt foreign-company update and direct nested country write; inspect CompanyCountry/TeamInterface model rows and existing guarded API contracts. | Own-company country set may be edited through Company; foreign company and standalone nested write are denied; CompanyCountry/TeamInterface remain explicitly nested; TeamInterface assignment stays team-scoped and atomic. CRUD matrix records missing Web selector/persistence gates. | API/Cloud source regression and CRUD inventory | PASS for source guards and classification only: API regression 39/39, Cloud 18/18, including nested relation and matrix assertions. No live DB or browser UI acceptance. |

## Candidate 5.1.68 — provider and voice-profile CRUD derive tenant scope

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-062 | CMT-004 / authorized company admin or coordinator | Exercise API and Cloud guard paths for tenant-provider-config and voice-profiles: list without caller company, write without companyId, attempt a mixed-company provider batch and access a foreign profile ID. | Reads are filtered to the current DB actor company; accepted writes have actor-derived companyId; mixed-company batches and foreign direct IDs are denied; ordinary low roles cannot mutate tenant provider/profile resources. | API/Cloud source regression | PASS: API regression 39/39 and Cloud regression 18/18 include positive actor-derived scope plus negative cross-company cases. Unit guard evidence only; no live DB identity was used. |

## Candidate 5.1.67 — API flow reads enforce team scope

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-061 | CMT-003/004 / authorized team runtime | Exercise API and Cloud FlowService search with no team, blank query, an oversized result limit, a rejected Qdrant response and malformed rows; call API flow listing with and without a team. | Missing scope returns no results without database/network calls; valid search/list always carries the requesting `teamId`, search limits are 1–50, failed upstream responses fail closed, and malformed rows are discarded. | API/Cloud unit regression | PASS for the 5.1.67 source contract: API FlowService 12/12 and Cloud parity 10/10. No live Qdrant or customer tenant was used. |

## Candidate 5.1.62 — protected AI administration acceptance

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-053 | US-011 / provisioned superadmin and tenant admin | Build the Web app and run the isolated AI administration UI journey with synthetic API routes; run the managed AI API contract suite through the required API regression runner. | Only a superadmin reaches prompt/usage administration; invalid schemas and stale revisions do not write; successful edits create audited revisions; missing usage/cost stays Unknown; no provider request or model payload is fabricated. | Local production SPA UAT and API regression. | PASS for exact 5.1.62 source: API contract 6/6 is included in regression 38/38; synthetic AI administration UAT passes all 12 cases. Evidence: `evidence/AI-ADMIN-UAT-5.1.62.json` and adjacent screenshots. Persistence/migration remains open. |

## Latest acceptance delta — 5.1.61 public navigation

| Case | Story / actor | Preconditions and actions | Expected observable outcome | Channel | Status / evidence |
|---|---|---|---|---|---|
| UAT-052 | US-010 / anonymous visitor | Open production-built Landing with outbound requests blocked at 1280×900; inspect navigation and hero. At 390×844, open mobile navigation and inspect theme/language controls. | Desktop navigation/preferences do not overlap hero disclaimer; mobile menu exposes reachable theme and language controls. | Local built Landing SPA / headless Edge | PASS, `docs/phdk/evidence/uat-landing-navbar-5.1.61.json`, `uat-landing-home-desktop.png`, `uat-landing-home-mobile-menu.png`. |

Exact-candidate UAT-052 confirms the public navigation path only. Focused Web UAT passes 5/5 and the standalone Landing test 1/1. Portfolio tally is **52 PASS, 0 BLOCKED, 1 MANUAL — ACCEPTANCE INCOMPLETE**. Exhaustive persisted model operations/concurrency, native device/audio, broad accessibility/localization and deployed SEO/AEO remain open; client CRM/call acceptance is selected per tenant.

## Latest acceptance delta — 5.1.52 Qdrant-backed cleanup

UAT-010 Knowledge deletion, formerly BLOCKED, now **PASS** for document and base cleanup using disposable PostgreSQL 16.15 and loopback Qdrant 1.19.2 with synthetic data. Document delete removes its DB row and matching vector points; base delete removes its collection and cascades DB rows. Exact evidence: `evidence/uat-qdrant-delete-5.1.52.json`. Delete/reindex concurrency remains open. Whole acceptance is **40 PASS, 0 BLOCKED, 1 MANUAL**; native Electron/device/audio remains MANUAL, with the broader acceptance limits recorded in `UAT_REPORT.md`.

## Latest candidate 5.1.52 — session CRUD guard regression (2026-10-14 local / 2026-10-15 UTC)

On exact source commit `03ea78968103aa6bc6290ed0681b1c1ea345872a`, the API authenticated a synthetic tenant admin against disposable PostgreSQL 16.15. Session creation and `metadata`/status updates persisted and read back. Legacy `summary` and team reassignment writes returned 403. API/Cloud parity and regression suites passed. Evidence: `evidence/uat-postgres-roles-5.1.52-03ea7896.json`. The built Web UAT passed 4/4 with mocked APIs and blocked external traffic.

The latest formal tally is **39 PASS, 1 BLOCKED, 1 MANUAL**. The new BLOCKED operation is KnowledgeBase/KnowledgeDocument deletion while isolated Qdrant is unavailable; native device/audio remains MANUAL. Whole Auto remains partial pending exhaustive 35-model operation coverage, live Qdrant/concurrency, broad accessibility/localization, deployed SEO/AEO and each customer's configured call/CRM acceptance.

## Latest UAT continuation — 5.1.51 DB-backed identity and tenant checks (2026-10-14)

Tested the exact delivered source commit `5b7e25512c95737688beea43b2d7172199dfa231` on a disposable PostgreSQL 16.15 database bound to `127.0.0.1`. All eight migrations applied and a second deploy found no pending migration. Synthetic public registration defaulted to `user`; an existing synthetic superadmin assigned admin access through the API. Persisted admin/coordinator scope, cross-company denials, low-role denial, safe user creation, and write-only vendor secret projections passed. The legacy vendor-secret migration dry run found one synthetic row, encrypted it on apply, and was idempotent on the second apply. A tenant-allowlisted private loopback URL was accepted for storage; it was never contacted. Full evidence: `50-uat/evidence/uat-postgres-roles-5.1.51-5b7e2551.json`.

| Case | Updated result | Evidence boundary |
|---|---|---|
| UAT-009 | PASS — local DB-backed synthetic users authenticated and current DB roles/company scopes were verified. | Disposable local target; no production or customer identities. |
| UAT-010 | PASS — migrations, secret-migration idempotency, and persisted core role/tenant CRUD checks passed. | Full 26-model operation coverage remains an additional open gate. |
| UAT-006 | MANUAL — not exercised with a native Electron device/audio session. | No microphone capture or customer device use. |

Overall UAT is **39 PASS, 0 BLOCKED, 1 MANUAL**. Whole PHDK Auto remains partial pending native device/audio, exhaustive model/operation coverage, broad accessibility/localization, deployed SEO/AEO, live Qdrant/concurrency and each customer's configured call/CRM acceptance.

## Current candidate 5.1.44 — tenant scope on BrowserView resource requests

| Case | Story / actor | Acceptance / steps | Result and evidence |
|---|---|---|---|
| UAT-040 | US-003 / configured CRM loaded in a BrowserView during RPA | Allow HTTP(S)/WebSocket resources on tenant-configured origins, including an explicitly allowlisted private CRM; block unlisted CDN/host/port requests. Resolve requests without a WebContents using the service-worker initiator, intersect scopes for overlapping active tenants, and deny unattributed requests while RPA scopes are active. | PASS offline on exact candidate `0cbf038ed8ce7f27b1459c3a922a93f04165da46` (tree `9580bf410a52c2ecce0824e52fdf3ab30b322440`): Browser suite 27/27; security-policy/source-wiring tests 11/11; Browser build; PHDK coherence 52/52. Evidence: `50-uat/evidence/uat-rpa-subresource-origin-scope-5.1.44.json`. No packaged Electron runtime or live endpoint. |

## Current candidate 5.1.43 — RPA scope at BrowserView navigation boundaries

| Case | Story / actor | Acceptance / steps | Result and evidence |
|---|---|---|---|
| UAT-039 | US-003 / tenant-configured CRM flow executing in an empty BrowserView | Confirm RPA's trusted tenant allowlist is applied to BrowserView main/frame/redirect/popup and `tabs:navigate` boundaries during execution; restore the prior tab scope on completion or failure; retain a tenant-allowlisted private CRM origin. | PASS on exact tested candidate `076bce49bead0029fd8fc9ea7f79389538f526e5` (tree `7c2cdffbac9887d974f886d8144cff330029c691`), containing fix commit `29d18efbbabe159e5279a01ba767f70e54d8afdc`: Browser 27/27; Electron security-policy/wiring 9/9; TypeScript build; PHDK coherence 52/52. Evidence: `50-uat/evidence/uat-rpa-active-tab-navigation-scope-5.1.43.json`. Wiring assertions and mock WebContents only; no packaged Electron runtime or network endpoint. |

The tenant-origin list is derived from paired vendor configuration by the existing Browser command handlers; the new runtime scope shares it with Electron navigation guards during the flow and restores previous WebContents state in `finally`. Private destinations remain valid only when configured and allowlisted for the tenant.

## Current candidate 5.1.42 — fail-closed RPA tenant scope

| Case | Story / actor | Acceptance / steps | Result and evidence |
|---|---|---|---|
| UAT-038 | US-003 / tenant-configured CRM flow | Execute production RPA code with absent scope, empty scope, an unlisted origin, and a private CRM origin explicitly configured for the tenant. Confirm denied paths do not call `loadURL` or page JavaScript, while the configured private destination remains available. | PASS at exact source `07f979b610b069d675183a7a4ad112b2466c20d2` (tree `a3664bdc9402c7b943e49b2a585b68de741f9f65`), `node browser/tests/rpa-safety.test.cjs`. Uses synthetic Electron WebContents; no real network/private endpoint. Evidence: `50-uat/evidence/uat-rpa-required-tenant-scope-5.1.42.json`. |

The approved policy is enforced in the RPA executor: an omitted or empty tenant-origin allowlist now fails before any flow step; every navigation must match the configured tenant origin. Customer-configured private HTTP(S) CRM destinations remain supported. This is source-level offline evidence only; persisted configuration, subresource behavior, and live customer acceptance remain open.

## Current candidate 5.1.41 — tenant-scoped CRM frame navigation

| Case | Story / actor | Acceptance / steps | Result and evidence |
|---|---|---|---|
| UAT-037 | US-003 / tenant administrator configuring a private CRM | Verify a configured private HTTP(S) origin remains usable; an unconfigured origin including a metadata-service address, file URL, or embedded credentials is denied; frame redirects and the trusted navigation IPC use the same tenant allowlist; `about:blank` inherits its parent origin. | PASS on exact candidate `718ce3d4cf9c4e51b71ec163e9749307997d85d2` (tree `14e5c085771a1e556692991fd1724e747b164ee7`), offline Browser policy/wiring tests 8/8 and TypeScript build; no real CRM, network request, DB, or device used. Evidence: `50-uat/evidence/uat-vendor-frame-scope-5.1.41.json`; test `browser/test/security-policy.test.cjs`; code `browser/src/security-policy.ts`, `browser/src/tab-manager.ts`, `browser/src/ipc-handlers.ts`. |

The selected per-customer CRM policy is private destinations only when explicitly configured, URL-validated, and allowlisted within that tenant. Whole Auto remains partial: disposable PostgreSQL/identities, persisted CRUD, native device/audio, broad accessibility/localization, deployed SEO/AEO, and live customer-specific acceptance remain open.

## Current candidate 5.1.40 — diagnostics and Knowledge role acceptance

| Case | Story / actor | Acceptance / steps | Result and evidence |
|---|---|---|---|
| UAT-034 | US-002 / coordinator and admin using diagnostics | Open `/management/debug` as a synthetic coordinator and admin; verify coordinator is redirected before any protected deep-health request, while admin can enable the local diagnostics panel and receive the mocked deep-health response. | PASS on source `8d000a5d4aa95dc361d19a5eca02fe4544be0417` (tree `cc41a3b3d030d72db006809553983abb2368d54b`), dedicated production-SPA test `services/web/test/management-debug-role-uat.test.cjs`; coordinator redirect, admin access, every response synthetic and all other external traffic blocked. Evidence: `50-uat/evidence/uat-management-debug-role-5.1.40.json`; no database or live service used. |
| UAT-035 | US-002 / coordinator, superadmin and user managing Knowledge | As a coordinator, create a knowledge base and verify only the coordinator's company is selectable; as superadmin, select a second company; as user, verify manager controls are absent. | PASS on test source `2edc20cdc524f39718c486395677e0532af5a972` (tree `dbd5dd8a2e02dfbea38ae72a4c74e3c50d5c21bc`), exact built-SPA test `services/web/test/knowledge-manager-role-uat.test.cjs`. Responses are synthetic, all other external traffic blocked; this does not prove persisted API authorization. Evidence: `50-uat/evidence/uat-knowledge-manager-roles-5.1.40.json`. |
| UAT-036 | US-002 / full local Web regression suite | Run the combined Web UAT command on the built 5.1.40 SPA, covering all baseline role/localization/keyboard/device journeys plus the diagnostics and Knowledge role tests. | All four browser test files pass; each API response is synthetic, external traffic is blocked, and screenshots/JSON go to an isolated candidate evidence folder. | PASS at source `c9ff85f4094f60491def1bc3680b8758ac11dde6` (tree `c788d3e3323215a39e977f9a39a237b35dc05536`), `npm run test:uat`, 4/4 tests and 17 local journey checks. Evidence folder: `50-uat/evidence/uat-web-suite-5.1.40-source-c9ff85f4/`. |

Overall UAT remains **ACCEPTANCE INCOMPLETE — 33 PASS, 2 BLOCKED, 1 MANUAL**. UAT-009/010 PostgreSQL/identities and UAT-006 native device/audio remain open; full CRUD operation-role-surface coverage, broad accessibility/localization and deployed SEO/AEO remain partial or unverified. UAT-034/035 close scoped UI gaps; UAT-036 confirms the combined local Web suite.

---

## Current candidate 5.1.39 — exact-SHA write-contract case

| Case | Story / actor | Acceptance / steps | Result and evidence |
|---|---|---|---|
| UAT-033 | US-002 / US-004, API and Cloud management caller | Send server-owned fields, unsupported types and spoofed FlowVersion creator fields; verify the controller forwards the authenticated actor; compare mirrored backends. | PASS, regression 48/API and 41/Cloud, three assertions each; API 36/36 and Cloud 16/16 suites; exact source `a8a89f928312db2fef5142a0e07ac18a197b6c19`. Synthetic Web UAT is 2/2 and diagnostics 19/19. Evidence: `evidence/uat-local-web-5.1.39.json`; no DB/provider/client system used. |

---

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
