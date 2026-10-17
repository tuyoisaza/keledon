# Configuración Settings Registry

| Section | Route | Scope | Backing implementation | Current evidence/status |
|---|---|---|---|---|
| Companies / tenants | `/management/companies` | Platform superadmin | Management Companies Web/API | Existing CRUD surface; comprehensive persisted CRUD evidence is incomplete |
| Members and roles | `/management/users` | Superadmin global; admin/coordinator tenant-scoped | Management Users Web/API | Existing role controls; full role × operation matrix remains open |
| Flow definitions | `/management/flow-definitions` | Tenant-owned; platform superadmin may administer | API and Cloud tenant configuration services | UAT-083: 24 HTTP assertions passed per service against isolated PostgreSQL |
| Provider status | `/management/providers` | Tenant policy | Provider configuration surface | Existing integration UI; complete status/validation evidence pending |
| CRM and telephony | `/management/vendors` | Tenant allowlist and tenant-owned credentials | Vendor CRUD and private-origin validation | No client-specific CRM/call endpoint was used or supplied |
| AI prompts | `/admin/prompts` | Platform superadmin | Persisted `AiPromptDefinition`/`AiPromptRevision`; `AiAdminService`; `AdminPromptsPage` | Catalog exposes purpose, owning feature/callsite, bounded input schema with approved source and sensitivity, output schema/destination, enabled state, revision history and rollback. API validates registered agent references, direct typed field mappings, required target inputs and acyclic metadata; Web displays conditions/mappings. API contract 9/9 and built-Web synthetic UAT pass. Remaining: edges are not executed as routing, save immediately activates runtime revision (no publish workflow), no synthetic model test/redacted trace UI, and DB-backed persistence/tenant-scoped end-to-end UAT is pending. |
| AI consumption | `/admin/ai-consumption` | Platform superadmin | `AiCallUsage` | Token/model attribution exists; pricing intentionally unavailable pending CHK-20261016-006 |
| Visual templates | `/admin/settings/templates` | Platform superadmin writes; all users select | `PlatformSetting(theme.templates)` and shared `shared/theme-tokens.css` | Theme API and source tests added; disposable-DB persistence/UAT and contrast review pending |
| Audit history | `/admin/audit` | Platform superadmin read/export; append-only API/Cloud backend | `AuditLog` via guarded `GET /api/crud/audit-logs` | Bounded filters, deterministic pagination, recursive secret redaction, and visible-page CSV; denied events, event-time tenant/result and export audit remain open |
| Team voice settings | `/admin/team-settings` | Tenant/team | Existing Team settings API | Retained from prior route; secret handling and full operation acceptance remain separately scoped |

Unimplemented standards sections are tracked explicitly in `ADMIN_CAPABILITY_MATRIX.md`; this registry does not treat a navigation link as proof of a completed capability.
