# UAT cases — 5.1.0

Run against the local production web build on 2026-10-13. Browser HTTP requests outside the local origin and all WebSockets are blocked; app API routes return synthetic Company Co responses. Results describe only the executed layer.

| Case / story | Steps and assertions | Result / evidence |
|---|---|---|
| UAT-001 / US-001 | Reconcile five package versions/locks, current candidate SHA, PR #42 and outstanding target-main state. | PASS for branch evidence; PR open means delivery remains incomplete. Integration report and PR metadata. |
| UAT-002 / US-002 | Anonymous home/login: version controls, dimensions, awaited copy success/failure, owned-state reset preserving foreign storage, 390px layout. | PASS local Edge. `services/web/test/local-uat.test.cjs`, `uat-local-web.json`, screenshots. |
| UAT-003 / US-003 | Exercise synthetic answer/transcript/decision/CRM/hangup/standby contracts, queue/cancellation, and RPA validation. | PASS focused contract tests; no live client/vendor execution. See runtime workstream evidence. |
| UAT-004 / US-004 | Fresh synthetic superadmin/admin/coordinator sessions: company-detail dialog, Tab/Escape/focus restoration, tenant admin mutation control, collapsed navigation; provider key input empty, replacement cleared, untouched blank omitted. Guest management redirect. | PASS frontend fixture only. Separate actual guard/service tests establish covered backend rules; frontend role selection does not prove backend authorization. |
| UAT-005 / US-003/US-005 | Exercise auth/tenant/no-key/disabled-prompt/schema/budget/origin/failing-step negative contracts. | PASS isolated tests; no provider metering or external calls. |
| UAT-006 / US-002 | In production SPA, verify debug starts off with zero `/health/deep` reads; turn on for one read; show safe GET and manual-only CRM route; click safe probe for exactly one `{}` POST; verify correlation evidence; turn off and clear results without another read. | PASS local Edge with mocked diagnostics API. No live diagnostics endpoint or real-role response. Evidence: `uat-local-web.json`, `uat-admin-endpoint-diagnostics.png`. |
| UAT-THEME / US-006 | Select/persist light, dark, corporate theme and inspect login shell; capture 390px layout. | PASS scoped shell checks; no full-app contrast certification. |
| UAT-ACCESS / US-006 | Keyboard and focus checks for the dialogs above. | PASS for executed dialogs; broad WCAG audit, all routes/locales, and screen-reader review remain OPEN. |
| UAT-CRUD / US-004 | Trace create/list/detail/update/delete and tenant access per resource in `../20-plan/CRUD_MATRIX.md`. | PARTIAL/BLOCKED: exact mutation/access coverage not yet demonstrated for every listed resource; source route presence is not CRUD acceptance. |
| UAT-ROLE / US-004 | Exercise fresh actual backend sessions for user, coordinator, admin, and superadmin across tenant boundaries. | PARTIAL: isolated authorization tests cover specific guards/services; no connected database or full matrix session run. |
| UAT-ELECTRON / US-002/US-006 | Install/run native Electron widget and verify rendered behavior and real device/audio boundaries. | NOT EXECUTED; helper contracts/source review only. |

Previous candidate failures and fixes remain documented in `../60-uat-fix/UAT_REPORT.md` and `UAT_REMEDIATION.md`. No user/account/database provisioning, provider call, metered inference, client data, or production access occurred. See `UAT_ACCESS_REPORT.md` for provenance and `UAT_ROLE_MATRIX.md` for role boundaries.
