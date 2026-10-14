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
