# Integration Review — candidate 5.1.63 public diagnostics placement

Date: 2026-10-15
Base: verified `origin/main` 5.1.62 at `0886fbd6a06d7519158ae5f6bbd9873e44477c8b`
Candidate branch: `fix/phdk-widget-position-5-1-63`

CHK-AUTO-023 found that Web and Landing placed the required diagnostics row beside the brand. Installed PHDK requires it directly below the product name, top-left. The mirrored Navbar wrappers now use a vertical stack with left alignment and a compact gap. The public nav remains a horizontal row at its outer layout level; theme/language controls and mobile menu behavior are retained.

The UAT test asserts actual production-built Landing geometry and captures a source fingerprint. At 1280×900 the brand bounds are x=32/y=16–48 and widget bounds x=32/y=52–80. Theme and language controls remain visible; the widget does not overlap the hero. At 390×844, the compact widget remains visible and the expanded mobile menu exposes both preferences. All external page requests are blocked. Evidence and screenshots are in `../50-uat/evidence/uat-055/`.

Validation: Web diagnostics/debug-mode/version-actions 19/19; all five production builds pass; all application package/lock roots are 5.1.63, renderer synchronization passes, and installed PHDK coherence is 52/52. This is a bounded Web/Landing review. Native Browser visual behavior, broad route/accessibility/localization, deployed SEO/AEO, device/audio and customer integrations remain outside this slice.

Decision: integrated for the UAT/check stages. Whole-product acceptance remains PARTIALLY DELIVERED.
