## UAT-128 — post-merge production AX presence

After PR #244's docs-only deploy settled, a fresh anonymous tab served KELEDON v5.2.6 at product source `e7257a7`. The accessibility tree exposed title, main landmark, illustrative-demo disclosure, diagnostic/theme/language controls, navigation, headings and public links. Web/API deployments `3688c933-9806-4546-aa2e-a1aa4515e4b7` / `27dba245-5425-47d4-a1cf-cdc3aee2f480` were SUCCESS for main `870e6db`. UAT-128 passes presence only. No controls were activated; no screen reader, full keyboard, WCAG, auth or device behavior is claimed. See `evidence/uat-128-production-postmerge-public-ax-2026-10-17.json`.

# UAT journey map — run 20261014-0007-phdk-auto-completion

## Production v5.2.6 — UAT-127 public accessibility-tree presence

| Persona | Story | Case / journey | Steps exercised | Result / evidence |
|---|---|---|---|---|
| Anonymous visitor | CMT-002 / public semantics | UAT-127 / homepage AX presence | Fresh anonymous production navigation → verify version/title, main landmark, demo disclosure, named diagnostic/theme/language controls, navigation/headings/public links → stop without activation | PASS for tree presence only. Initial navigation showed Cloudflare 502; second fresh navigation loaded v5.2.6. No screen-reader speech or interaction was tested. Evidence: `evidence/uat-127-production-public-ax-presence-2026-10-17.json`. |
## Production v5.2.6 — anonymous mobile header/menu target size

| Persona | Story | Case / journey | Steps exercised | Result / evidence |
|---|---|---|---|---|
| Anonymous visitor | CMT-002 / public navigation | UAT-125/126 / 44px mobile targets | Open public `/` → expand mobile navigation → measure home link, diagnostics/cache buttons, menu control, links, theme/language selectors and account links at 320×720 and 375×812 → close menu and reset viewport | PASS within measured scope: UAT-125 passes menu targets after PR #240; UAT-126 passes the logo/header plus menu after PR #241. All measured controls are at least 44px high and no horizontal overflow is present. Production v5.2.5/v5.2.6 evidence is in `evidence/uat-125-production-mobile-menu-targets-retest-2026-10-17.json` and `evidence/uat-126-production-mobile-brand-target-retest-2026-10-17.json`. No controls activated; screen reader, other routes/locales/themes, auth and audio remain open. |

## Candidate 5.1.73 — UAT-086/087 superadmin resource CRUD

| Persona | Story | Case / journey | Steps exercised | Result / evidence |
|---|---|---|---|---|
| Synthetic superadmin | CMT-004 | UAT-086 / User lifecycle | Create a User in Tenant B → assert default `user` → assign `admin` as superadmin → inspect details → confirm deletion | PASS on production-built Web with synthetic API; UAT-071/075/076 separately prove API/Cloud persisted authorization. `docs/phdk/evidence/uat-local-web.json`, `uat-superadmin-user-detail.png`. |
| Synthetic superadmin | CMT-004 | UAT-087 / Brand and Team lifecycle | Create/update/delete a Brand and Team → inspect explicit details and relation fields → verify confirmation and cleanup | PASS on production-built Web with synthetic API; UAT-075/076 separately prove API/Cloud persisted authorization. `docs/phdk/evidence/uat-local-web.json`, `uat-superadmin-brand-detail.png`, `uat-superadmin-team-detail.png`. |

## Candidate 5.1.73 — UAT-081 superadmin flow configuration

| Persona | Story | Case / journey | Steps exercised | Result / evidence |
|---|---|---|---|---|
| Synthetic superadmin | US-012 / CMT-003/CMT-004 | UAT-081 / Cross-company flow administration | Switch Company Co ↔ Tenant B → verify scoped definition reads → update/deactivate → create/approve version → enable/disable availability → add/remove intent mapping → open legacy view → assign owner → verify destination company view | PASS after UAT Fix; production-built Web uses synthetic intercepted APIs. Paired API/Cloud authorization and PostgreSQL persistence pass in UAT-083. `evidence/uat-flow-config-superadmin-web-5.1.73.json`. |

