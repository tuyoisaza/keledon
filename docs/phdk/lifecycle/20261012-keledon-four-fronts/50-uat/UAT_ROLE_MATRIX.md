# UAT role matrix
Candidate 5.1.0, local built web UI, Company Co fixtures only, separate fresh browser context per role; no production accounts created. Backend results below are from isolated API tests, not these browser sessions.

| Role | Rendered local journeys | Backend evidence |
|---|---|---|
| anonymous | home/login diagnostics, reset, mobile, themes | selected auth/pairing denial tests |
| guest | management redirect without loop | DB-role rejection tests |
| user/agent | not rendered separately in current SPA run | selected CRUD/runtime negative contracts |
| coordinator | management detail keyboard, disabled company mutation, collapsed widget | scoped CRUD/resource contracts |
| admin | same plus provider write-only replacement | cross-tenant and escalation negatives |
| superadmin | details, create-form labels/Escape/focus; AI screens separately tested | DB-authorized prompts/revisions/schema/usage |
The rendered superadmin/admin/coordinator roles are frontend fixtures driven by a synthetic token; they test presentation and interactions only. No frontend fixture is represented as real login, OAuth, or DB authorization acceptance. Actual backend role-session and exhaustive per-resource tenant coverage remain open.
