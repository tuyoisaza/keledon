# Remediation report — candidate 5.1.58

## Finding

Cloud did not match API's device ownership contract. It returned an existing device ID for any authenticated actor who repeated another actor's machine ID; allowed registration without a company; accepted pairing without requiring the stored user/company/Keledon binding; and updated the pairing row without a conditional status/code/expiry predicate. The public controller returned raw exception text.

## Change

Aligned Cloud registration and pairing with the API contract and kept the pairing response generic. This narrows Cloud authorization to the current DB actor and the complete stored device binding. Regression 21 verifies the boundaries and conditional update; regression 42 verifies public error redaction. Regression 33 links UAT-047 evidence to the applicable Device API rows, which remain BLOCKED for live persisted acceptance.

## Verification

Cloud/API targeted tests pass. Full suite and builds are in the candidate check report. No live database or device was used. Whole PHDK Auto remains **PARTIALLY DELIVERED**.

## Follow-up finding — AutoBrowse request scope

AutoBrowse goal execution validated planned action URLs, but did not set the tenant allowlist on the BrowserView request guard. This left page subresources outside the intended tenant-origin control while a goal was active. `executeGoal` now applies the current tenant vendor origins before its planner/action try block and restores the prior runtime scope with `finally`, covering action requests and failure/abort return paths. Browser policy tests assert the request scope is installed and restored; focused Browser tests pass 14/14 and build passes. UAT-048 is source-only; live private CRM behavior remains per-customer acceptance.
