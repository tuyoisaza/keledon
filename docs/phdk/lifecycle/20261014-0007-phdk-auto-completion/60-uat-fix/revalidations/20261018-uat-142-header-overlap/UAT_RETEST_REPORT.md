# UAT retest status — 5.2.12 header spacing (2026-10-18)

## UAT-145 — production retest, KELEDON 5.2.12

**PASS_SCOPED.** After Railway Web and API both reported SUCCESS for main `327a4e65121bf6f085787f721fa0d291fae2ebb9`, a fresh anonymous `/login` session displayed v5.2.12 at 320×720 CSS px. The fixed header ends at y=156 and `#login-heading` starts at y=184, leaving a 28px gap and no intersection. The brand link, email, password and signup controls each measure at least 44px high; the page has no horizontal overflow (document client/scroll width 305px with the vertical scrollbar inside a 320px viewport). Accessibility names were present in the AX tree and the screenshot was visually inspected. No form or diagnostic/cache/OAuth action was activated. Temporary viewport was reset. Evidence: `../../../50-uat/evidence/uat-145-production-login-mobile-2026-10-18.json`.

UAT-142 remains recorded as the historical partial that exposed the overlap on 5.2.11; UAT-145 closes that specific layout finding on 5.2.12. Broader accessibility, authentication and widget/diagnostics acceptance remain open.

UAT-142 is **PARTIAL** on production v5.2.11: all four targets pass at 44 px and the page has no horizontal overflow, but the fixed header overlays the H1 by 29.3 px at 320×720. Candidate source repair reserves additional top spacing (`pt-40`).
