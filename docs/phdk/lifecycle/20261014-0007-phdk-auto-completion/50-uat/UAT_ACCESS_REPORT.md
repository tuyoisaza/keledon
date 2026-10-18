## UAT-153 — despliegue documental 5.2.17 y caché HTML (2026-10-18)

PR #269 está en `main` `f50b264ee31ae481c79e6075843c8d1c532bbe24`. Railway Web `0e243dd7-68f2-4fbb-81d6-8e87f937390c` y API `75d38759-c02f-426e-ba45-64c1d9a366c8` reportan `SUCCESS` para ese SHA. Una pestaña Chrome nueva a `/login` sin query todavía mostraba v5.2.16; otra pestaña con `?phdk-uat-20261018=269` mostró v5.2.17 y los controles de diagnóstico esperados. Esto es `PASS_SCOPED` para despliegue y lectura de versión; la discrepancia prueba HTML obsoleto en la ruta normal/cache, no un deploy fallido. No se activaron controles ni se autenticó. Evidencia: `evidence/uat-153-production-v5-2-17-deploy-readback-2026-10-18.json`.

## UAT-152 — producción anónima, login y controles de diagnóstico (2026-10-18)

En una pestaña Chrome nueva, `/login` de producción muestra KELEDON v5.2.16 y controles accesibles “Copiar diagnóstico completo” y “Limpiar caché”. UAT-152 **PASS_SCOPED** acepta únicamente render y nombres para visitante anónimo, contra main `b54d747a63da8c27fa1358c3db82d2787038f966`. No midió geometría ni activó copiar/reset. El nuevo fix de fuente 5.2.18 sigue sin publicar y no está probado por esta observación. Evidencia: `evidence/uat-152-production-login-diagnostics-2026-10-18.json`. Sin login, cambios, lectura de portapapeles, limpieza, datos de cliente ni gasto.

## Browser Readiness — UAT-150 route regression on production 5.2.15 (2026-10-18)

- Stage/run: Auto `20261014-0007-phdk-auto-completion`, `50-uat`; permission `ACTIVE_UAT_EXCEPTION`; spend `NO_NEW_SPEND`.
- Candidate: production `main` `a1bef76ccdd3b76a8b9c4201ee41b88ac14b16f6`, KELEDON 5.2.15; Railway Web/API `SUCCESS`.
- Target/tool: `https://keledon.tuyoisaza.com/admin/interfaces`, fresh Chrome UAT tab via CUA; harmless navigation and screenshot verified; capability `AVAILABLE_VERIFIED`.
- Actions: direct anonymous catalog-route navigation, then `/management/teams` as a known protected-route control. No login, form, mutation, customer data, secret, clipboard read, cache clear or provider access.
- Actual: catalog path displays localized static 404; control path resolves to `/login` and shows Web `v5.2.15`. The catalog response has `Server: cloudflare`, `cf-cache-status: DYNAMIC`, `CF-RAY: a4c92d7e0cf9087e-DFW`, HTTP 404. Source maps the path through Nginx `known_spa_route` only; the new path is missing. Browser screenshot is present in the active UAT tool trace, not exported as a repository image.
- Cases: UAT-150 `FAIL_REPRODUCED`; exact retest after 5.2.16 Web deploy. Authenticated route/role behavior remains untested pending an existing superadmin session.
- Retest: after PR #267 merged as `ac5d91867105773bf02f5ba41b23263b87256aa7`, Railway Web deployment `5c158bc5-99c2-43d3-80d2-650f42dcba00` SUCCESS, fresh anonymous navigation to the same URL resolves to `/login` and displays v5.2.16. UAT-150 is now `PASS_SCOPED` for direct route/guard behavior; authenticated operations remain untested.

## Browser Readiness — UAT-151 login diagnostics controls on production 5.2.15 (2026-10-18)

