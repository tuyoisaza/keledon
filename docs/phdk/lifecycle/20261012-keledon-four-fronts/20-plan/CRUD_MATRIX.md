# CRUD matrix — baseline pending exact endpoint audit
C=create; R=list/detail; U=update; D=delete. Expected restrictive constraints are not implemented-policy proof.
| Resources | Guest/public | User/agent | Coordinator/admin | Superadmin | Evidence |
|---|---|---|---|---|---|
| companies/brands | no private CRUD | no cross-tenant writes | existing tenant-scoped operations only | existing permitted management | CRUD service/controller, management pages |
| teams/users | no private CRUD | own/permitted scoped reads only | scoped admin, no escalation | existing permitted admin | auth/guards/team controller |
| providers/vendors/voice profiles | no credentials | safe runtime config only | permitted tenant config | existing permitted config | CRUD provider/vendor services |
| agents/flows/knowledge | no private CRUD | authorized team execution/reads | existing scoped CRUD | existing permitted CRUD | module controllers |
| calls/sessions/audit | no private reads | existing scoped reads | scoped oversight | existing permitted oversight | history/detail APIs |
No blanket delete/public CRUD inference; immutable history may prohibit deletion. Worker fills exact methods/policy/test evidence; unresolved material choice OPEN.
