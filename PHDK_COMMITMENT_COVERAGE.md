# Commitment coverage — PHDK Auto 5.1.2

Current source candidate: `0d98f2812d8eb88a8626101f81f9bf9ca6d52de0` (preceded by 5.1.1 commit `cff60c675ec3e4b21864a24821cbda34a9c51d64`); branch `chore/phdk-install-v2.50.8`; PR #42 remains OPEN/DRAFT at the previous remote head. None of the four commitments is credited as remotely delivered until merge and `main` readback.

| ID | Requirements / decision | Task / workstream | Current acceptance evidence | Remaining gate |
|---|---|---|---|---|
| CMT-001 | FR-001, NFR-002, ADR-005/006; baseline, versions and PRs | T-001 / WS-001 | Five app package/lock roots at 5.1.2; PR #42 and target SHA reconciled; versioned source commits exist locally. | Push/update PR, normal integration and remote version/SHA readback. |
| CMT-002 | FR-002, SEC-001, NFR-001, D-UI-001..006; shared safe diagnostics | T-002 / WS-002 | Health endpoint disclosure fixed; web diagnostics tests 18/18; synthetic production-SPA UAT 1/1. | Native Electron rendering and broad app route/accessibility acceptance. |
| CMT-003 | FR-003, SEC-002, ADR-001/002; voice→Cloud→Browser→CRM | T-003 / WS-003 | Tenant-configurable, vendor-independent contracts; Cloud tests 10/10 and isolated runtime/browser contracts. Owner excludes selecting a particular client vendor. | Persistence/live execution not proven; client-specific live acceptance is outside current scope. |
| CMT-004 | FR-004, SEC-003, ADR-004 and CRUD matrix; admin/permissions | T-004 / WS-004 | Owner policy implemented; API actor/tenant and CRUD guard regressions; manager team reassignment UI/payload UAT; health output redaction. | Full persisted resource×role×surface×operation matrix and direct cross-tenant database journeys remain unverified. |

All confirmed IDs are owned and mapped. No inferred feature has been added. Full task remains PARTIALLY DELIVERED until all acceptance gaps are dispositioned and normal PR integration is verified.