- Stage/run: Auto `20261014-0007-phdk-auto-completion`, `50-uat`; permission `ACTIVE_UAT_EXCEPTION`; spend `NO_NEW_SPEND`.
- Target/tool: anonymous `https://keledon.tuyoisaza.com/login`; fresh Chrome/CUA tab; navigation and read-only AX/DOM measurements succeeded; `AVAILABLE_VERIFIED`.
- Actual: Web v5.2.15; copy/clear controls have accessible Spanish names and 44×44 CSS px hit targets at 1581px viewport; no horizontal overflow (document/client widths 1581/1581).
- Access: no login, control activation, clipboard read, cache clear, customer data or mutation. Evidence `evidence/uat-151-production-login-widget-2026-10-18.json`.
- Result: `PASS_SCOPED`; mobile, screen-reader, copy payload and cleanup execution remain unverified.

## Production browser readiness — UAT-142 post-deploy (2026-10-18)

Status `AVAILABLE_VERIFIED`; anonymous production `/login` only. Railway Web `d777d27b-fcc2-4514-978b-d2af716bd6f8` and API `3786bdea-d9f6-439f-9b8d-b436be87550f` report SUCCESS for main commit `f9570d998a070ec7bc588f6fef1a85a7ee1c3cc4`. A newly opened tab first displayed 5.2.10; one ordinary reload displayed 5.2.11. At 320×720, four targets and page width pass; DOM rectangles reveal the header overlaps the H1 by 29.3px. This is a bounded production UAT finding. No sign-in, field entry, submit, OAuth, diagnostics/cache action, clipboard or customer access. Viewport reset to default after capture. UAT-145 awaits the 5.2.12 spacing candidate.
---

## Browser Readiness — UAT-141 production mobile login (2026-10-17)

- Stage/run: Auto `20261014-0007-phdk-auto-completion`, `50-uat`; permission `ACTIVE_UAT_EXCEPTION`; runtime capability `AVAILABLE_VERIFIED` via the connected Codex in-app browser/CUA.
- Target: anonymous production `https://keledon.tuyoisaza.com/login`; product version v5.2.10 confirmed in the fresh page; source `fd429298a85bdcf3b5c20791f9b1598c132aabcb`; current documentary main `edd18be5dd8fd2c49c866f9006ee0f408642e9b4`.
- Operation/evidence: fresh tab navigation, AX snapshot and full-page screenshot at temporary 320×720 CSS viewport; visible form and touch-target bounds recorded in `evidence/uat-141-production-login-mobile-320-2026-10-17.json`. Screenshot was visually inspected in the UAT session but not exported to the repository.
- Safety: anonymous only. No login, signup, OAuth, field entry, diagnostics/cache action, clipboard, customer data, private endpoint or write. Temporary viewport was reset and 1280×720 default confirmed.
- Executed: UAT-141; no horizontal overflow. Four targets fail the PHDK 44px minimum. Screen reader, 200%/400% browser zoom and other locale/theme combinations remain open. No new spend.
- Next action: retest UAT-142 against deployed v5.2.11; keep CMT-002 partial until the defect retest and broader accessibility gates complete.

## Latest Auto Force production browser entry — 2026-10-18

See `docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/50-uat/revalidations/20261018-autoforce/UAT_ACCESS_REPORT.md`. Browser access was `AVAILABLE_VERIFIED`; production `/` served v5.2.10 and anonymous `/management/teams` resolved to `/login`. PR #259/5.2.11 was not deployed. The UAT-141 baseline fail was reproduced read-only: header brand 152×40, email 399×41, password 399×41, create-account 69×20 CSS px. UAT-142 remains blocked until the candidate is deployed. No login, mutation, customer data, or local app tests/build/lint.

---
## Browser Readiness — UAT-140 localized production 404 (2026-10-17)

