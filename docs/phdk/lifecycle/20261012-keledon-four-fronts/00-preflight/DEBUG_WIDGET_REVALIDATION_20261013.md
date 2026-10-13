# Debug widget revalidation — 2026-10-13

Product source reviewed: KELEDON `main` 5.1.2, SHA `e305d3d817ff20ed52ed889315e2d618127d7d9f`. This was source/test revalidation; no new browser/native runtime was exercised.

- Shared web widget is mounted by Navbar (public landing), LoginPage, and Sidebar (authenticated app/admin). Focused component tests cover anonymous/debug-off, exact version→clipboard→trash order, hidden status, dimensions, independent confirmations, success/revert and failure behavior.
- Legacy landing shares the same diagnostics/component source; its contract test verifies parity.
- Native Browser has its own renderer helper, compact row, localized accessible names, hidden live status, allowlisted diagnostics and owned-state reset with verified IPC results. The helper tests pass in the recorded suite; Electron rendering/device/audio remain UNVERIFIED.
- Sanitization and bounds are source/test verified: allowlisted event fields, 100 event buffer, 2,000-character strings, redacted URLs/keys/identities, owned-key/cache/cookie reset, and no false success on partial failure.
- Exact web visible metrics: 12px version, 28×28 controls, 14px icons, 4px gap. A 44px effective hit target is not evidenced; two adjacent 44px targets would overlap within that geometry.
- Existing local synthetic UAT reports cover web placement, action outcomes, reset boundaries, mobile reflow and theme switching on 5.1.2. They are not Electron or production evidence.

Result: no source-level widget blocker found. Check retains native visual/runtime and broader route/locale/screen-reader acceptance as open.
