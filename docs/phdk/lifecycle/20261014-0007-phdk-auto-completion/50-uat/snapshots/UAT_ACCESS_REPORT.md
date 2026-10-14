# UAT access report — run 20261014-0007-phdk-auto-completion

Target exercised: local built production SPA served at loopback with Company Co synthetic fixture and intercepted API; outbound HTTP/WebSocket is blocked by the harness. This does not verify a deployed development URL or authenticate a real account.

| Access target | Method | Identity/data | Result / cleanup |
|---|---|---|---|
| Local Web SPA | Local static build and Playwright; isolated ephemeral contexts | Synthetic fixtures only; role values mocked by `/api/auth/me`; emails use `.invalid` domain | Allowed UAT-only local test; server/context closed at completion. |
| API/Cloud policy | Local regression scripts and Jest fixtures | Synthetic actor/company IDs; no DB connection or provider requests | Isolated process; no persistent writes. |
| Deployed development | No reachable/verified safe target configured | No accounts, credentials or tokens used | BLOCKED; user can resume by providing the non-secret development URL and confirming it contains synthetic test data, then authenticate in their own secure interface if needed. |
| Native Electron/device | No supported physical media session in this UAT run | No camera/mic/device data captured | MANUAL/BLOCKED; requires permitted test device and supported Windows host. |
| Disposable DB | Not configured | No persistent test data | BLOCKED; requires isolated disposable PostgreSQL URL/backup plus migration rollback plan; never provide production URL. |

No account provisioning, test-role switch, email delivery, production browsing, provider write, paid call, database migration or secret read occurred.

