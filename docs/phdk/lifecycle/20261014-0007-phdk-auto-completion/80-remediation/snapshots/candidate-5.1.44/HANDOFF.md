# Remediation handoff — candidate 5.1.44

CHK-AUTO-022 is fixed on product commit `0cbf038ed8ce7f27b1459c3a922a93f04165da46`. The BrowserView session now applies the active tenant RPA allowlist to HTTP(S) resources and WS/WSS handshakes; service-worker requests without an owner use an initiator-matched intersection of active scopes and fail closed when unattributed. Tenant-configured private CRM origins remain supported. UAT-040, Browser tests 27/27, policy/wiring tests 11/11, Browser build and PHDK coherence 52/52 pass. See `PHDK_REMEDIATION_REPORT.md` and the Check snapshot.
