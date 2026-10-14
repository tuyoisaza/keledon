# Solution architecture — brownfield
Goals: INT-001/002/003, confirmed four fronts. V4 Cloud-decides/Browser-executes invariant.
Current: services/web React/Vite (root Dockerfile copies it), services/api NestJS/Prisma/voice/planner/CRUD, Electron browser. cloud/landing/agent alternatives remain retained; Dockerfiles do not prove live topology.
KEEP: contracts, roles/tenant hierarchy, schema, configured STT/TTS/LLM/vector/vendor interfaces and IPC. EVOLVE: shared diagnostics, bounded runtime validation and evidenced authorization. UNKNOWN: live health/vendors/media/releases.
Target: incremental existing-service repairs; reusable diagnostics; deterministic execution; established server policy tested/fixed without widening rights.
Data: Prisma/PostgreSQL existing models; isolated fixtures, no live migrations. AI/integrations: cloud-configured providers, HTTP/WS/IPC boundaries validated, fake provider tests only.
Security/observability: bounded redacted client buffers, no privileged anonymous fetch/history, honest errors. Deployment: normal branch/PR/main only; preserve watch paths, no provider/settings/CI writes.
Risk: historical plan/source cannot prove live calls. External prerequisites produce explicit blockers.
# 2026-10-14 PHDK Auto continuation — authoritative current state

This addendum supersedes older candidate/version statements below for run `20261014-0007-phdk-auto-completion`. The repository is a brownfield multi-surface system: React/Vite web client (`services/web`), NestJS/Prisma API (`services/api`), Cloud runtime, deterministic Electron Browser, and landing/static deployment surfaces. Compatibility directories and duplicated deployment manifests remain in scope for integration checks. Current delivered baseline is 5.1.24 at `6413d8aed295c18af098ca6a58c6dfbb7503930b`; the active worktree is based exactly on `origin/main` and contains 130 changed/untracked paths. No final candidate version is assigned yet.

Target architecture keeps actor and tenant authority in persisted server-side identity, enforces tenant-scoped RBAC at every API/runtime boundary, stores integration credentials encrypted at rest, returns only safe projections, and applies each tenant's validated CRM origin allowlist to Browser navigation and automation. Client-configured private/local CRM addresses are permitted only through the same tenant's explicit allowlist and URL validation. Public diagnostics remain bounded, redacted, local-safe, and free of live probes. Provider-specific call/CRM behavior stays behind per-client integration configuration; no universal provider acceptance is claimed.

The active plan is `IMPLEMENTATION_PLAN.md` (PLAN-AUTO-001..008), with owner-approved policy in ADR-AUTO-008/009. Remaining delivery gates include 333 Cloud ESLint errors/59 warnings, current-candidate UAT, full schema/role/tenant/operation coverage, disposable-database migration/persistence evidence, native Browser/device/audio acceptance, and exact-SHA remote delivery evidence.

