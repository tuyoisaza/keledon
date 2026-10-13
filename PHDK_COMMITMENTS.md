# Commitment ledger
Owner decision 2026-10-12: 'Los cuatro, en ese orden' confirms CMT-001..004. No deferrals/cancellations.
| ID/title | Origin/category/priority | Scope | Acceptance | Plan/owner | Execution/verification | Git/final disposition |
|---|---|---|---|---|---|---|
| CMT-001 baseline/versions/PRs | owner front 1/technical P1 | CONFIRMED | current facts and scoped PR reconciliation | T-001/WS-001/root | SOURCE REVIEW COMPLETE; remote delivery not done | commit 3af566a pushed; PR #42 open draft; 0/4 remotely delivered |
| CMT-002 shared safe diagnostics | owner front 2/defect P1/security P0 | CONFIRMED | common row, confirmed actions/redaction/reset/regression | T-002/WS-002/root | IMPLEMENTED; local test and browser fixture UAT PASS; native Electron render open | local; 0/4 remote |
| CMT-003 voice/cloud/browser/CRM | owner front 3/defect P1 | CONFIRMED | provider-independent configurable contracts + isolated end state | T-003/WS-003/runtime worker | SOURCE/CONTRACT PASS; browser18 checks PASS; client live vendor expressly excluded | local; 0/4 remote |
| CMT-004 administration/permissions | owner front 4/security P0 | CONFIRMED | restrictive DB actor/tenant, no elevation, secrets write-only | T-004/WS-004/admin worker | POLICY APPROVED AND IMPLEMENTED; API regression/focused PASS, AI UI fixture PASS; migration unapplied | local; 0/4 remote |
Last update 2026-10-12. Local status: 001 partial; 002 and 004 verified in source/isolated tests; 003 source and synthetic acceptance. Remote delivered 0/4. External prerequisites/open scoped PRs never silently dropped. Records grant no future authority.

Owner scope clarification 2026-10-12: vendors are client-defined; review code for maximum applicable PHDK conformance. CMT-003 acceptance uses tenant-configurable source/contracts + synthetic local tests; specific live-client setup is not required by this review. Full standards audit additionally inventories new capability/debt gaps; those are not silently waived or claimed delivered.


Owner clarification 2026-10-12: client call/CRM provider varies by tenant; code and tenant-configurable contracts are the in-scope acceptance. No follow-up asking for a single vendor.
