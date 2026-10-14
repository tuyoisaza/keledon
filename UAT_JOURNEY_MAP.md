# UAT journey map — run 20261014-0007-phdk-auto-completion

| Persona | Story | Case / journey | Steps exercised | Result / evidence |
|---|---|---|---|---|
| Visitor | US-001 | UAT-001 / debug-widget | Public home → login → copy → denied copy → owned reset → responsive/theme/zoom checks | PASS; `docs/phdk/evidence/uat-local-web.json`, login screenshots. |
| Admin / coordinator / superadmin fixture | US-002 | UAT-002 / management & UAT-T-008/009 | Isolated role context → management details → attempt bounded team/user operations → vendor key replacement → voice profile and KELEDON dialogs | PASS for mocked UI/payloads only; same JSON evidence. |
| Tenant A / tenant B fixtures | US-002 | UAT-003 / API authorization | Regression scenarios for cross-company IDs, direct access, stale actor, low-role mutation | PASS in API/Cloud isolated regression suites; not persisted DB acceptance. |
| Integration administrator | US-003 | UAT-004 / vendor allowlist | Configure private origin, reject malformed/unlisted origins, safe CRUD projection, paired secret transfer | PASS in API/Cloud policy regression and Browser offline tests; no live private destination request. |
| Operator | US-004 | UAT-005 / synthetic call lifecycle | Authenticated synthetic command sequence → injected CRM adapter → close/standby and failure branches | PASS in `browser/tests/company-co-lifecycle.test.cjs`; no live vendor/audio call. |
| Desktop operator | US-004 | UAT-006 / native device | Pair Browser, OS media permission and device/audio session | MANUAL/BLOCKED; no native UAT performed in this run. |
| Superadmin test operator | US-002 | UAT-008/009 | Select permitted persisted test role, audit switch, access verified dev target | FAIL for missing active audited switch; actual development access additionally BLOCKED. |
| Data administrator | US-002 | UAT-010 / migration matrix | Apply migration in disposable DB and check 35-model matrix persistence/rollback | BLOCKED; no disposable DB configured. |

Role access actually authenticated: none. The browser fixture's role strings are intercepted and must not be represented as actual role authentication.



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
