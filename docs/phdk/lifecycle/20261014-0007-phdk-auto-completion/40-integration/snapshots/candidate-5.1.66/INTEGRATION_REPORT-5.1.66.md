# Integration review — candidate 5.1.66

Run: `20261014-0007-phdk-auto-completion`
Repository: `tuyoisaza/keledon`
Base: verified remote `main` `fbeec0eafe72cc73e8a92c9105076d8174ce98dd` / 5.1.65
Candidate branch: `fix/phdk-flow-db-persistence-5-1-66`

## Integrated behavior

The four owner-confirmed workstreams remain ordered and active. This slice advances administration/permissions (CMT-004) and the diagnostic/accessibility surface (CMT-002):

- API and Cloud route legacy flow definition/version/availability/intent CRUD through matching `TenantFlowConfigService` implementations backed by four new Prisma models.
- Admin/coordinator scope remains derived from the current database actor through `ResourceScopeGuard`; superadmin keeps cross-company administration and may assign unowned legacy definitions. Tenant ownership is immutable once assigned.
- Versions are company-derived through their parent, unique per definition, attributed to the authenticated actor, and only drafts are editable. Availability uses a same-company composite database foreign key; intent references are checked against persisted company-owned definitions.
- Startup legacy import is idempotent. After `createMany(skipDuplicates)`, it reads actual persisted definition ownership from Prisma before importing versions, permissions and intent mappings, so stale JSON hints cannot override tenant ownership.
- The management flow editor remains on the approved Web route and is tested through Company Co synthetic fixtures. The shared app shell now switches to a compact mobile navigation at small widths; the version/diagnostics actions remain visible.
- API and Cloud migrations are identical and use cascade deletion for tenant-owned flow configuration. Migrations are schema-validated but have not been executed against a database.

## Contract reconciliation

| Boundary | API | Cloud | Web | Integration result |
|---|---|---|---|---|
| Tenant flow reads/writes | Typed controller delegates to Prisma-backed service; database actor and company guards retained. | Same service/controller policy. | Admin/coordinator cannot select tenant; superadmin legacy assignment remains. | Source contract and local synthetic UAT pass. |
| Flow permission ownership | Composite `[flowDefinitionId, companyId]` relation and service validation. | Matching Prisma relation and migration. | Availability toggle submits tenant-scoped payload. | Database constraint prevents cross-company permission rows; persisted execution remains open. |
| Intent mapping ownership | Service verifies all referenced definition IDs against company. | Same implementation. | Intent editor sends scoped mapping. | Source contract passes; DB-backed test is open. |
| Legacy import | Reads persisted owner before child writes; preserves unassigned flows and historical creators. | Same implementation. | Superadmin-only assignment path retained. | Idempotence and stale-owner regressions pass; migration/readback is blocked. |
| Mobile management shell | N/A | N/A | Responsive top navigation and full-width editor at 390px. | Keyboard and mobile browser retest passes. |
| Diagnostics widget | Debug-gated authenticated diagnostics route. | Same role/security contract. | Public/login/shell/admin mounts, safe copy/reset, mobile header. | Web 19/19; Browser 43/43 source/offline; native Electron remains unverified. |

## Source review and known limits

Review checked the paired controller/service paths, both Prisma schemas and migrations, tenant guards, legacy import, CRUD matrix, editor request payloads, mobile shell, and unchanged client-configured private URL allowlist. Cross-tenant company IDs are rejected in service tests and enforced by the permission FK. No production/customer database, CRM URL, telephony provider, paid model, deployment or customer data was accessed. No hosted CI workflow was triggered.

The four new database models increase the schema inventory from 35 to 39 and the complete role/surface map from 490 to 546 rows. The source-level inventory regression now passes 39/39 models. The 168 core resource-role-surface rows are retained. The only observed code/UAT findings were fixed before Check: an API/Cloud stale legacy company hint and a mobile shell width issue.

## Exit gate

- API and Cloud source contracts, migrations and schema shape match.
- No cross-service route, role, tenant, serialization or versioning conflict remains in source review.
- API and Cloud targeted persistence-contract suites pass 8/8 and 7/7.
- API/Cloud builds and schema validation pass; complete regressions are re-run in Check.
- Local Web editor UAT passes keyboard and responsive states with outbound network blocked.
- Durable migration, restart, multi-instance and database-role acceptance remain **BLOCKED** pending a disposable PostgreSQL target.

**Integration Review: PASS FOR SOURCE CANDIDATE; PERSISTED ACCEPTANCE OPEN.**

SIGUIENTE PASO: finish scoped UAT/UAT Fix, then revalidate SEO/AEO for the unchanged public surface before Check.