| Persona | Story | Case / journey | Steps exercised | Result / evidence |
|---|---|---|---|---|
| Persisted admin / superadmin / API and Cloud | CMT-004 | UAT-077 / global Workflow role boundary | Authenticate DB-derived admin → deny list/detail/create/update/delete → authenticate superadmin → list/detail/create/update/readback/delete Workflow → SQL cleanup | PASS in separate disposable PostgreSQL 16.15 databases; no UAT users/Workflow rows remain. Web and full matrix remain open. `evidence/uat-077-superadmin-workflow-5.1.73.json`. |
| Persisted superadmin / API and Cloud | CMT-004 | UAT-076 / global and Tenant B resource access | Authenticate → read global Companies/Brands/Teams/Users → direct-read Tenant B Brand/Team/User → create/delete Tenant B Brand/Team → create User as user → assign admin → safe readback → cleanup and SQL count checks | PASS in separate disposable PostgreSQL 16.15 databases; zero UAT-076 fixture users/Brands/Teams remain. Full CRUD matrix remains open. `evidence/uat-076-superadmin-cross-tenant-5.1.73.json`. |
| Persisted superadmin / API and Cloud | CMT-004 | UAT-075 / Brand, Team and User administration | Authenticate in separate disposable databases → create/update/delete Brand and Team in Tenant A → create User with default user role → assign admin role → read safe user detail → delete all UAT fixtures and verify cleanup | PASS in API and Cloud against isolated PostgreSQL 16.15; zero UAT accounts or created Brand/Team rows remain. The full CRUD matrix remains open. `evidence/uat-075-superadmin-resource-breadth-5.1.73.json`. |
| API/Cloud/Browser security policy | CMT-003 | UAT-074 / private origin allowlist | Validate client-configured private URL normalization → reject unsafe URLs/secrets → preserve tenant projections → block unconfigured navigation/resources/redirects → deny ambiguous worker scope | PASS: API 3/3, Cloud 3/3, Browser 13/13 source tests/builds; no customer/private endpoint used. `evidence/uat-074-private-origin-policy-5.1.73.json`. |
| Synthetic tenant admin | CMT-003 | UAT-073 / tenant flow editor | Create/edit/deactivate company-scoped flow → save draft/approved versions → enable company availability → map intent → verify 390px reflow | PASS: production-built Web UI/request journey with synthetic APIs; persisted API/Cloud auth and restart readback pass separately in UAT-079. `evidence/flow-editor-uat.json`. |
| Synthetic Web superadmin | CMT-004 | UAT-072 / Company Web lifecycle | Open Companies → create with Brazil → edit name/industry/countries → read back → confirm delete → verify fixture removed | PASS: 6 UI/request assertions on the production-built SPA; synthetic API only. `evidence/uat-072-web-company-superadmin-5.1.73.json`. |
| Persisted superadmin | CMT-004 | UAT-071 / Company lifecycle and role assignment | Register synthetic user → prepare isolated superadmin fixture → authenticate → list/open Company → create Company and countries → edit/read back → assign admin then coordinator in that Company → delete synthetic user/Company → verify database cleanup | PASS: 12 assertions per backend, 24 total, across API and Cloud. The Web Company interface was not exercised. `evidence/uat-071-superadmin-company-crud-5.1.73.json`. |
| Persisted coordinator A / tenant admin B | CMT-004 | UAT-070 / coordinator administration | Register synthetic account as user → prepare isolated coordinator fixture → authenticate against API and Cloud DBs → test own/foreign Company/User/Brand/Team list/detail → test denied company/role escalation → create/update/read/delete same-tenant fixtures → verify cleanup | PASS: 22 assertions per backend, 44 total. DB-derived coordinator tenant scope and persisted CRUD pass; fixture accounts and resources removed. `evidence/uat-070-coordinator-crud-5.1.73.json`. |
| Persisted tenant admin A / tenant admin B | CMT-004 | UAT-069 / tenant administration and CRUD | Authenticate synthetic DB identities → forge foreign list filter → open own and foreign Company/User/Brand IDs → attempt company create/delete and role elevation → create/update/read/delete User, Brand and Team fixtures → verify cleanup in API and Cloud | PASS: 19 assertions in each backend, 38 total. DB-derived tenant scope and persisted CRUD pass; fixtures removed. `evidence/uat-069-crud-roles-5.1.73.json`. Coordinator's persisted route journey and exhaustive matrix remain open. |
| Anonymous / tenant admin / superadmin | CMT-004 | UAT-068 / orphan cleanup | Request count/delete anonymously and as tenant admin → count/delete ended empty orphan as superadmin → verify active or related sessions remain → clean fixtures | PASS in API and Cloud. `evidence/uat-068-orphan-cleanup-5.1.73.json`. |

