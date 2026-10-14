# KELEDON project intent
Status: brownfield baseline, owner confirmed four fronts in order on 2026-10-12.

## Owner-confirmed security and integration decisions — 2026-10-14
New email/Google accounts receive the `user` role. Only an existing superadmin may grant elevated roles or company assignments. Admin/coordinator may administer only their own company and cannot elevate roles or delete companies. API actors and tenant scope are resolved from current database state; normal responses never return stored secrets, and configured credentials are replaced without being returned. Each client selects its own call platform and CRM. Client-configured private/local CRM origins are permitted only after URL validation and tenant-scoped origin allowlisting. The current Auto goal is source conformance and verified client-agnostic contracts; no CRM vendor is universal.
## Purpose / ethos
INT-001: autonomous inbound contact-center assistance with cloud-governed policy and deterministic browser execution.
INT-002: operators understand readiness/failures/outcomes from truthful sanitized evidence.
INT-003: tenant administrators manage permitted resources without exposing other tenants or secrets.
## Problem, users and jobs
Operators need reliable voice/CRM assistance; administrators safe configuration; owners traceable delivery rather than stale reports. Launch/pair, prepare configured vendors, handle voice turns, execute approved CRM actions, summarize/dispose and recover to standby. Manage company/team/user/provider resources with least privilege.
## Objectives / success measures
Reconcile baseline/versions/PRs; repair shared diagnostics; inspect and repair confirmed voice/execution defects; verify administration/permissions. Success requires actual local evidence and verified target delivery; no invented performance targets.
## Principles / constraints
Cloud decides; Browser executes. Preserve React/Vite, NestJS, Prisma, Electron and existing contracts. docs/specs/ immutable without governance issue. No live customer data, paid calls, migrations/provider writes, CI/schedules/forced updates or parallel floor restoration.
## Non-goals
No architecture rewrite, new roadmap, external operations, bot restoration or unsupported live-call claims.
## Risks / tensions
Legacy/current trees, stale task/version/workflow instructions, unavailable live vendor/media prerequisites. Material new security policy needs concrete review.
## Evidence / provenance
Owner 'PHDK auto' then 'Los cuatro, en ese orden'; docs/specs/v4_KELEDON_CANON.md and v4_KELEDON_BROWSER.md establish intent; source/Dockerfiles establish implementation, not live behavior.
## Open questions
No further intent question needed for confirmed portfolio. External test prerequisites remain verification limitations.
