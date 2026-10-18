# Features / confirmed fronts
## Current continuation status — 2026-10-14
The owner reconfirmed SEC-004/INT-004 behavior: least-privilege registration and role assignment, DB-derived tenant identity, write-only secret replacement, per-tenant CRM/call configuration, and validated tenant origin allowlists for private/local CRM targets. Source remediation and final delivery remain in progress; database/native/deployed acceptance remains independently tracked.

| Feature | Intent/requirements | Actor/value | Acceptance | Dependencies/status |
|---|---|---|---|---|
| FEAT-001 baseline/versions/PRs | INT-002; FR-001,NFR-002 | owner; accurate state | actual facts, scoped PR review, single integrated version | first/IN PROGRESS |
| FEAT-002 safe shared diagnostics | INT-002/003; FR-002,SEC-001,NFR-001 | all users; safe troubleshooting | common mounts, redaction/reset negative tests and independent states | baseline/PLANNED |
| FEAT-003 deterministic voice/execution | INT-001; FR-003,SEC-002 | operators; reliable approved actions | isolated contracts plus explicit real-call blockers | baseline/PLANNED |
| FEAT-004 bounded administration | INT-003; FR-004,SEC-003 | admin/superadmin; permitted CRUD | role/tenant/resource matrix and negative cases | baseline/PLANNED |
All P0/P1 for this portfolio; no new vendor integration/live operations/bot restoration/schema redesign.


## PHDK 2.56.0 Plan snapshot note — 2026-10-18

This is the current lifecycle snapshot of the repository-root artifact as of remote main b54d747a63da8c27fa1358c3db82d2787038f966. Older version-specific statements are retained as historical evidence; current architecture/source facts and changed requirements are reconciled in ../ARCHITECTURE_REVALIDATION.md, and milestone sequence/acceptance is defined by ../MILESTONE_PLAN.md. This snapshot does not promote source presence to runtime acceptance.
