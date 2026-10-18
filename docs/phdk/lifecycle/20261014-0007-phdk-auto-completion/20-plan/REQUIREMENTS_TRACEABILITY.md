# Requirements traceability
| CMT-003 / INT-004 | INT-001/003 | per-client call/CRM, tenant-configured private origins | owner confirmation; API/Cloud/Browser source candidate | WS-003; generic contract/security tests; client UAT only for a configured tenant |
| CMT-004 / SEC-004 | INT-003 | least-privilege registration/elevation, company-bounded manager access, DB-derived actor/tenant, write-only secrets | owner confirmation; guards/auth/CRUD and seed source/tests | WS-004; negative policy matrix and isolated DB evidence where available |
| Commitment/feature | Intent | Requirements | Existing evidence | Workstream / acceptance |
|---|---|---|---|---|
| CMT-001/FEAT-001 | INT-002 | FR-001,NFR-002 | git/package manifests/PR facts | WS-001; UAT-001 baseline/version/PR |
| CMT-002/FEAT-002 | INT-002/003 | FR-002,SEC-001,NFR-001 | DEBUG_WIDGET_READINESS.md | WS-002; UAT-002 mounts/actions/redaction |
| CMT-003/FEAT-003 | INT-001 | FR-003,SEC-002 | V4 canon, API voice/planner, browser IPC | WS-003; UAT-003 deterministic contracts, UAT-005 real-call prerequisites |
| CMT-004/FEAT-004 | INT-003 | FR-004,SEC-003 | API CRUD/auth, web management | WS-004; UAT-004 role/tenant CRUD |
All IDs carry through Plan, PMO and final audit. Source presence is not runtime proof.


## PHDK 2.56.0 Plan snapshot note — 2026-10-18

This is the current lifecycle snapshot of the repository-root artifact as of remote main b54d747a63da8c27fa1358c3db82d2787038f966. Older version-specific statements are retained as historical evidence; current architecture/source facts and changed requirements are reconciled in ../ARCHITECTURE_REVALIDATION.md, and milestone sequence/acceptance is defined by ../MILESTONE_PLAN.md. This snapshot does not promote source presence to runtime acceptance.
