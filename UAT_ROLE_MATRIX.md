# UAT role matrix
Candidate5.0.54; Company Co fixtures only, separate fresh browser context per role; no production accounts created.

| Role | Rendered local journeys | Backend evidence |
|---|---|---|
| anonymous | home/login diagnostics, reset, mobile, themes | auth/pairing denial tests |
| guest | management redirect without loop | DB-role rejection tests |
| user/agent | not rendered separately | CRUD/runtime negative contracts |
| coordinator | management detail keyboard, disabled company mutation, collapsed widget | scoped CRUD/resource contracts |
| admin | same plus provider write-only replacement | cross-tenant and escalation negatives |
| superadmin | details, create-form labels/Escape/focus; AI screens separately tested | DB-authorized prompts/revisions/schema/usage |
No frontend fixture is represented as real login, OAuth or DB authorization acceptance.
