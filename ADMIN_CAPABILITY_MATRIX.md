# Administration Capability Matrix

Candidate 5.1.73 source inventory. `Implemented` means a source path and API authorization path exist; persisted behavior still requires the cited test or explicit UAT evidence. Missing or environment-bound work remains open.

| Capability | Platform superadmin | Tenant admin / coordinator | Enforcement/evidence | Status |
|---|---|---|---|---|
| Company inventory and lifecycle | `/management/companies` | Denied or tenant-scoped | Company management API; UAT-083 demonstrates actor-derived scope for flow configuration, not all Company actions | Partial |
| Users and role assignment | `/management/users` | Own-tenant limited actions | API DB-role policy; elevated-role changes require superadmin | Partial |
| Tenant flow definitions | `/management/flow-definitions` | Tenant-owned CRUD | API/Cloud DB-backed flow configuration and UAT-083 persisted HTTP assertions | Implemented for tested flow operations |
| Vendor/CRM configuration | `/management/vendors` | Own-tenant configuration | Existing Vendor API and tenant-allowlisted private-origin checks | Partial; per-customer live acceptance external |
| Provider configuration | `/management/providers` | Own permitted scope | Existing provider service; secret values masked/write-only | Partial |
| Theme templates | `/admin/settings/templates` | Read-only user theme selection | `PlatformThemeService` checks stored user role, strict hex validation, revisioned persistence and audit; `platform-theme.service.spec.ts` | Implemented at source; persisted DB/UAT still pending |
| AI prompts and consumption | `/admin/prompts`, `/admin/ai-consumption` | Denied | `AiAdminService.requireSuperadmin` queries persisted user role | Partial; workflow catalog/graph/publish/rollback absent |
| Audit console/export | `/admin/audit` | Denied | Superadmin-only Web route; API/Cloud read endpoint bounds filters and pages deterministically; stored change JSON is recursively redacted before response; visible-page CSV export is formula-safe. API/Cloud role guards append minimal, tenant-attributed role-denial events; API/Cloud global interceptors snapshot actor company for successful mutation/auth events. Contract tests cover both runtimes, tenant attribution and fail-closed authorization. | Partial: other authorization-denial paths remain; event snapshots require additive migrations to be applied; export audit and retention controls remain open. |
| General localization and system defaults | No complete settings workflow | Tenant-local preferences incomplete | Locale catalog and team settings exist, but platform persistence/editor not verified | Gap |
| Invitations, custom permission templates, MFA/SSO | No complete workflow | No elevation | No end-to-end implementation/test evidence | Gap |
| Backups, restore and recovery drills | No live restore action | No access | No approved isolated restore target supplied | External/manual |
| Safe test-as role session | UAT-specific profile only | No privilege elevation | Requires server-enforced reduced-privilege scoped session and denial tests | Gap |