| Persona | Story | Case / journey | Steps exercised | Result / evidence |
|---|---|---|---|---|
| Visitor | US-001 | UAT-001 / debug-widget | Public home → login → copy/deny/reset → responsive/theme/zoom | PASS; synthetic built-SPA evidence in `docs/phdk/evidence/uat-local-web.json`. |
| Admin / coordinator / superadmin fixture | US-002 | UAT-002 / management | Role-shaped management views → scoped operations → write-only provider replacement → dialogs | PASS for mocked UI/payload; backend authorization is tested separately. |
| Tenant A / tenant B fixtures | US-002 | UAT-003 / API authorization | Cross-company IDs, stale actor, low-role and escalation attempts | PASS in API regression 20/20 suites; isolated fixtures, no persistent DB. |
| Integration administrator | US-003 | UAT-004 / vendor allowlist | Configure private origin; reject malformed/unlisted/cross-tenant inputs; inspect safe projections | PASS in API/Cloud policy and Browser offline tests; no private host contacted. |
| Operator | US-004 | UAT-005 / synthetic call lifecycle | Synthetic command sequence → injected adapter → completion/standby and failure branches | PASS in Browser offline tests; no live vendor/audio. |
| Desktop operator | US-004 | UAT-006 / native device | Pair Browser, OS media permission and device/audio session | MANUAL/BLOCKED; no native UAT performed. |
| Superadmin test operator | US-002 | UAT-008 / temporary synthetic profile | Select allowlisted profile → use bounded token → return through original superadmin session | PASS scoped; UI API mocked, server guards/audit/expiry/revocation tested in in-process Nest regression. |
| Test identities | US-002 | UAT-009 / real development login | Authenticate safe development target and validate actual DB-backed role | BLOCKED; target/accounts unavailable. |
| Data administrator | US-002 | UAT-010 / migration matrix | Disposable DB migration and 35-model persistence checks | BLOCKED; no disposable DB configured. |

No role authenticated against a live DB. Browser fixtures are never represented as real authentication. Overall UAT remains NOT ACCEPTED until external and manual gates close.


## Historical records from earlier candidates

# Journey map
## Current candidate 5.1.17

- **US-008 / UAT-T-008 / admin:** open Voice Profiles → force list 503 → observe localized alert and retry → open labeled modal → select provider/language → force create 403 → observe in-dialog error and no record change → allow 200 create → open delete confirmation → force 403 and observe error/no deletion → allow 204 and observe empty state. PASS in local Edge with synthetic intercepts; no backend persistence inferred.
- **US-007 / UAT-T-009 / admin:** open KELEDON management → open localized modal → fill labeled company/brand/team fields → submit synthetic create → assert expected API DTO with array semantics and no caller companyId → open delete confirmation → cancel and preserve record. PASS in local Edge with synthetic intercepts; persisted create/detail/delete remains unverified.
- **UAT-T-010 / admin/app users:** global `Toaster` mount restored so the existing notification API renders; the voice-profile dialog also retains its own `role=alert`. The API 403 failure was visible and no false success occurred. PASS for tested dialog behavior only.

Anonymous → home → login → diagnostics copy → safe reset → responsive/theme checks.
Superadmin/admin/coordinator → synthetic authorized company list → detail dialog → Tab/Escape/opener → collapsed navigation. Superadmin additionally opens create form. Admin → provider settings → blank key input → replacement save → cleared field → subsequent blank omission. Guest → attempted management → safe home redirect.
Runtime: authenticated configured client → answer → transcript → managed cloud decision → scoped browser execution/assertion → CRM result → successful close → standby. This path uses actual handlers and fake executor; live client platform selection is excluded. Failures branch to explicit error/cancellation, never a simulated successful close.

## 5.1.7 current execution evidence

On current source revision `edce7eafbe13ac16ab93274a87e12571e7b04b2e` (Git tree matches `origin/main`), local Edge replay passed the public home/login version widget, clipboard success/failure and reset preservation paths; theme selection; 390px login; admin/coordinator/superadmin fixture views; user create and same-company reassignment payload; provider secret replacement behavior; guest redirect; protected diagnostic toggling and safe-only probe. All API routes were intercepted, so journey outcomes at this layer are UI-only. The API regression suite 11/11 supplies separate isolated guard/startup evidence. Persisted CRUD and live database actor derivation were not joined end-to-end.
