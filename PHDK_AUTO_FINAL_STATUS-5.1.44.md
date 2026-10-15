# PHDK Auto status — candidate 5.1.44 (2026-10-15)

**Status: SOURCE CHECK PASS; DELIVERY PENDING; WHOLE PHDK AUTO PARTIALLY DELIVERED.**

The four owner-confirmed KELEDON fronts remain active in order. Candidate `fix/phdk-rpa-subresource-allowlist-5-1-44` is based on verified `origin/main` `11d773e6d41d21625302ab63fef31cf43d521041`. Product commit `0cbf038ed8ce7f27b1459c3a922a93f04165da46` (tree `9580bf410a52c2ecce0824e52fdf3ab30b322440`) adds tenant scope to HTTP(S)/WebSocket resource requests during RPA, including conservatively resolved service-worker traffic. Explicit configured private CRM origins remain supported. All five app package/lock roots and Browser renderer report 5.1.44.

UAT-040 passes offline. Browser suite 27/27, security-policy/wiring 11/11, Browser TypeScript build and PHDK coherence 52/52 pass. Browser ESLint is blocked because the package lacks the flat config required by ESLint 10. No packaged Electron or actual service worker, private CRM, database, customer data, device or deployment was tested. Customer-managed allowlists need every required CDN/API/WebSocket origin.

Whole UAT is **37 PASS, 2 BLOCKED, 1 MANUAL**. Persisted PostgreSQL/identity/CRUD, native Windows device/audio, broad accessibility/localization, deployed SEO/AEO and per-client live call/CRM acceptance remain open. No whole-product completion is claimed.

The candidate is committed locally; push, PR, merge and exact remote-main readback are pending.
