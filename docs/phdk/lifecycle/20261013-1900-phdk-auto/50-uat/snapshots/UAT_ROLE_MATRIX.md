# UAT role matrix
## Current 5.1.17 local candidate (synthetic frontend only)

| Persona | Observed UI coverage | Server evidence / limitation |
|---|---|---|
| anonymous | Public home/login diagnostics actions, viewport/theme and safe state reset. | No authentication; API behavior intercepted. |
| guest | Management access denial/redirect without a loop. | Synthetic session only; server guard regressions are separate. |
| user / agent | No separate persisted identity journey in this candidate. | API regression contains low-role denies; no provisioned account or session. |
| coordinator | Selected tenant-admin detail/navigation and mutation restriction presentation. | API guard/policy regression uses isolated fake persistence, not live DB. |
| admin | KELEDON create/cancel and Voice Profiles create/delete/error states; other admin flows in existing UAT. | API regression covers current-DB tenant derivation and role boundaries; no persisted CRUD. |
| superadmin | Selected company detail and privileged affordance presentation. | No role switching or impersonation was performed in the browser; DB-derived controls covered only by isolated API regression. |

Each browser persona is a synthetic session value in an isolated context. It does not represent a real login, provisioned test identity or role-switching acceptance.

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

## Current candidate 5.1.7 status

Revision `edce7eafbe13ac16ab93274a87e12571e7b04b2e` was exercised in local Edge UAT; the tree matches remote main. Anonymous, guest, admin, coordinator and superadmin **UI presentations** were exercised with synthetic sessions and intercepted APIs. Only the test values are synthetic identities, not provisioned backend accounts. Selected server-side roles/tenant denial paths were exercised in isolated Nest HTTP tests (API suite 11/11); user/agent persistence and the exhaustive resource × role × tenant × surface × operation matrix are not verified. Do not interpret frontend role selection as authorization evidence.
