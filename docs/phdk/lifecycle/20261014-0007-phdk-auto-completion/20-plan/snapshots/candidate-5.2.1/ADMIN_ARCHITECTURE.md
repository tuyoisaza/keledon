# KELEDON Administration Architecture

Updated for candidate 5.1.73 / PHDK 2.51.4.

## Tenancy and authority

KELEDON is multi-tenant. `Company` is the tenant boundary; users receive company/team membership from persisted `User.companyId` and `User.teamId`. Platform-wide authority is the existing DB role `superadmin`. `admin`, `coordinator` and `user` remain tenant-scoped roles. The API must resolve actor and tenant from the authenticated user row and stored relationships, never from request-supplied role or tenant IDs. New accounts remain least-privileged `user`; only a current superadmin may grant elevated roles. Provider credentials are write-only and omitted from ordinary responses.

## Surface mapping

- `/admin/settings` is the role-filtered Configuración directory.
- `/admin/settings/templates` is platform-superadmin-only and persists shared theme tokens and corporate visibility.
- `/admin/team-settings` retains the prior team voice/STT/TTS editor for coordinator access.
- `/management/*` contains company, member, flow, provider, vendor and operations pages. Each existing API must retain its own DB-derived company and resource scope.
- `/admin/prompts` and `/admin/ai-consumption` are platform-superadmin-only AI administration.
- Live backup restore, provider writes, global custom-role creation and simulated identity switching are not represented as implemented by this architecture document.

## Security boundaries

Protected system roles cannot be self-assigned by a tenant administrator. Tenant admins/coordinators must not read, mutate or enumerate a different company. Secrets remain outside generalized settings and appear only as safe metadata. Audit records for consequential changes must not include secrets or raw AI payloads. Isolated UAT uses disposable fixtures and never a customer endpoint or live database.

## Known incomplete capabilities

The current Configuración directory links to existing management capabilities; it is not evidence that general localization, invitations, permission templates, backup/restore, security policy, or all operations have a complete end-to-end workflow. See `ADMIN_CAPABILITY_MATRIX.md` and `ADMIN_SETTINGS_REGISTRY.md` for current implementation evidence and residual work.
