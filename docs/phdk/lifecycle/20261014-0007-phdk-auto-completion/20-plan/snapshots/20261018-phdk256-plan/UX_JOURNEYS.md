# UX journeys
| ID | Persona/entry | Happy outcome | Empty/loading/error/permission | Acceptance |
|---|---|---|---|---|
| J-005 dashboard | authenticated user/superadmin → dashboard | read localized greeting, today's metrics, role-appropriate summary and recent sessions | loading/empty state is translated; tables expose captions and column headers to assistive tech | UAT-T-005-DASHBOARD |
| J-006 session history/live | authorized superadmin → live or history | filter sessions, understand translated status and duration, inspect session detail | translated empty/loading states; labelled filters and refresh; accessible table captions/column headers | UAT-T-005-SESSIONS |
| J-007 profile/devices/launcher | authenticated user → profile or devices → Keledon launcher | review localized account data/dates, device status, then open the authorized launcher flow | localized missing data, device empty/error recovery, retry and announced loading | UAT-T-007-PROFILE-DEVICES |
| J-008 session detail | authorized session reader → selected session | understand session ID and return to the session list | localized detail/recording placeholder and keyboard-operable return link | UAT-T-005-SESSIONS |
| J-001 diagnose | guest/login/app/admin | copy safe report then temporary check | clipboard denied retains icon; hidden live failure | UAT-002 |
| J-002 reset | any visitor | clear owned client cache/session, check before navigation | partial failure never false success; foreign/business data retained | UAT-002 |
| J-003 launch/call | configured operator | validate/pair/vendors/standby/voice/action/summary | invalid config/provider/disconnect explicit recovery | UAT-003/005 |
| J-004 manage | permitted admin role | list/detail/validated edit | empty/loading/validation/403 and cross-tenant denial | UAT-004 |
Native keyboard controls, focus, accessible names/non-color status. Public diagnostic never fetches privileged history. Browser only in UAT.
# 2026-10-14 continuation acceptance boundary

For run `20261014-0007-phdk-auto-completion`, retain the existing journey IDs as source hypotheses and carry the four owner-approved fronts into acceptance. Add explicit negative journeys for (a) tenant A attempting tenant B resource/config/credential access, (b) non-superadmin elevating a user or assigning a company, (c) secret replacement followed by a safe response/read, and (d) allowed private CRM origin versus unlisted/invalid/cross-tenant origin in Browser redirects and automation. Each needs exact current-candidate UAT evidence; focused regression tests alone do not establish end-user acceptance. Provider-specific call/CRM journeys are parameterized per customer and remain unverified without that customer's non-sensitive test configuration.


## PHDK 2.56.0 Plan snapshot note — 2026-10-18

This is the current lifecycle snapshot of the repository-root artifact as of remote main b54d747a63da8c27fa1358c3db82d2787038f966. Older version-specific statements are retained as historical evidence; current architecture/source facts and changed requirements are reconciled in ../ARCHITECTURE_REVALIDATION.md, and milestone sequence/acceptance is defined by ../MILESTONE_PLAN.md. This snapshot does not promote source presence to runtime acceptance.
