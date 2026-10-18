# KELEDON Administration Architecture

**Audit baseline:** PHDK 2.53.1; candidate KELEDON 5.2.1; branch `feature/tenant-interface-selector-5.2.0` (product basis `ef6fe6db`; the active continuation adds managed-interface secret-at-rest encryption in API and Cloud). This is a source architecture record; it is not runtime or persisted-data acceptance.

## Tenancy and authority

KELEDON is a multi-tenant contact-center product: independent customer Companies own Teams, users, provider/CRM configuration, flows and related operating records. Platform-level `superadmin` is therefore justified. Tenant `admin` and `coordinator` roles operate within their current Company. `user` and `agent` are lower-privilege product roles. Exact capabilities remain resource/action specific; a role hierarchy alone is not authorization.

The owner-approved invariants are: new email/Google registrations default to `user`; only a current database-authorized superadmin may elevate a role or assign a Company; tenant managers cannot elevate roles or create/delete Companies; actor and Company scope come from current database state; ordinary API projections never return stored credentials, and secret replacement is write-only. A tenant may configure private/local CRM destinations only after URL validation and tenant-scoped origin allowlisting. An Admin/Coordinator may associate only interfaces owned by the same Company with Teams in that Company.

## Trust boundaries and current implementation map

| Boundary | Authority / data flow | Source anchors | Evidence limit |
|---|---|---|---|
| Public and authenticated Web/Landing | Anonymous routes expose public content; protected routes use Web auth and role guards. | `services/web/src/AppRouter.tsx`, `landing/src/AppRouter.tsx`, `services/web/src/context/AuthContext.tsx` | Deployed public behavior only is observed in UAT-098–100 on 5.1.85. |
| API and Cloud control plane | Authentication re-reads active actor/role from DB; guards and resource services enforce company and relationship scope. | `services/api/src/guards/`, `services/api/src/crud/`, API auth and Cloud mirrored modules | Candidate tests are historical source evidence; no 5.2.1 production auth/persistence acceptance. |
| PostgreSQL / Prisma | Stores Companies, Teams, Users, tenant configurations, operational records, audit and managed AI definitions. Migrations are additive. | `services/api/prisma/schema.prisma`, `services/api/prisma/migrations/` | No production DB inspection or migration is authorized. |
| Browser/Electron execution | Cloud/API chooses bounded actions; Browser enforces configured-origin/navigation and session scope. Customer selects call and CRM systems. | `browser/renderer/`, Browser command and tenant-origin services, `services/api/src/controllers/planner.controller.ts` | Real call/CRM/device journeys require the customer's selected safe environment. |
| External providers | OAuth, voice, AI, vector store and CRM are configured per platform or tenant; values are secret. | provider/auth/LLM services; `services/api/src/crud/crud-vendor.service.ts` | No customer provider or secret-value access was performed. |

## Administrative routes and authorities

- `/admin/settings` is the discoverable settings landing page. It links to Companies (platform admin), Users, Flows, Providers, CRM, AI Prompts, theme templates, Audit, system status, and tenant voice settings where applicable.
- `/management/*` contains company, user, team, vendor, provider, flow and interface management. Server routes/guards remain authoritative if a link is hidden.
- `/admin/prompts`, `/admin/ai-consumption`, `/admin/settings/templates` and `/admin/audit` are platform-superadmin surfaces.
- `/admin/team-settings` is scoped to tenant managers and platform superadmin, with the active Company derived by the server.
- Safe UAT profile switching is source-implemented for an existing superadmin and explicitly allowlisted synthetic `.invalid` users in development/staging only. API issues a short-lived reduced-role token, records start/end audit events and refuses production. This is a UAT facility, not consent to impersonate real users.

## Security and data lifecycle boundaries

Company ownership and current user/team membership are the primary tenant boundary. Direct identifiers, client-provided `companyId`, stale JWT role claims and hidden UI controls are not authority. Private CRM targets require both syntactic URL validation and a matching tenant allowlist entry. Audit/telemetry must exclude credential values and customer payloads unless specifically sanitized.

The 5.2.1 migration adds nullable `ManagedInterface.companyId` with an FK/index and deliberately does not backfill legacy interfaces. Existing ownerless rows must remain unavailable to tenant selectors until their Company is established through an authoritative process. No inventory, ownership assignment, data migration, production login or production write was performed.

`ManagedInterface.credentials` is write-only through ordinary CRUD projections. API and Cloud now encrypt new values and replacements with an AES-256-GCM envelope using a domain-separated derivation from `KELEDON_VENDOR_KEY`; the credential-write path fails closed when the key is absent or shorter than 32 characters. The source search found no in-repository runtime consumer for this field. Existing rows remain in their current format; no bulk conversion or production key inspection occurred. The envelope implementation and API/Cloud parity still require candidate-site acceptance, and key rotation/recovery remains an operational design item.

The repository also retains `DatabasePersistenceService` and `DatabaseBackupStore`, which write JSON snapshots of an in-memory Map. The active Nest module graph has no registration/callsite for this service in the inspected source, so it is not evidence of a PostgreSQL backup or recovery capability and must not be surfaced as production backup status.

## Decisions and unresolved architectural acceptance

The four owner-confirmed fronts and role/private-origin policy are fixed for this Auto goal. Remaining architecture evidence is tracked in `ADMIN_CAPABILITY_MATRIX.md` and `ADMIN_SETTINGS_REGISTRY.md`: invitation/lifecycle controls, editable permission templates, backups/recovery, full general settings and operations controls, and a proper secret-manager boundary are incomplete or unverified. The required data- and service-owner choices must be resolved before claiming compliance; this document does not invent provider, backup, retention or migration settings.


## PHDK 2.56.0 Plan snapshot note — 2026-10-18

This is the current lifecycle snapshot of the repository-root artifact as of remote main b54d747a63da8c27fa1358c3db82d2787038f966. Older version-specific statements are retained as historical evidence; current architecture/source facts and changed requirements are reconciled in ../ARCHITECTURE_REVALIDATION.md, and milestone sequence/acceptance is defined by ../MILESTONE_PLAN.md. This snapshot does not promote source presence to runtime acceptance.
