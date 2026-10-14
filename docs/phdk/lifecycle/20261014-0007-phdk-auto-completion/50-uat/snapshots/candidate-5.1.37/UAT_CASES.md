# UAT cases — candidate 5.1.37

Candidate source: `ccd74293bbb36ebf1fbb08bdcdbc1f43c3c4233d`; exact-SHA evidence has clean-source fingerprint `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

| Case | Journey | Result / evidence |
|---|---|---|
| UAT-002 | Anonymous/debug-off version actions, copy/reset confirmation, error handling, diagnostics visibility and protected endpoint panel | PASS in built-SPA UAT and widget tests; synthetic API only. |
| UAT-032 | User read-only device summary; manager cancel, failure and successful revoke | PASS in built-SPA UAT; synthetic API only. |
| UAT-033 | Generic audit-log write is not exposed through API or Cloud CRUD; Cloud HTTP route is 404; source guard parity retained | PASS in API/Cloud regressions. No persisted database exercised. |
| UAT-009/010/006 | Safe database-backed identities, disposable DB/persisted CRUD/migration, native Windows device/audio | BLOCKED / not available in this environment. |
| Client CRM/call | Configured client-selected integration | MANUAL / not configured for this source review. |

Acceptance conclusion: scoped candidate cases pass; whole-product acceptance is incomplete.
