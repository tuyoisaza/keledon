# PHDK Lifecycle Handoff — UAT-107 mobile layout failure

Run ID: `20261014-0007-phdk-auto-completion`  
Stage: `50-uat` → `60-uat-fix`  
Status: `FAIL REPRODUCIBLE ON PRODUCTION 5.2.1; FIX CANDIDATE NOT DEPLOYED`  
Date: `2026-10-17`

## Production observation

In an anonymous production page at 375×812 CSS px and 320×720 CSS px, the hero content remained 439 px wide and was visibly clipped at the viewport's right edge. At 320 px, the fixed navigation measured 97 px high while the demo disclaimer began at y=64 px, so the header overlapped it. The menu button measured 24×24 px, while adjacent copy/reset controls were 44×44 px. Details: `evidence/uat-107-production-mobile-layout-2026-10-17.json`.

This is a reproducible candidate defect in current production 5.2.1. No user session, forms, clipboard, local app cache, microphone, customer data or backend state was accessed.

## Remediation candidate

Branch `fix/production-mobile-landing-overflow` narrows the mobile hero using full-width/min-width constraints, lays out the three architecture stats as a responsive grid, moves the mobile hero below the fixed header and gives the mobile navigation action a 44×44 target. The active deployment source is `services/web`; the duplicate `landing` copy received the same layout changes to prevent drift. The candidate is **not deployed or accepted**.

## Required revalidation

- [ ] Review/merge the source PR and wait for the production Web deployment to report success.
- [ ] Re-run geometry and visual review on production at 320×720, 375×812, 768×1024 and desktop.
- [ ] Confirm disclaimer clears the fixed nav, copy/primary CTA remain inside the viewport, navigation target is 44×44 and no horizontal clipping remains.
- [ ] Re-run theme/locale checks and then continue contrast/screen-reader acceptance.

No local application tests or builds are to be run per owner instruction. Keep CMT-002 and whole Auto PARTIAL until the deployed candidate passes the required production revalidation.
