# Architecture and design revalidation — PHDK 2.56.0

Run: 20261014-0007-phdk-auto-completion
Date: 2026-10-18
Planning base: remote main b54d747a63da8c27fa1358c3db82d2787038f966
Product baseline: 5.2.16
Planning mode: brownfield

## Current state

This remains a multi-surface brownfield product. The verified repository topology is React/Vite in services/web, NestJS with Prisma/PostgreSQL contracts in services/api, a Cloud runtime, and a deterministic Electron Browser client in browser. Landing and agent/compatibility trees remain present; their presence does not prove that Railway deploys them. Current source/package metadata reads 5.2.16. The working base is remote main; current production/deployment claims must be refreshed per delivery and UAT rather than inferred from source or an old snapshot.

Keep the established V4 trust split: Cloud chooses policy; Browser performs only approved deterministic actions. Keep current API/DB ownership of actor and tenant, additive Prisma migrations, tenant-owned integration configuration, existing secret encryption/write-only projections, and current delivery topology. Do not scaffold a replacement monorepo or move services without an approved migration.

## Security and integration decisions still governing the target

- Email/Google registration creates regular user accounts. Only an existing active DB superadmin grants elevated roles or company assignments.
- Admin/Coordinator are bounded to their own company, cannot elevate roles and cannot delete companies.
- Each request re-resolves actor and tenant from current database state; Browser-supplied tenant/device/actor values are never authority.
- Stored credentials are protected; normal responses expose only safe presence/metadata, and replacement secrets are not echoed.
- Each tenant chooses its own call platform and CRM. A private/local CRM origin is allowed only after URL validation and explicit tenant-scoped allowlisting.
- Diagnostics are bounded and sanitized before capture/copy. Clearing diagnostics cannot clear business, session, device or authentication state.
- No customer identity/data, live call, CRM side effect, private destination or metered provider call is used for acceptance.

## Architecture gap map

| Current state | Gap / risk | Target | Migration / validation |
|---|---|---|---|
| Event-backed Browser commands have atomic device-scoped claim/result transactions | Permanent claim suppresses recovery; no attempt fencing; result is accepted without lease identity | Append-only lease/attempt transitions with an authenticated start/heartbeat and stale-attempt fencing | Add backward-compatible protocol and state events; do not retry after possible side effect; production synthetic acceptance per PIA-CMT-003A |
| Tenant CRM origins are validated and allowlisted at existing boundaries | DNS resolution/socket pinning and full redirect/resource lifecycle still need proof | Enforce tenant policy at connect time for every address/redirect/resource | Implement source correction, then only the client's explicitly authorized private sandbox can prove positive egress |
| Audited synthetic fixture lifecycle exists in main | No current authenticated superadmin browser session or normal synthetic pair is evidenced | Use existing superadmin-only path; maintain max two regular users/tenants/devices, TTL <=24h and immediate retirement | Production UAT only through runbook; no test-as, privileged fixture or credentials in chat |
| Shared diagnostics widget is present on several shells | Historical design/test artifacts do not establish all current production routes, roles and assistive behavior | Preserve one bounded, truthful, accessible widget with app-owned reset | Reconcile DEBUG_WIDGET_READINESS.md, then production UAT per milestone |
| Tenant admin APIs/UI and a detailed model CRUD matrix exist | Existing snapshots include stale source/version counts; remaining model/role/surface rows are unresolved | Derive authorization from DB and complete allowed/denied resource × role × surface operations | Recount against current schema, repair source gaps and validate permitted synthetic production journeys |

## Target boundaries and responsibilities

| Component | Responsibility | Trust boundary / direction |
|---|---|---|
| services/web | Public, operator and management journeys; safe diagnostics | Calls API; never authoritative for role, tenant or secret access |
| services/api | Auth, DB-derived authorization, tenant config, command queue, audits | Authoritative boundary; resolves the actor/device/tenant for each operation |
| Cloud runtime | Provider-neutral voice/policy/flow decisions | Emits typed approved intent; does not independently grant Browser retries |
| Browser | Poll, lease, start, heartbeat, execute approved deterministic command, report fenced result | Holds no tenant authority; never repeats an ambiguous external effect |
| PostgreSQL/Prisma | Durable current identity/configuration and append-only command/audit history | Existing schema ownership remains; command state can use event JSON only if transition ordering, bounds and concurrency invariants are enforced |
| Per-tenant connectors | Client-specific call/CRM adapter contracts | Private address permission is tenant-specific; no global exception or assumed vendor |

## UX, admin and repository artifacts reused

The existing root artifacts SOLUTION_ARCHITECTURE.md, REPOSITORY_ARCHITECTURE.md, UX_ARCHITECTURE.md, UX_RESEARCH_BASELINE.md, UX_JOURNEYS.md, UI_DESIGN_SYSTEM.md, UX_UI_DECISIONS.md, ADMIN_ARCHITECTURE.md, ADMIN_CAPABILITY_MATRIX.md, ADMIN_SETTINGS_REGISTRY.md, AI_WORKFLOW_CATALOG.md, CRUD_MATRIX.md and ARCHITECTURE_DECISIONS.md are reused as design inventories and historical evidence. Their older source/version assertions do not supersede this revalidation. Their full contents are snapshotted beside this plan.

No new branding, stack, provider, global CRM, production credential, privilege or retention policy is introduced here. Unmeasured deployed visual/accessibility behavior remains UAT work. The live Prisma schema has 41 models. The prior CRUD detail table has 560 rows for 40 models and omitted UatFixtureRun; this revalidation adds its 14 rows (seven roles × API/Web), yielding 574 rows across all current models. The 14 added rows remain BLOCKED pending authenticated production acceptance; the old rows preserve their original evidence and are not newly promoted.

## Dependency and migration sequence

1. Keep current main/versions and owner decisions reconciled.
2. Reuse and validate the audited fixture lifecycle; record the authenticated production access prerequisite without seeding credentials.
3. Implement additive Browser lease/fencing protocol across API and Browser, fail closed for stale attempt results and preserve at-most-once handling for uncertain effects.
4. Complete tenant-specific DNS/IP/socket binding and redirect enforcement without widening the existing allowlist.
5. Reconcile admin/CRUD gaps and UI/API/persistence/audit contracts.
6. Integrate the candidate, production-only UAT, fix/retest, final Check and normal versioned delivery.

Rollback preserves existing event history and API compatibility. Do not remove old events or apply a destructive migration. If a new protocol cannot safely interoperate with an old Browser version, negotiate explicit capability/version before issuing a command; do not assume all Browser clients upgrade simultaneously.

## Open decisions and validation

No material owner decision is needed to define the current plan. Routine lease TTL, heartbeat cadence and attempt limits will be selected as bounded, configurable implementation constants consistent with the PIA and product runtime; no external CRM retry is enabled by that choice. Exact private CRM host/port/CIDR and positive call/CRM behavior remain customer-specific acceptance prerequisites.

Architecture Plan exit is conditional on updating/snapshotting the existing UX, administration, AI, CRUD and ADR artifacts; PHDK_COMMITMENT_COVERAGE.md and TASK.md; and this milestone roadmap. Production identity and tenant sandbox blockers do not prevent source planning or independent source work.