- Run/stage: Auto `20261014-0007-phdk-auto-completion`, `50-uat`; anonymous public production only; permission `ACTIVE_UAT_EXCEPTION` and CUA access `AVAILABLE_VERIFIED`.
- Candidate: KELEDON 5.2.10, main `fd429298a85bdcf3b5c20791f9b1598c132aabcb`, PR #255. Railway Web `15f47990-5368-4462-aeba-0d508c388262` and API `1b391751-bfc4-4d88-8131-ae239a3c5a07` SUCCESS, 1/1 each.
- Runtime: production homepage confirmed `v5.2.10`. Visible language selector was changed from English back to Portuguese, then a synthetic unknown path rendered in Portuguese.
- Access: HTTP GET `/phdk-uat-unknown-140` and `/404.js`; no sign-in, credentials, form submit, customer data, private endpoint, write, clipboard read or cache clear. The synthetic path remained in the address bar.
- Result: PASS_SCOPED: 404/noindex/no-canonical, localized title and visible copy. The script sets `document.documentElement.lang='pt'`; the available AX interface does not directly expose the attribute.
- Spend: `NO_NEW_SPEND`. Evidence: `evidence/uat-140-production-localized-404-2026-10-17.json`.

## Browser Readiness — UAT-135–139, KELEDON 5.2.9 production routes (2026-10-17)

- Run/stage: Auto `20261014-0007-phdk-auto-completion`, stage `50-uat`; permission `ACTIVE_UAT_EXCEPTION`; production target `https://keledon.tuyoisaza.com`.
- Candidate: main `1a7216dfd5431c712b3968bce93099b2196da93e`, KELEDON 5.2.9. Railway Web `8c7ab848-a86c-4ba2-bb67-641512055856` and API `554fa13f-65a6-44f8-a71c-8ed58691db75` report SUCCESS, each 1/1; no pending work, issues or recent failures.
- Runtime: CUA in-app browser `AVAILABLE_VERIFIED`; anonymous homepage navigation displayed v5.2.9 and the expected product content. HTTP GET observations are recorded in `evidence/uat-135-139-production-routes-2026-10-17.json`.
- Access: public root, login, one synthetic session path, one synthetic unknown path, robots and sitemap only. No credentials, OAuth/signup action, customer data, private destination, write, clipboard read or cache clear.
- Result: UAT-135, 136, 137 and 139 PASS. UAT-138 passes 404/noindex/no-canonical/no-redirect but is PARTIAL because the static 404 text ignored saved Portuguese. Follow-up UAT-140 retests localization on 5.2.10.
- Spend: `NO_NEW_SPEND`.

## Browser Readiness — UAT-131 production public theme/locale matrix (2026-10-17)

- Stage/run: Auto `50-uat`, `20261014-0007-phdk-auto-completion`; authorized production-only public UAT; anonymous homepage.
- Candidate/target: product SHA `a7ca8689265642e6fe1f2f69aa4fa2c90b81867b`, Web v5.2.7; `https://keledon.tuyoisaza.com/?phdk-uat-cmt002-theme-20261017=1`.
- Runtime: connected CUA in-app browser `AVAILABLE_VERIFIED`; production page loaded and exposed expected v5.2.7 controls.
- Access: selector interactions only across es/en/pt and dark/light/corporate. No login, customer data, CRM, endpoint probe, clipboard read or cache clear.
- Restoration: ephemeral tab restored to its initial dark/PT preferences after the matrix.
- Result: all 9 selector/localization combinations pass AX review; four desktop combinations were screenshot-inspected for compact widget presentation. This does not prove contrast, full WCAG, mobile or authenticated behavior.
- Spend: `NO_NEW_SPEND`.
- Evidence: `evidence/uat-131-production-theme-locale-matrix-2026-10-17.json`.

## Browser Readiness — UAT-130 production copy status (2026-10-17)

