# Current traceability delta — MVP, 2026-10-18
CMT-003 → [owner intent](docs/intents/windows-meet-salesforce-mvp-intent.md) → [MVP-R01..R09 / PIAs 001..005](docs/mvp/meet-salesforce/README.md#requisitos-y-trazabilidad) → [MS-MVP-000..003](docs/mvp/meet-salesforce/MILESTONE_PLAN.md) → [A01..A12](docs/mvp/meet-salesforce/TEST_RUNBOOK.md).
Preparation only; every functional case remains NOT RUN. [Source baseline](docs/mvp/meet-salesforce/SOURCE_BASELINE.md). CMT-001/002/004 are retained, not cancelled or accepted by this MVP plan.

---

## Historical baseline (retained; current scope above takes precedence)

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
