## 2026-10-15 current source revalidation — 5.1.66 candidate

The shared Web `VersionActions` remains mounted on public, login, shell and admin routes; Landing mirrors that contract. API diagnostics require debug enabled and an authenticated admin/developer/superadmin, and the report projection redacts credentials, private URLs, user content and unbounded event details. Reset clears only KELEDON-owned browser state, confirms errors honestly, and routes an authenticated session back through login. Browser renderer continues to mirror version/copy/reset source behavior and is synchronized by its prebuild script.

Candidate checks: Web diagnostics/version actions 19/19; Browser offline suite 43/43 including icon geometry and owned-cache/reset policies; full production-built Web UAT 6/6 plus AI-admin journey, including anonymous/debug-off copy/reset and 390px UAT; Landing route metadata/indexability 1/1. Accessibility review found the fixed desktop sidebar squeezed the editor on mobile; the responsive shell now preserves the widget in a compact mobile header. No native packaged Electron/device/audio or screen-reader acceptance is claimed. See exact candidate screenshots/JSON in `docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/50-uat/evidence/uat-web-5.1.66/`.

| Surface/control | Evidence | Result |
|---|---|---|
| Public and login | Shared route/widget regressions; Web UAT exercises anonymous debug-off behavior. | PASS source/component and local UAT |
| Authenticated shell and admin | Sidebar and mobile shell retain the shared widget; diagnostics role gating stays server-derived. | PASS source; persisted auth acceptance remains open |
| Compact widget | 12px version, 28×28 visual tiles, 14px icons and 4px gap; 44×44 pointer boxes verified in UAT-056 on Landing. | PASS for Web/Landing tested geometry |
| Copy/reset/redaction | Web 19-test diagnostics suite and Browser owned-state test suite. | PASS for tested source/component behavior |
| Native Electron | Renderer source and 43 offline tests; no packaged application run. | PARTIAL; visual/media runtime unverified |
| Broad assistive technology | Keyboard operation covers the flow editor; full-screen-reader and all-route audit is not available. | PARTIAL / MANUAL |

---

## 2026-10-15 current source revalidation — 5.1.64 candidate

CHK-AUTO-024 resolves the 44×44px target gap for Web/Landing diagnostics. Each button measures 44×44px, with a centered 28×28px visual tile and 4px separation. UAT-056 passes on production-built Landing at 1280×900 and 390×844; evidence with candidate fingerprint and screenshots is `docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/50-uat/evidence/uat-056/`. Web diagnostics pass 19/19, Browser offline source suite 28/28, five app builds, Web/Landing lint/typecheck and PHDK coherence 52/52. The native Browser/Electron implementation has a matching source contract but no packaged runtime measurement.

---

## Previous source revalidation — 5.1.60 candidate

Candidate: `fix/phdk-landing-widget-mount-5-1-60`, based on verified `main` `e41f1530a5ec4b56fdccc5d2ca12eb88bc589cd5`. The mandatory PHDK widget is present in the current app sources. The focused recheck found one test gap: Landing route mounts were not independently asserted. UAT-051 extends the Web test to assert Landing's own public `LandingPage`→`Navbar`, login, `AppLayout`→`Sidebar`, and superadmin admin route, as well as existing Web mounts.

Current verification: Web diagnostics/version-actions 19/19, Browser version-actions/security-policy 15/15, Landing SEO source test 1/1, API/Cloud regressions 37/37 and 17/17, all five application builds, applicable lint/typechecks and PHDK coherence 52/52 pass. Browser `index.html` renderer version synchronizes to 5.1.60. This is source/component testing only; no browser session, screen reader, native Electron visual run, physical device/audio, database, customer endpoint or deployment was exercised.

The visible controls remain 12px version, 28×28 buttons, 14×14 icons and 4px gap. A non-overlapping effective 44×44 hit target is not currently evidenced under the mandated compact row geometry, so it remains **UNVERIFIED / geometry-limited**. Broad route/locale/screen-reader accessibility and native rendering remain open. No new runtime defect was found in this scoped review.

---

# Debug widget readiness — current source revalidation

Run: `20261012-keledon-four-fronts`, revalidated 2026-10-13. Product source: merged KELEDON `main` 5.1.2 at `e305d3d817ff20ed52ed889315e2d618127d7d9f`. Current Check is source/test based; browser UAT evidence below is from the previously recorded isolated local UAT, not a new runtime claim.