- Stage/run: Auto `50-uat`, `20261014-0007-phdk-auto-completion`; owner authorized acceptance on production; `ACTIVE_UAT_EXCEPTION` for this bounded anonymous public case.
- Candidate/target: product main `a7ca8689265642e6fe1f2f69aa4fa2c90b81867b`, KELEDON 5.2.7; public `https://keledon.tuyoisaza.com/?phdk-uat-130=20261017`.
- Runtime: CUA in-app browser `AVAILABLE_VERIFIED`; Railway Web deployment `c731a6ec-db04-42b4-9738-838eebc151d2` and API deployment `072f618b-3142-4615-babb-62aa73a64de2` both `SUCCESS`, each 1/1 running; no pending work, warning or recent failure.
- Access: anonymous public page only; no login, account, customer record, CRM, API probe or private network destination. Existing unrelated customer tabs were not accessed.
- Action boundary: activate only Copy diagnostics to observe accessible success/failure feedback. Do not inspect, export or attach clipboard contents. Do not activate cache clear.
- Landing deployment: Railway service inventory contains Web/API but no Landing service; the Web Dockerfile builds `services/web` only. No authoritative Landing production destination is present in current project records, so UAT-130 cannot claim Landing runtime acceptance.
- Spend: `NO_NEW_SPEND`.
- Result: public Web displayed v5.2.7 and the copy action announced “Diagnóstico copiado” in the accessibility tree. Clipboard remained unread; cache clear and login were untouched. PASS for Web copy status/source contract; Landing runtime BLOCKED pending a verified target.

## Browser Readiness — UAT-129 producción: teclado público (2026-10-17)

- Permiso: UAT público anónimo autorizado; CUA in-app browser verificado.
- Producto candidato: KELEDON 5.2.6 source `e7257a7d0c66c8b34e6bbb7028c30be092f33102`; main `9d34bb82b67e62457fd9333d4ca5e3d5ba7d8c12`, deploy documental #245. Web `b3dd466a-5c1a-40a9-ac99-c032cfaa6d32` y API `430a4bd6-4d9f-4b32-89c9-10501c617df1` SUCCESS.
- Identidad/datos: anonymous; sin sesión, credenciales, formularios, API write o datos cliente.
- Ejecución: 11 Tab; foco pasó del encabezado al CTA. Evidencia visual de foco en link de nav y CTA; no se activó elemento.
- Resultado: PASS para orden/foco muestreados; lector de pantalla, WCAG integral, auth/RBAC, otros estados/rutas y device permanecen fuera.
- Spend: `NO_NEW_SPEND`.

## Browser Readiness — UAT-128 post-merge production public AX (2026-10-17)

- Stage/run: Auto UAT, `20261014-0007-phdk-auto-completion`; browser permission `ACTIVE_UAT_EXCEPTION`.
- Candidate/target: product source `e7257a7d0c66c8b34e6bbb7028c30be092f33102`, version 5.2.6; after docs-only PR #244 deploy commit `870e6db`; fresh anonymous homepage.
- Runtime: connected CUA in-app browser `AVAILABLE_VERIFIED`; Web deployment `3688c933-9806-4546-aa2e-a1aa4515e4b7` and API `27dba245-5425-47d4-a1cf-cdc3aee2f480` SUCCESS; no pending work at readback.
- Data/identity: anonymous only; no credentials, customer data, mutation, CRM/private host or account action.
- Spend: `NO_NEW_SPEND`.
- Result: UAT-128 PASS for public AX presence only. No controls activated.

# UAT access report — run 20261014-0007-phdk-auto-completion

## Browser Readiness — UAT-127 production public AX re-entry (2026-10-17)

- Stage/run: Auto UAT, `20261014-0007-phdk-auto-completion`; browser permission `ACTIVE_UAT_EXCEPTION`.
- Candidate/target: product source `e7257a7d0c66c8b34e6bbb7028c30be092f33102`, version 5.2.6; `https://keledon.tuyoisaza.com/` anonymous homepage; current Railway Web/API deployments both SUCCESS and 1/1 replicas running, no recent failures/pending work in bounded provider status read.
- Capability: CUA in-app browser **AVAILABLE_VERIFIED**. First fresh anonymous navigation showed Cloudflare 502 at 20:44:13Z; a second fresh navigation loaded the current v5.2.6 page and its AX tree. Cause of first response is unknown.
- Data/identity: anonymous only; no credentials, customer data, API writes, CRM/private host, account action or local application test/build.
- Spend: `NO_NEW_SPEND`.
- Executed: accessibility-tree presence check for version/title, main landmark, demo disclosure, diagnostic/theme/language labels, navigation, headings and public links. No control was activated.
- Result: UAT-127 PASS for AX presence only. Screen reader, keyboard, zoom, full route/locale/theme coverage, diagnostic RBAC and audio remain open.
## Browser Readiness — UAT-125/126 production mobile acceptance (2026-10-17)

