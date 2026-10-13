# Plan coverage
| CMT | Requirements/decisions | Task/WS/owner | Dependencies | Acceptance/gap |
|---|---|---|---|---|
| 001 | FR-001,NFR-002,ADR-005/006 | T-001/WS-001/root | none | UAT-001; baseline PR dispositions documented; main delivery pending |
| 002 | FR-002,SEC-001,NFR-001,D-UI-001..006 | T-002/WS-002/root | baseline | UAT-002; local rendered fixture + focused privacy regressions PASS |
| 003 | FR-003,SEC-002,ADR-001/002 | T-003/WS-003/runtime worker | baseline/contracts | UAT-003/005; owner explicitly excludes specific live-client selection; provider-independent synthetic contract |
| 004 | FR-004,SEC-003,ADR-004,CRUD matrix | T-004/WS-004/admin worker | baseline/policy | UAT-004; DB actor/tenant guards; isolated tests and synthetic UI PASS |
All confirmed IDs owned and mapped; no inferred feature added.
