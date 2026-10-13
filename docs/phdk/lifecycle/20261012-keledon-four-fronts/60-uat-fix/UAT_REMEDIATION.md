# UAT remediation — 20261012-keledon-four-fronts

## UAT-FIX-001 — detail dialog keyboard containment
Initial local browser UAT FAILED at local-uat.test.cjs:91: Tab from the only close control did not remain inside the native dialog. This failure is preserved here; no PASS inferred from HTMLDialogElement.
Root cause: relying solely on native modal inertness did not establish desired Tab wrapping.
Fix: explicit first/last focus wrapping on Tab/Shift+Tab; retain native Escape/close and opener restoration.
Retest: pending exact rebuilt v5.0.54 candidate. Other completed assertions before failure: diagnostic dimensions, copy success/revert/failure, owned state reset, mobile login and public mount.

## UAT-HARNESS-001 — provider loading transition
Second run passed dialog containment/focus for all three manager roles, then the test predicate dereferenced an input temporarily absent during legitimate config reload. Fixed predicate to await element reappearance; no provider behavior weakened. Retest pending.

## UAT-FIX-002 — raw CRUD health log/config disclosure

Finding: `CrudService` replaced process-wide `console.error`, retained arbitrary serialized messages, and exposed them in `/api/crud/health`; it also returned the configured cloud URL including path/query. This could disclose private log contents or URL credentials to a privileged caller and violated the diagnostics redaction contract.

Fix: removed the global logging interception and unused duplicate helper, stopped returning the raw error buffer, and restricted the cloud setting to its hostname. The health endpoint remains authenticated and superadmin-only under `CrudAccessGuard`; no role or data guard was weakened.

Retest: PASS on candidate `0d98f2812d8eb88a8626101f81f9bf9ca6d52de0` (5.1.2), `services/api/test/regression/22-admin-http-wiring.test.js` (real Nest HTTP guard wiring with isolated Prisma actors: anonymous 401, ordinary user 403, superadmin safe-summary 200) and `services/api/test/regression/24-crud-health-disclosure.test.js` (no global console mutation, raw error buffer, URL path/query, or secret value). No live service or database was used.

## UAT-FIX-003 — manager same-company team reassignment

Initial local production-SPA UAT exposed that admins/coordinators had a disabled company selector and disabled team selector while editing users, even though the approved tenant policy permits managing users and teams inside their own company. The API guard also rejected every `teamId` update, making the UI capability impossible to implement safely.

Fix: managers now see their company as read-only context, can select only brands and teams belonging to their DB-derived company, and may create or reassign a user to one of those teams. Manager requests omit role and company fields. The API validates the selected team against the actor's DB-derived tenant and continues to reject company changes, foreign teams, and role elevation. Superadmin remains the positive control with company and role controls.

Retest: PASS on candidate `0d98f2812d8eb88a8626101f81f9bf9ca6d52de0` (5.1.2) in the local production SPA with synthetic Company Co and Other Co fixtures, intercepted API requests, and the isolated real-Nest guard regression in `22-admin-http-wiring.test.js`. The UI test proves emitted create/update payloads, accessible Company fieldset/legend and hidden foreign team option; the API test proves same-company acceptance and cross-company/role denial. The mocked UI does not establish persistence or database behavior. Evidence: `docs/phdk/evidence/uat-local-web.json` and `docs/phdk/evidence/uat-admin-users-team-scope.png`.
