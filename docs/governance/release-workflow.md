# Current scoped release process
Updated 2026-10-12 for the owner-confirmed KELEDON Auto portfolio.

## Current source and version
services/web and services/api are the current source-configured services; browser is Electron. cloud/landing remain retained compatibility trees. Source configuration is not proof of production deployment.
Keep the five package manifests and each matching package-lock root/packages-empty-key version coherent for one integrated repair release; never downgrade to historical 0.2.x.

## Delivery
Finish confirmed implementation, central diff/security review and applicable local acceptance/check gates. Use a scoped branch, version-prefixed commit, PR, required reviews and authorized merge, then independently read back remote main SHA/version/content. Never call an open PR completed target delivery.
Preserve actual protections/checks and existing service-specific watch paths. Report merged separately from deployed. No provider CLI/API/dashboard deployment, new previews, settings writes or secret reads.

## Automation and installer limitations
The version-bump.yml and release.yml workflows were deliberately deleted on main (5253714/58e1bb5). Do not create/enable/dispatch/retry hosted CI, recurring branch pruning or background maintenance. This document creates none.
No tag/installer build, signing, asset upload or release publication is authorized merely by product code delivery. Existing downloaded assets may be old; installer/production behavior remains UNVERIFIED without actual evidence. Preserve manual download/pairing recovery UX.
Historical release logs/specs remain provenance only; current evidence is DELIVERY_REPORT.md and the lifecycle history.
