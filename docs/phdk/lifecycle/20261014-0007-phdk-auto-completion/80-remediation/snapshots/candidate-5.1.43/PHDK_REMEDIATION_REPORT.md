# PHDK source remediation — candidate 5.1.43 (2026-10-14)

## Finding CHK-AUTO-021 — apply trusted RPA tenant scope at BrowserView boundaries

The executor's explicit URL check did not share its allowlist with the Electron BrowserView navigation callbacks when a flow used an empty tab whose fixed `allowedOrigins` was undefined. Candidate `29d18efbbabe159e5279a01ba767f70e54d8afdc` attaches the trusted flow origins to the active WebContents for the duration of execution. TabManager navigation/frame/redirect and popup handlers and the `tabs:navigate` IPC resolve that active scope before the tab's fixed scope. A `finally` block restores prior scope on every exit path. Private CRM origins explicitly configured for the tenant remain supported.

The fix is commit `29d18efbbabe159e5279a01ba767f70e54d8afdc`; exact tested candidate including cancellation cleanup assertion is `076bce49bead0029fd8fc9ea7f79389538f526e5` (tree `7c2cdffbac9887d974f886d8144cff330029c691`). Validation: Browser offline suite 27/27; Electron security-policy and source-wiring tests 9/9; Browser `npm run build` passes; PHDK coherence passes 52/52. Five app package/lock roots and the Browser renderer report 5.1.43. UAT-039's evidence is `../50-uat/evidence/uat-rpa-active-tab-navigation-scope-5.1.43.json`.

This is source and synthetic contract coverage only. Browser ESLint cannot run because installed ESLint 10 requires a flat config absent from this package. No packaged Electron runtime, private endpoint, CRM, DB, customer data, device, or deployment was exercised. Cross-origin subresource behavior remains open; overall PHDK Auto remains partial for DB/CRUD, identity, native device/audio, broad accessibility/localization, deployed SEO/AEO and per-customer integration gates.
