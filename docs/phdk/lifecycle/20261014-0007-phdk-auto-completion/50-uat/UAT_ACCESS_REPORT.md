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

