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

