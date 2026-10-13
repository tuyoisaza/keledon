# Debug widget readiness — baseline
Run: 20261012-keledon-four-fronts; source revision 5253714; no runtime/visual test yet.
| Surface/control | Evidence | Result |
|---|---|---|
| Web public | LandingPage.tsx uses Navbar; no shared diagnostic row | FAIL |
| Web login | LoginPage.tsx:162-191 timestamp, Copy Logs/Reset text, no confirmed success | FAIL |
| App/admin | Sidebar.tsx:85-117 10px version/12px icons/gap-2, toasts and raw storage.clear | FAIL |
| Collapsed app | separate controls, version row not preserved | FAIL |
| Legacy landing | landing Sidebar repeats implementation | FAIL |
| Electron | renderer/index.html:1074 command log before version; copy changes version text | FAIL |
| Redaction | debug-report.ts serializes arbitrary console args and full URL; no sanitizer | FAIL |
| Capture bounds | MAX_LOGS=100, MAX_LOG_LENGTH=2000 | source present; runtime UNVERIFIED |
| Reset | broad storage.clear, no scoped cache/cookie result or independent check | FAIL |
| Regression/component/browser tests | not executed this run | UNVERIFIED |
Target: shared version/copy/trash row on all applicable shells; version 12px, buttons 28px, icons 14px, gap 4px, accessible localized labels/focus/live status; independent awaited green checks/revert; sanitized bounded report; app-owned cache/session reset only. Preserve business/foreign data and auth policy. No privileged diagnostic fetch for anonymous users. WS-002 owns all findings.

## Current shared implementation status — 2026-10-12
Web and landing share safe diagnostic capture/reset, locale catalogs, version row and theme controls; native Browser uses its actual helper and IPC. Allowlisted metadata excludes free-form logs, URLs, identity and credential values. Storage reset deletes only owned keys/cache and propagates failures. Local built web UAT verified position/dimensions, copy success/failure, reset boundaries, mobile reflow and dark/light/corporate switch. Focused contract suites pass. The visual evidence is local synthetic; actual Electron rendering is not observed.
