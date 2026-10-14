# UX journeys
| ID | Persona/entry | Happy outcome | Empty/loading/error/permission | Acceptance |
|---|---|---|---|---|
| J-005 dashboard | authenticated user/superadmin → dashboard | read localized greeting, today's metrics, role-appropriate summary and recent sessions | loading/empty state is translated; tables expose captions and column headers to assistive tech | UAT-T-005-DASHBOARD |
| J-006 session history/live | authorized superadmin → live or history | filter sessions, understand translated status and duration, inspect session detail | translated empty/loading states; labelled filters and refresh; accessible table captions/column headers | UAT-T-005-SESSIONS |
| J-001 diagnose | guest/login/app/admin | copy safe report then temporary check | clipboard denied retains icon; hidden live failure | UAT-002 |
| J-002 reset | any visitor | clear owned client cache/session, check before navigation | partial failure never false success; foreign/business data retained | UAT-002 |
| J-003 launch/call | configured operator | validate/pair/vendors/standby/voice/action/summary | invalid config/provider/disconnect explicit recovery | UAT-003/005 |
| J-004 manage | permitted admin role | list/detail/validated edit | empty/loading/validation/403 and cross-tenant denial | UAT-004 |
Native keyboard controls, focus, accessible names/non-color status. Public diagnostic never fetches privileged history. Browser only in UAT.