- Permission: current owner instruction requires acceptance on production; browser scope is active for this Auto UAT. Actual CUA in-app browser access was verified and the named public production origin loaded successfully.
- Target/source: `https://keledon.tuyoisaza.com/`; UAT-125 baseline v5.2.4, retest v5.2.5; UAT-126 retest v5.2.6 at deployed Web source `e7257a7d0c66c8b34e6bbb7028c30be092f33102` (Railway Web `874b29df-7c7d-4e3b-a41d-8ec7339bfde8`, `SUCCESS`).
- Identity/data: anonymous public homepage only. No login, credentials, customer data, API mutation, CRM, provider endpoint or account action.
- Spend: `NO_NEW_SPEND`; no paid provider or external customer endpoint was contacted.
- Executed: production mobile menu and header geometry/screenshots at 320×720 and 375×812; all measured visible targets are at least 44px high, client/document/body widths match, and temporary viewport override was reset. Web page visibly reports v5.2.6.
- Remaining gates: authenticated navigation/RBAC, other routes, locales/themes, screen reader, zoom, other browser engines and device/audio remain outside this anonymous mobile sample; synthetic production identities/device fixtures are still required for those journeys.

## Browser Readiness — Auto UAT-095, candidate 5.1.85

- Permission: `ACTIVE_UAT_EXCEPTION`; actual browser capability: `AVAILABLE_VERIFIED`.
- Candidate/revision: local production build of `fix/phdk-auto-5-1-85-keyboard-agent-selection`, package version 5.1.85; source candidate is under test. Browser verification was performed 2026-10-17 12:27 UTC.
- Target: `http://127.0.0.1:4173/`, local Web production preview. The connected Codex in-app browser navigated to the page and exposed title “KELEDON | Cloud-governed contact center runtime” plus visible version `v5.1.85` in the accessibility tree.
- Data/identity: public landing page only; no account, credentials, live API, production/customer data, or provider endpoint. The authenticated agent dashboard was not loaded because no safe synthetic socket fixture exists in this checkout.
- Spend disposition: `NO_NEW_SPEND`. No external traffic was required.
- Executed: local candidate navigation and source-contract assertions UAT-095 2/2. Authenticated populated-card keyboard action and screen-reader behavior remain `MANUAL`; no browser PASS is claimed for those behaviors.
- Owner action/resume: no action is required for the source slice; resume the manual journey when a safe synthetic socket fixture and accessible test actor are available, then run the UAT-095 populated-card and screen-reader checks.

## Candidate 5.1.73 — UAT-081 local synthetic superadmin

Target: production-built Web SPA served on ephemeral loopback by Playwright. The synthetic `superadmin@company-co.invalid` actor, two companies and flow API responses exist only in an in-memory fixture; non-local HTTP and WebSockets are blocked. No real user, database, customer endpoint or provider account was accessed. This does not authenticate a real account or prove backend superadmin authorization.

## UAT-071 — 5.1.73 persisted superadmin Company access

API and Cloud each authenticated a synthetic superadmin whose role was read from its disposable PostgreSQL database. Each service passed 12 assertions covering global Company list, direct detail, Company create/update/delete with country relations, user role/company assignment, normal response credential omission, and verification that test Company/country rows were deleted. Temporary test superadmin and assigned user were removed; a pre-existing API synthetic superadmin was unchanged. No hosted target or real identity was used. Evidence: `evidence/uat-071-superadmin-company-crud-5.1.73.json`.

## UAT-070 — 5.1.73 persisted coordinator access

API and Cloud each authenticated a synthetic coordinator whose role/company were read from their own disposable PostgreSQL database. Each backend passed 22 HTTP/persistence assertions for Company, User, Brand and Team tenant scope, forbidden company/role actions, same-tenant mutations and cleanup. Registration first returned role=user; coordinator assignment existed only as a synthetic local database fixture. All temporary rows were removed, candidate counts returned to zero and all runtimes stopped. Evidence: `evidence/uat-070-coordinator-crud-5.1.73.json`.

