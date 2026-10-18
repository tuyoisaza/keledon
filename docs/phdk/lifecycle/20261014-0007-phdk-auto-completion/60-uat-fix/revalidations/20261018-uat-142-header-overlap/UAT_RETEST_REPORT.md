# UAT retest status — 5.2.12 header spacing (2026-10-18)

UAT-142 is **PARTIAL** on production v5.2.11: all four targets pass at 44 px and the page has no horizontal overflow, but the fixed header overlays the H1 by 29.3 px at 320×720. Candidate source repair reserves additional top spacing (`pt-40`).

UAT-145 is **PENDING_DEPLOYMENT** for production v5.2.12. Required: fresh anonymous `/login`, measure header bottom and `#login-heading`, confirm no rectangle intersection, retake the four control sizes and document width, inspect AX names/screenshot, reset viewport. Do not submit forms, log in, activate OAuth, diagnostics or cache controls. Evidence for the finding: `../../../50-uat/evidence/uat-142-production-login-mobile-2026-10-18.json`.
