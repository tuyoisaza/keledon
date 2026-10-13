# UAT stories — stable IDs and intent traceability

Synthetic Company Co records come only from `USE_COMPANY_CO_INFO_FOR_DEMOS.md`. These story IDs remain stable across candidate versions and map to `PROJECT_INTENT.md`.

| Story | Intent / requirement | User outcome | Acceptance boundary |
|---|---|---|---|
| US-001 | INT-001, FR-001 | Maintainer can inspect current baseline, versions, and PR state without reviving obsolete work. | Source/remote evidence; open PR is not reported as delivered. |
| US-002 | INT-002, FR-002, SEC-001, NFR-002 | Admin can enable diagnostics deliberately, see safe endpoint evidence, run only explicitly safe tests, copy a sanitized report, and clear app-owned state. | Mocked local UI plus isolated API security tests; no provider or customer calls. |
| US-003 | INT-001, FR-003, SEC-002 | Configured tenant runtime validates commands and browser outcomes, serializes work, and returns to standby only on confirmed completion. | Provider-independent contracts and synthetic tests; no client vendor configured. |
| US-004 | INT-003, FR-004, SEC-003 | Tenant administrators manage only their tenant; new accounts are least-privileged; secret values can be replaced but never retrieved. | Rendered UI fixture and isolated backend policy tests are reported separately. |
| US-005 | INT-002, FR-003, NFR-002 | Failure, cancellation, disabled AI, or budget exhaustion remains visible as failure, never fabricated completion. | Isolated source/contract tests; no metered provider execution. |
| US-006 | NFR-001 | User can navigate supported Spanish/English/Portuguese themes and responsive layouts with accessible controls. | Current rendered checks are scoped; full-app translation and accessibility certification remain open. |

Case mapping: US-001→UAT-001; US-002→UAT-002/UAT-006; US-003→UAT-003/UAT-005; US-004→UAT-004; US-005→UAT-005; US-006→UAT-THEME/UAT-ACCESS. Detailed cases and limitations are in `UAT_CASES.md` and `UAT_REPORT.md`.
