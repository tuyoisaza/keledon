# Remediation report — candidate 5.1.58

## Finding

Cloud did not match API's device ownership contract. It returned an existing device ID for any authenticated actor who repeated another actor's machine ID; allowed registration without a company; accepted pairing without requiring the stored user/company/Keledon binding; and updated the pairing row without a conditional status/code/expiry predicate. The public controller returned raw exception text.

## Change

Aligned Cloud registration and pairing with the API contract and kept the pairing response generic. This narrows Cloud authorization to the current DB actor and the complete stored device binding. Regression 21 verifies the boundaries and conditional update; regression 42 verifies public error redaction. Regression 33 links UAT-047 evidence to the applicable Device API rows, which remain BLOCKED for live persisted acceptance.

## Verification

Cloud/API targeted tests pass. Full suite and builds are in the candidate check report. No live database or device was used. Whole PHDK Auto remains **PARTIALLY DELIVERED**.

## Follow-up finding — AutoBrowse request scope

AutoBrowse goal execution validated planned action URLs, but did not set the tenant allowlist on the BrowserView request guard. This left page subresources outside the intended tenant-origin control while a goal was active. `TabManager` binds configured vendor views to the tenant origin allowlist before their first load and clears scope on close/destruction. `executeGoal` installs the current tenant scope before planning/actions and restores prior runtime state with `finally`, covering action requests and failure/abort paths. Browser policy tests assert view lifecycle, idle resource filtering, and goal-scope restoration; focused Browser tests pass 15/15, build and lint pass. UAT-048 is source-only; live private CRM behavior remains per-customer acceptance.

## Finding — disconnected global DebugMode persistence

The API and Cloud each retained an unbound service capable of toggling a global Prisma DebugMode row and writing audit entries. The active Web debug toggle only changes local diagnostic capture, so the model crosswalk's GAP implied a supported server function that did not exist. Removed both unreachable services and stale build outputs, retained the Prisma schema/table, and marked all 14 role/surface rows NOT APPLICABLE until an approved server feature or schema-retirement migration is defined. Regression 49 covers the distinction. API 37/37, Cloud 17/17 and both backend builds pass; UAT-049 is source-only.
