# PHDK Lifecycle Handoff — UAT-107 mobile layout failure

Run ID: `20261014-0007-phdk-auto-completion`
Stage: `50-uat` → `60-uat-fix`
Status: `PRE-FIX FAILURE CLOSED FOR RESPONSIVE SCOPE BY UAT-108; OTHER CMT-002 GATES OPEN`
Date: `2026-10-17`

## Production observation

In an anonymous production page at 375×812 CSS px and 320×720 CSS px, the hero content remained 439 px wide and was visibly clipped at the viewport's right edge. At 320 px, the fixed navigation measured 97 px high while the demo disclaimer began at y=64 px, so the header overlapped it. The menu button measured 24×24 px, while adjacent copy/reset controls were 44×44 px. Details: `evidence/uat-107-production-mobile-layout-2026-10-17.json`.

This was a reproducible defect on the pre-remediation production 5.2.1 page. No user session, forms, clipboard contents, microphone, customer data or backend state was accessed. UAT-108 below records the deployed retest.

## Remediation candidate

Branch `fix/production-mobile-landing-overflow` narrows the mobile hero using full-width/min-width constraints, lays out the three architecture stats as a responsive grid, moves the mobile hero below the fixed header and gives the mobile navigation action a 44×44 target. The active deployment source is `services/web`; the duplicate `landing` copy received the same layout changes to prevent drift. [PR #213](https://github.com/tuyoisaza/keledon/pull/213) is merged and accepted for the responsive scope by UAT-108.

## Required revalidation

- [x] Review/merge the source PR and wait for the production Web deployment to report success.
- [x] Re-run geometry and visual review on production at 320×720, 375×812, 768×1024 and desktop.
- [x] Confirm disclaimer clears the fixed nav, copy/primary CTA remain inside the viewport, navigation target is 44×44 and no horizontal clipping remains.
- [ ] Re-run theme/locale checks and then continue contrast/screen-reader acceptance.

No local application tests or builds were run per owner instruction. Keep CMT-002 and whole Auto PARTIAL until its other accessibility, diagnostic and audio gates pass.

## Post-deploy closeout — UAT-108

This handoff's pre-fix status is historical. PR #213 was merged at `5884b80ba4318b2c4beed3e50d94945028b9a311`; Railway deployment `05e6bd08-4d52-4ea2-ac42-36d1a1c29ede` is `SUCCESS`. UAT-108 revalidated production at 320×720, 375×812, 768×1024 and 1440×900; all responsive criteria pass. See `50-uat/evidence/uat-108-production-mobile-layout-2026-10-17.json`. Responsive failure is closed for the deployed candidate; contrast, screen-reader, diagnostics RBAC, authenticated and audio gates remain open.
