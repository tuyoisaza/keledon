# UX/UI UAT audit — run 20261014-0007-phdk-auto-completion

## Production v5.2.6 — public mobile header/menu target sizes (UAT-125/126)

Production UAT-125/126 on the anonymous homepage in Portuguese/dark measured the expanded navigation and visible header controls at 320×720 and 375×812. After PR #240/#241, all measured public targets (brand link, diagnostics/cache buttons, menu button, navigation links, theme/language selectors and sign-in/create-account links) are at least 44px high. No horizontal overflow was measured; screenshots were visually inspected. Evidence: `evidence/uat-125-production-mobile-menu-targets-retest-2026-10-17.json` and `evidence/uat-126-production-mobile-brand-target-retest-2026-10-17.json`. This closes only the sampled public mobile target-size findings. Focus/screen-reader behavior, other routes, other locale/theme combinations, authentication/RBAC, zoom and audio/device flows remain unaccepted.

## Candidate 5.1.61 — public navigation layout

UAT-052 observed and fixed the desktop overlap between Landing's fixed navigation preference controls and hero disclaimer. At 1280×900 the production-built page exposes theme and language selectors without overlap; at 390×844 the expandable mobile navigation keeps both labeled selectors reachable. The Web and Landing Navbars share this responsive structure. Evidence: `docs/phdk/evidence/uat-landing-navbar-5.1.61.json` and desktop/mobile screenshots. The observation is scoped to the public page; it does not establish screen-reader, all-route, or broad responsive/localization acceptance. No P0/P1 remains in this tested journey.

Candidate source fingerprint `sha256:b93f388303c3bf87df539facf4594d55d4961de4eb83c025513b44241ae33d3b`; local production SPA and synthetic API fixtures only. Focused observations: diagnostics widget remains visible to anonymous visitors with exact 12px text, 28×28px visible controls, 14×14px glyphs and 4px gap; copy/reset success and failure state work; 390px width and simulated 200%/400% viewport layouts avoid horizontal overflow; theme persistence and automated login text contrast checks pass; keyboard/focus and localized management journeys pass in the synthetic fixture. Screenshots: `docs/phdk/evidence/uat-login-desktop.png`, `uat-login-mobile.png`, `uat-login-light.png`, `uat-login-corporate.png`, `uat-login-dark.png`, `uat-login-200-percent.png`, `uat-login-400-percent.png`.

This scoped sample is not a whole-route audit, screen-reader certification, native desktop review, or deployed visual acceptance. No confirmed P0/P1 visual failure appeared in these exercised journeys. Remaining MANUAL/BLOCKED work: broader active routes/roles, screen reader, real keyboard/focus review beyond selected journeys, actual OS permission dialog and physical device/audio, plus real role authentication. Continue under UAT Fix/Check; do not close accessibility from this sample alone.

## Candidate 5.1.64 — public diagnostics hit-target correction

The existing 28×28px visible controls did not prove the PHDK-required 44×44px effective target. UAT Fix replaces the small hit boxes with 44×44px buttons and draws the same compact 28×28px tile inside each. The hit boxes have 4px separation, so they remain distinct. UAT-056 measures the browser geometry at desktop and mobile sizes and confirms accessible names and the unchanged navigation preferences. Pass evidence and screenshots are in `evidence/uat-056/`.

This closes the target-size finding for Web/Landing only. Native packaged Browser/Electron controls and broader screen-reader and route coverage remain unverified.

---