| Surface/control | Source/test evidence | Result |
|---|---|---|
| Public web/landing | Shared `VersionActions` mounted by `services/web/src/components/common/Navbar.tsx:56`; `LandingPage` uses the Navbar. `version-actions.test.cjs` asserts the public mount. | PASS source/test |
| Login | `services/web/src/pages/LoginPage.tsx:63` mounts the same widget; anonymous/debug-off component test verifies exact row and no visible labels/status text. | PASS source/test |
| App/admin | `services/web/src/components/layout/Sidebar.tsx:92` mounts it in the shared app shell; `AppLayout`/`ManagementLayout` route tests cover admin. | PASS source/test |
| Legacy landing source | `landing/src` mirrors the shared diagnostics/component files; diagnostics contract test asserts byte-normalized equality with web sources. | PASS source/test |
| Native Browser/Electron | `browser/renderer/index.html:27` has version → clipboard → trash; `browser/renderer/version-actions.js:15-64` allowlists report fields, uses localized accessible labels/status, confirms copy/reset before check, restores icons and cleans timers on unload. `diagnostics.test.cjs` exercises sanitization and reset IPC outcomes. | PASS source/test; Electron visual runtime UNVERIFIED |
| Compact geometry and controls | Web CSS uses 12px version, 28×28 buttons, 14px icons and 4px gap. Component tests assert order, icon-only controls, hidden live regions and copy/clear independence. | PASS source/test |
| Copy success/failure | `VersionActions.tsx` awaits the clipboard helper; only successful copy shows check, timers restore the icon, failures retain clipboard and announce hidden status. Tests cover both. | PASS source/test |
| Reset boundaries | `diagnostics-core.ts` removes KELEDON-owned storage/cache/cookies, verifies reset and propagates partial failures; authenticated session is cleared and login navigation waits through the success indicator. Tests preserve foreign state and reject false success. Native Browser checks owned keys/caches and IPC acknowledgements. | PASS source/test |
| Redaction/bounds | `diagnostics-core.ts` allowlists event fields and sanitizes keys, paths, IDs and strings; buffers are capped at 100 events and string lengths at 2,000. `diagnostics.test.cjs` verifies secrets, identities, URLs and raw messages are excluded. | PASS source/test |
| Effective 44px pointer target | Visible controls are exactly 28px with 4px visual gap. Expanding both adjacent hit areas to 44px would overlap; no distinct non-overlapping implementation is evidenced. | UNVERIFIED / geometry-limited; visible dimensions remain compliant |
| Local browser UAT | `50-uat/UAT_REPORT.md` and `60-uat-fix/UAT_RETEST_REPORT.md` record synthetic local production-SPA checks for placement, dimensions, copy success/failure, reset boundaries, responsive reflow and theme switching on 5.1.2. | PASS for recorded cases only |

No current widget source failure was found. Browser/Electron visual rendering, microphone/device/audio, additional route/locale/screen-reader coverage remain outside the recorded evidence and stay open in Check.

## 2026-10-14 candidate revalidation — 5.1.22

The native Browser row was rechecked against the installed PHDK contract rather than relying on the 5.1.2 record above. `browser/renderer/version-actions.js` now reads the installed Electron version, builds a structured report from an allowlisted event projection, excludes raw event payloads, waits for clipboard/reset acknowledgements before the checkmark, and reloads only after the success interval. `browser/scripts/sync-renderer-version.js` synchronizes `renderer/index.html` from the package version on `prebuild`, `prestart`, and `premake`; module-boundary tests reject drift. The widget tests inspect the copied report and assert only KELEDON-owned state is cleared. Debug mode defaults on for unpackaged builds and off for packaged builds, with tested explicit overrides; the console button starts hidden until the main process confirms debug mode. The Browser preload no longer exposes device identifiers or local log paths through `device:getInfo`.

Verification: Browser renderer/runtime tests 5/5 and TypeScript build pass; web widget/diagnostics tests 17/17 and Landing build pass. API regression 18/18, Cloud regression 9/9 and configured API/Cloud builds pass. This evidence is source/test evidence; the native Electron rendering, OS permission prompts, device/audio journey and deployed runtime remain UNVERIFIED. The public, login, authenticated shell and admin mounts and shared Web/Landing sources remain in place.
## 2026-10-15 candidate revalidation — 5.1.63

CHK-AUTO-023 fixed the public navigation placement in both `services/web/src/components/common/Navbar.tsx` and `landing/src/components/common/Navbar.tsx`: the mandatory widget is now stacked directly below the KELEDON name and aligned to its left edge. Full Web diagnostics/debug-mode/version-actions suite passes 19/19. UAT-055 passes in production-built Landing with outbound traffic blocked: at 1280×900 the brand bounds are (32,16–48) and widget bounds (32,52–80), with no hero overlap; at 390×844 the widget remains visible and the mobile theme/language controls work. Exact browser evidence is in `docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/50-uat/evidence/uat-055/`.

These results establish source and local browser behavior for the public Web/Landing surface. The native packaged Browser UI, screen reader, broad route/locale coverage, and physical device/audio remain unverified. The visible controls remain 28×28 with 4px gap; a compliant non-overlapping effective 44×44 pointer target remains **UNVERIFIED / geometry-limited**.

---
