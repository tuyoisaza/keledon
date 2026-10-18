# PRD — KELEDON confirmed repair portfolio
Revision 1; 2026-10-12; sources: owner confirmation, V4 canon and source baseline. Actors: guest/user/agent/coordinator/admin/superadmin. Preserve existing role policy.
## Requirements
| SEC-004 | enforce owner-approved least-privilege registration, superadmin-only role/company elevation, company-bounded managers, DB-derived API actor/tenant, and write-only secret replacement | INT-003 | P0 CONFIRMED owner 2026-10-12 | API/auth/CRUD source and negative regressions; normal responses omit stored and submitted secrets |
| INT-004 | support each tenant's configured call/CRM integrations, including a client-local CRM | INT-001/003 | P1 CONFIRMED owner 2026-10-13 | validated URL + tenant-scoped origin allowlist; client-specific UAT only when that tenant's environment exists |
| ID | Requirement | Intent | Priority/status/source | Acceptance |
|---|---|---|---|---|
| FR-001 | reconcile baseline/versions/old PR applicability | INT-002 | P1 CONFIRMED owner WS-001 | actual topology/version/PR facts; no blind merge |
| FR-002 | shared always-visible semver/copy/trash on public/login/app/admin/applicable edge shells | INT-002 | P1 CONFIRMED owner WS-002 + diagnostics standard | exact order/sizes, independent confirmed states, all mounts |
| SEC-001 | sanitize bounded diagnostics before capture/copy; app-owned reset only | INT-002/003 | P0 CONFIRMED owner WS-002 + DEVSECOPS | sensitive fixtures absent; foreign/business data intact |
| FR-003 | verify launch/pair/voice/approved CRM path and repair reproducible defects | INT-001 | P1 CONFIRMED owner WS-003 + V4 | isolated contract evidence and explicit live prerequisites |
| SEC-002 | browser executes approved commands deterministically, cloud alone selects policy | INT-001/003 | P0 CONFIRMED V4 | invalid/unsafe commands fail closed |
| FR-004 | verify company/team/user/provider admin journeys | INT-003 | P1 CONFIRMED owner WS-004 | CRUD inventory, detail/edit/error/permission evidence |
| SEC-003 | enforce established role/tenant boundaries server-side | INT-003 | P0 CONFIRMED WS-004 + existing RBAC | unauthenticated/cross-tenant/role-escalation negatives |
| NFR-001 | preserve architecture/themes/en-es-pt/accessibility/contracts | all | P1 CONFIRMED brownfield constraint | scoped regression proof, no rewrite |
| NFR-002 | truthful lifecycle and remote delivery evidence | all | P1 CONFIRMED PHDK | no false completion or silently dropped commitment |
## Business/data rules
BR-001 Cloud decides; Browser executes. BR-002 errors/recovery honest, never simulated success. DATA-001 no production data operations; isolated Company Co fixtures. Do not infer public CRUD or unsafe delete from route presence.

BR-003 An admin/coordinator may not cross company scope, elevate roles, or delete companies. Normal API responses never return stored secrets or credentials submitted for replacement. Private/local integration destinations are permitted only as validated tenant-owned origins; URL validation alone is not an allowlist.
## Workflows, UX and states
Launch/validate/pair/vendor/standby/voice/action/summary/recovery. Invalid configuration, disconnect or provider failure yields explicit error/recovery. Admin list/detail/edit/delete preserves validation/tenant boundaries; immutable audit history may forbid deletion. Copy/reset actions use hidden live status and confirmed independent green checks, no visible toast/helper/date.
## AI, integrations and reliability
Existing configurable cloud STT/TTS/LLM/vector/vendor contracts; review validation, timeouts/retries/cost controls with test doubles. No paid/live invocation. Preserve existing migrations; no schema execution.
## Security, localization and accessibility
Bounded redacted event buffers, least privilege, safe URLs, no private anonymous report. Changed UI strings in existing en/es/pt catalogs. Native keyboard controls/focus/accessible names and non-color status.
## Acceptance, assumptions and decisions
Execute local unit/contract/component and scoped UAT evidence. External real calls/CRM require controlled media/vendor/provider prerequisites; absent evidence BLOCKED. Material new permission policy requires concrete review. No additional inferred feature active.


## PHDK 2.56.0 Plan snapshot note — 2026-10-18

This is the current lifecycle snapshot of the repository-root artifact as of remote main b54d747a63da8c27fa1358c3db82d2787038f966. Older version-specific statements are retained as historical evidence; current architecture/source facts and changed requirements are reconciled in ../ARCHITECTURE_REVALIDATION.md, and milestone sequence/acceptance is defined by ../MILESTONE_PLAN.md. This snapshot does not promote source presence to runtime acceptance.
