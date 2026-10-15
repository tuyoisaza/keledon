# PHDK Auto — candidate 5.1.41 status

Candidate source `718ce3d4cf9c4e51b71ec163e9749307997d85d2` (tree `14e5c085771a1e556692991fd1724e747b164ee7`) is based on verified `main` `aed26d6641950fb3d4f40e64fee459fb013c544a`. It aligns all five application package/lock roots and Browser renderer at 5.1.41. PHDK 2.50.10 coherence passes 52/52.

CHK-AUTO-019 closes a Browser origin-scope gap: Electron frame navigation and the trusted `tabs:navigate` IPC now enforce the current tab's tenant allowlist. Customer-configured private HTTP(S) CRM origins remain available after validation and tenant allowlisting. Exact-source Web UAT-036 passes 4/4 browser files and 17 journey checks; UAT-037 passes the Browser policy/wiring tests 8/8. API/Cloud regressions pass 36/36 and 16/16, Browser offline suite 35/35, Web diagnostics 19/19, Web/Landing SEO 1/1 each, all five builds pass.

| Commitment | Current evidence | Remaining acceptance |
|---|---|---|
| CMT-001 — baseline, versions, PRs | Prior UAT PR #122 is merged/read back; candidate is version-aligned. | Candidate branch push, PR, merge and remote-main verification. |
| CMT-002 — widget and diagnostics | Local Web diagnostics and synthetic UAT pass. | Native Windows device/audio and broad accessibility/localization. |
| CMT-003 — voice/Cloud/Browser/CRM | Per-client adapter model and tenant-allowlisted private URLs are retained; navigation paths are guarded. | Live calls and CRM behavior remain per customer/provider; cross-origin subresource and network behavior are not established. |
| CMT-004 — administration and permissions | API/Cloud source role/tenant regressions pass; existing least-privilege policy retained. | Safe DB identities, disposable PostgreSQL, persisted migration/CRUD and exhaustive model operation matrix. |

Whole UAT remains **34 PASS, 2 BLOCKED, 1 MANUAL**. PostgreSQL/identity persistence, native audio/device, live Qdrant concurrency, broad accessibility/localization and deployed SEO/AEO remain open. Browser ESLint could not start because installed ESLint 10 requires a missing `eslint.config.*`; no lint pass is claimed. No database, customer data/provider, private destination or deployment was used.

**Delivery status: VERSIONED SOURCE COMMIT CREATED; BRANCH PUSH/PR/REMOTE-MAIN READBACK PENDING. OVERALL PHDK AUTO PARTIALLY DELIVERED.**

Evidence: `../50-uat/evidence/uat-web-suite-5.1.41-source-718ce3d4.json`, `../50-uat/evidence/uat-vendor-frame-scope-5.1.41.json`, and `../70-check/snapshots/candidate-5.1.41/PHDK_CHECK_REPORT.md`.
