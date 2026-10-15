# UAT journey map — run 20261014-0007-phdk-auto-completion

## Candidate 5.1.66 — tenant flow configuration

| Persona | Story | Case / journey | Steps exercised | Result / evidence |
|---|---|---|---|---|
| Company Co tenant admin fixture | US-012 | UAT-059 / Flow editor | Open flow management → create definition → save/approve draft version → enable company availability → map intent → confirm no company picker | PASS in local production SPA with intercepted fixture APIs and blocked external traffic; evidence `50-uat/evidence/uat-web-5.1.66/`. |
| Tenant admin across API and Cloud | US-012 | UAT-058 / persistence boundaries | Run tenant flow service tests; validate Prisma schema and both migration contracts; assert composite permission FK and legacy import behavior | PASS for source/schema contracts only (API 7/7, Cloud 6/6). No DB connected. |
| Release owner / synthetic tenant admin | US-012 | UAT-060 / migration and restart persistence | Apply API/Cloud migrations to a disposable PostgreSQL instance; test two-tenant flow CRUD/import and restart readback | BLOCKED: PostgreSQL service, `psql`, and Docker unavailable in this workstation. |

The UI role is a synthetic session, not real authentication. The separate native Browser/device journey remains MANUAL because no physical test device/audio session was available.

## Candidate 5.1.36

| Persona | Story | Case / journey | Steps exercised | Result / evidence |
|---|---|---|---|---|
| Tenant user / admin fixture | US-009 | UAT-032 / Device management | Read-only user opens `/devices`; admin opens confirmation, cancels, retries after a mocked error, then confirms success. | PASS, screenshots and source-bound JSON `docs/phdk/evidence/uat-device-5.1.36.json`; no live auth/device or persistence. |
| Tenant admin / unscoped actor fixture | US-009 / CMT-004 | UAT-032 / API binding and revoke | Registration submits forged IDs; guard uses DB actor/company; missing company and cross-tenant or user revoke are denied. | PASS in API regression 21, isolated guard fixture; persistence remains unverified. |

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
