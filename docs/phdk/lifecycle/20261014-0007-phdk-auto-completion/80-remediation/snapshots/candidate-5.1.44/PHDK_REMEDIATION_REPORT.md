# PHDK source remediation — candidate 5.1.44 (2026-10-15)

## Finding CHK-AUTO-022 — scope BrowserView resource requests to tenant origins

An allowed CRM page could request arbitrary cross-origin HTTP(S) resources or open WebSockets while RPA was executing, because tenant origin checks covered navigation only. The BrowserView's Electron session now applies the active Cloud-derived origin allowlist to HTTP(S), WS and WSS requests. Known request WebContents use their own runtime scope. Requests without a resolvable WebContents use the initiator origin to find active RPA scopes on that session; overlapping tenant scopes are intersected, and unrecognized/unattributed requests are denied. Runtime scope records are restored/removed with the executor's existing `finally` cleanup.

The fix is `0cbf038ed8ce7f27b1459c3a922a93f04165da46`; exact product tree `9580bf410a52c2ecce0824e52fdf3ab30b322440`. Validation: Browser suite 27/27; security-policy/resource-scope and source-wiring tests 11/11; Browser `npm run build` passes; PHDK coherence 52/52; all five app package/lock roots and Browser renderer report 5.1.44. UAT-040 evidence is `../50-uat/evidence/uat-rpa-subresource-origin-scope-5.1.44.json`.

Browser ESLint remains unavailable because the package has no flat config for ESLint 10. No packaged Electron/network, real service-worker, CRM, DB, customer data, device, or deployment was exercised. Tenant-managed allowlists must include every required CDN/API/WebSocket host. Whole PHDK Auto remains partial for persistence/identity/CRUD, native device/audio, broad accessibility/localization, deployed SEO/AEO and customer-specific live acceptance.