## UAT-069 — 5.1.73 persisted tenant CRUD access

Two synthetic tenant-admin actors from separate Company Co-style tenants authenticated through the local API and were resolved independently against the API and Cloud disposable PostgreSQL databases. API and Cloud each passed 19 HTTP/persistence assertions covering Company, User, Brand and Team list/detail/create/update/delete, tenant A/B isolation, blocked company create/delete, blocked privilege elevation, role=user provisioning and cleanup. Temporary users/brands/teams were removed; both databases reported zero temporary records; the services and database cluster were stopped. No hosted target or real identity was used. Evidence: `evidence/uat-069-crud-roles-5.1.73.json`.

## UAT-068 — 5.1.73 orphan-session cleanup access

On separate disposable PostgreSQL 16.15 databases, authenticated API and Cloud count/delete routes returned 401 for anonymous callers and 403 for persisted tenant admins. Current-database superadmins counted and removed exactly one synthetic ended/empty orphan; active, metadata-bearing, Event-bearing, FlowRun-bearing and SubAgent-bearing sessions remained. All synthetic rows and the temporary Cloud superadmin were removed, and both databases returned to zero eligible candidates. Runtime listeners and the PostgreSQL cluster were stopped. Evidence: `evidence/uat-068-orphan-cleanup-5.1.73.json`.

## Latest continuation — live Qdrant delete (2026-10-14 local)

Isolated Qdrant 1.19.2 and PostgreSQL 16.15 ran on loopback with synthetic `.invalid` identity and tenant data. API document delete removed the persisted document and matching Qdrant points; API base delete removed the collection and database rows (verified with read-only SQL because individual base GET returns 403 for this role). Exact-source evidence: `evidence/uat-qdrant-delete-5.1.52.json`. No production/customer endpoint, data, device or deployment was used. Delete/reindex concurrency was not exercised.

## Latest continuation — 2026-10-14 local / 2026-10-15 UTC, candidate 5.1.52

The 5.1.51 DB-backed UAT remains the baseline for migrations, persisted registration/login, roles, tenant boundaries, secret migration and safe vendor projections. On exact candidate `03ea78968103aa6bc6290ed0681b1c1ea345872a` / 5.1.52, an admin authenticated against the same disposable PostgreSQL 16.15 database; allowed session create and metadata/status update persisted and read back, while legacy `summary` writes and team reassignment returned HTTP 403. Detailed combined evidence: `evidence/uat-postgres-roles-5.1.52-03ea7896.json`; baseline evidence: `evidence/uat-postgres-roles-5.1.51-5b7e2551.json`.

The exact 5.1.52 built-Web suite was rerun with `npm run test:uat`: 4/4 suites passed. It uses mocked Company Co APIs, intercepted external traffic and simulated viewport dimensions; it does not certify a deployed login, full-app WCAG conformance or native media consent.

KnowledgeBase and KnowledgeDocument create/update/read passed against PostgreSQL. Delete could not pass because the isolated Qdrant service was unavailable; the API kept vector cleanup as a dependency and no vector data changed. UAT-010 is therefore scoped PASS with this Qdrant-dependent delete path BLOCKED. The API and PostgreSQL processes are stopped; only the isolated synthetic cluster remains in task temp. No production DB, customer endpoint, external provider, email, or physical microphone was used.

Target exercised: local built production SPA served at loopback with Company Co synthetic fixture and intercepted API; outbound HTTP/WebSocket is blocked by the harness. This does not verify a deployed development URL or authenticate a real account.

