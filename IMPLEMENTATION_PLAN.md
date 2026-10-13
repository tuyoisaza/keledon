# Implementation plan
| Task | Commitment/WS | Outcome | Dependency/owner | Acceptance |
|---|---|---|---|---|
| T-001 | CMT-001/WS-001 | baseline, old-PR applicability, one final version reconciliation | first/root | UAT-001 |
| T-002 | CMT-002/WS-002 | shared safe diagnostics/mounts/action regression | baseline/root | UAT-002 |
| T-003 | CMT-003/WS-003 | trace V4 voice/pair/vendor/CRM; repair reproducible contract gaps | baseline/runtime worker | UAT-003/005 |
| T-004 | CMT-004/WS-004 | exact CRUD/tenant/role audit, tests and established-policy fixes | baseline/admin worker | UAT-004 |
| T-005 | all | central integration, UAT/Fix, SEO/AEO, Check/remediation | T-002..004/root | full ledger reconciliation |
| T-006 | all | single version/check/commit/PR/merge/readback | prior gates/root | verified completion or exact blocker |
Priority/integration order WS-001 -> 002 -> 003 -> 004. After baseline, bounded PMO workers may inspect/repair disjoint runtime/admin files while root implements diagnostics; no worker delegation/git/version/shared edits. No live/paid/migration operations or dependency additions planned. External real-call acceptance needs controlled prerequisites; missing evidence BLOCKED.
