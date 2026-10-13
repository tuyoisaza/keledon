# CRUD matrix — 5.1.0 scope inventory; per-route acceptance still open
C=create; R=list/detail; U=update; D=delete. This is a resource-level inventory, not proof every method is present or authorized. UAT-CRUD remains partial until exact controller methods, tenant predicates, and positive/negative tests are recorded per operation. Deletion may be intentionally prohibited for immutable history.
| Resources | Guest/public | User/agent | Coordinator/admin | Superadmin | Evidence |
|---|---|---|---|---|---|
| companies/brands | no private CRUD | no cross-tenant writes | existing tenant-scoped operations only | existing permitted management | Company CRUD guards and management pages; exact C/R/U/D matrix and denial tests OPEN |
| teams/users | no private CRUD | own/permitted scoped reads only | scoped admin, no escalation | existing permitted admin | Auth/guards/team controllers; per-operation tenant predicate matrix OPEN |
| providers/vendors/voice profiles | no credentials | safe runtime config only | permitted tenant config | existing permitted config | CRUD/provider/vendor services; write-only secret UAT passes; exhaustive CRUD matrix OPEN |
| agents/flows/knowledge | no private CRUD | authorized team execution/reads | existing scoped CRUD | existing permitted CRUD | Module controllers; exact C/R/U/D and cross-tenant denial tests OPEN |
| calls/sessions/audit | no private reads | existing scoped reads | scoped oversight | existing permitted oversight | History/detail APIs; immutable/delete policy and exact role matrix OPEN |

UAT execution on 2026-10-13 proved selected frontend interactions and existing isolated backend policy tests only. Do not infer CRUD authorization from visible buttons, route presence, or mocked UI responses. See `../50-uat/UAT_CASES.md` (UAT-CRUD, UAT-ROLE) for acceptance status.
