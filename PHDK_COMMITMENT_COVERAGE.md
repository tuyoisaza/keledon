# Plan coverage
| CMT | Requirements/decisions | Task/WS/owner | Dependencies | Acceptance/gap |
|---|---|---|---|---|
| 001 | FR-001,NFR-002,ADR-005/006 | T-001/WS-001/root | none | UAT-001; baseline PR dispositions documented; main delivery pending |
| 002 | FR-002,SEC-001,NFR-001,D-UI-001..006 | T-002/WS-002/root | baseline | UAT-002; local rendered fixture + focused privacy regressions PASS |
| 003 | FR-003,SEC-002,ADR-001/002 | T-003/WS-003/runtime worker | baseline/contracts | UAT-003/005; owner explicitly excludes specific live-client selection; provider-independent synthetic contract |
| 004 | FR-004,SEC-003,ADR-004,CRUD matrix | T-004/WS-004/admin worker | baseline/policy | Selected DB actor/tenant guard tests and synthetic UI PASS; exhaustive persisted-resource × role × surface × operation matrix and backend/persistence UAT BLOCKED; see root `CRUD_MATRIX.md` |
All confirmed IDs owned and mapped; no inferred feature added. No item is considered remotely delivered while PR #42 remains open.