| Access target | Method | Identity/data | Result / cleanup |
|---|---|---|---|
| Local Web SPA | Local static build and Playwright; isolated ephemeral contexts | Synthetic fixtures only; role values mocked by `/api/auth/me`; emails use `.invalid` domain | Allowed UAT-only local test; server/context closed at completion. |
| API/Cloud policy | Local regressions plus loopback API against disposable PostgreSQL | Synthetic actor/company IDs; no provider requests | Session CRUD persisted; API and DB stopped after UAT. |
| Deployed development | No reachable/verified safe target configured | No accounts, credentials or tokens used | BLOCKED; user can resume by providing the non-secret development URL and confirming it contains synthetic test data, then authenticate in their own secure interface if needed. |
| Native Electron/device | No supported physical media session in this UAT run | No camera/mic/device data captured | MANUAL/BLOCKED; requires permitted test device and supported Windows host. |
| Disposable DB | PostgreSQL 16.15, `127.0.0.1:55432`; API `127.0.0.1:3041` | Synthetic `.invalid` identities and tenant fixtures | PASS for listed migrations/auth/role/tenant/session operations; exhaustive model matrix and Qdrant-backed deletion remain open. |

No account provisioning, test-role switch, email delivery, production browsing, provider write, paid call, database migration or secret read occurred.

## Browser Readiness — UAT-132 production login locale/theme and keyboard (2026-10-17)

- Stage/run: Auto `50-uat`, `20261014-0007-phdk-auto-completion`; owner-authorized production-only public UAT; anonymous `/login`.
- Candidate/target: KELEDON Web v5.2.7, product source `a7ca8689265642e6fe1f2f69aa4fa2c90b81867b`; `https://keledon.tuyoisaza.com/login?phdk-uat-cmt002-login-20261017=1`.
- Runtime: connected CUA browser `AVAILABLE_VERIFIED`; page displayed v5.2.7 and localized login form tree.
- Access: selector interactions across ES/EN/PT and dark/light/corporate; six-target forward Tab sample in ES/dark. No credentials, login, OAuth, signup, customer data, CRM, clipboard read, cache clear, endpoint probe or mutation.
- Restoration: ephemeral tab restored to its initial dark/PT preferences.
- Result: PASS for nine AX states, localized field/action labels and one forward keyboard sample only. Contrast, screen reader, full keyboard, mobile and authentication remain unverified.
- Spend: `NO_NEW_SPEND`.
- Evidence: `evidence/uat-132-production-login-locale-keyboard-2026-10-17.json`.


## Browser Readiness — UAT-151 revalidation on production 5.2.16 (2026-10-18)

- Fresh anonymous `/login` opened in the in-app browser; page showed v5.2.16, both accessible diagnostic control names, locale/theme selectors and login form. AX tree and screenshot are visible in the active UAT trace.
- No sign-in, control activation, clipboard read, cache clear, field entry, customer data or mutation.
- PASS_SCOPED for current rendering/accessibility names. Target geometry and horizontal overflow were not remeasured in this revalidation; the earlier 44×44 CSS px / 1581px measurements apply to 5.2.15 only. Evidence is appended to `evidence/uat-151-production-login-widget-2026-10-18.json`.
## Browser readiness — UAT-154 post-deploy Web readback (2026-10-18)

- Stage/run: Auto `20261014-0007-phdk-auto-completion`, `50-uat`; anonymous production `/login`; `ACTIVE_UAT_EXCEPTION`; `NO_NEW_SPEND`.
- Candidate: KELEDON 5.2.18, remote main `b1dd123fb66d861fa3b5507b79d85fa888bdc6d7`; Railway Web `62d02378-aebc-4c1f-8072-7d3bda4e36d7` `SUCCESS`; API `20093638-99f4-41cd-96e8-ab4fbce45662` `DEPLOYING` at capture.
- Tool/target: fresh Chrome tab via CUA at `https://keledon.tuyoisaza.com/login?phdk-uat-20261018=270`; access verified; AX tree exposed v5.2.18, Spanish diagnostic labels and anonymous login.
- Scope/safety: navigation, reload and read-only AX observation only. No login, data entry, submit, clipboard read/copy, cache clear, storage mutation, customer data, private endpoint or provider write. Evidence `evidence/uat-154-production-v5-2-18-widget-readback-2026-10-18.json`.
- Result: `PASS_SCOPED` for deployed Web version and accessible control-name presence only; interaction behavior and API deployment acceptance remain pending.
