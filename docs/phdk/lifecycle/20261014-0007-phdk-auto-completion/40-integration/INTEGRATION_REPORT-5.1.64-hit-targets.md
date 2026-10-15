# Integration Review — candidate 5.1.64 diagnostics hit targets

Date: 2026-10-15
Base: verified `origin/main` 5.1.63 at `2c1c8e58f749746253f0ff76f9c691e7ffb15644`
Candidate branch: `fix/phdk-diagnostics-hit-target-5-1-64`

CHK-AUTO-024 follows the previously recorded geometry limitation. In Web and Landing, each icon-only button now has a real 44×44px interactive box. Its `::before` tile stays centered at 28×28px; the outer buttons are 4px apart, so their hit areas do not overlap. The icon remains 14×14px, the version remains 12px, accessible labels remain on the buttons, and keyboard focus outlines the full hitbox. Both CSS mirrors are asserted equal by regression.

UAT-056 passes on the production-built Landing app with external requests blocked. At 1280×900 Playwright measured both 44×44 hitboxes and both 28×28 visual tiles, verified 4px clearance, names, hero separation and theme/language controls. At 390×844 both targets remain 44×44 and the mobile preferences remain usable. Evidence: `../50-uat/evidence/uat-056/`.

Web diagnostics/debug-mode/version-actions tests pass 19/19; Browser offline tests pass 28/28 including the native CSS contract. All five production builds and Browser renderer synchronization pass; Web/Landing lint and typechecks pass; PHDK static coherence passes 52/52. No packaged Browser/Electron rendering, real device/OS touch behavior, database, customer endpoint or deployment was exercised.

Decision: integrated for UAT and Check. Whole PHDK Auto remains PARTIALLY DELIVERED.
