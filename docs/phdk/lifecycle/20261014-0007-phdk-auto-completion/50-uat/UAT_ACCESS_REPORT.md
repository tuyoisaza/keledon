# UAT access report — run 20261014-0007-phdk-auto-completion

## Latest continuation — 2026-10-14 local / 2026-10-15 UTC, candidate 5.1.52

The 5.1.51 DB-backed UAT remains the baseline for migrations, persisted registration/login, roles, tenant boundaries, secret migration and safe vendor projections. On exact candidate `03ea78968103aa6bc6290ed0681b1c1ea345872a` / 5.1.52, an admin authenticated against the same disposable PostgreSQL 16.15 database; allowed session create and metadata/status update persisted and read back, while legacy `summary` writes and team reassignment returned HTTP 403. Detailed combined evidence: `evidence/uat-postgres-roles-5.1.52-03ea7896.json`; baseline evidence: `evidence/uat-postgres-roles-5.1.51-5b7e2551.json`.

The exact 5.1.52 built-Web suite was rerun with `npm run test:uat`: 4/4 suites passed. It uses mocked Company Co APIs, intercepted external traffic and simulated viewport dimensions; it does not certify a deployed login, full-app WCAG conformance or native media consent.

KnowledgeBase and KnowledgeDocument create/update/read passed against PostgreSQL. Delete could not pass because the isolated Qdrant service was unavailable; the API kept vector cleanup as a dependency and no vector data changed. UAT-010 is therefore scoped PASS with this Qdrant-dependent delete path BLOCKED. The API and PostgreSQL processes are stopped; only the isolated synthetic cluster remains in task temp. No production DB, customer endpoint, external provider, email, or physical microphone was used.

Target exercised: local built production SPA served at loopback with Company Co synthetic fixture and intercepted API; outbound HTTP/WebSocket is blocked by the harness. This does not verify a deployed development URL or authenticate a real account.

| Access target | Method | Identity/data | Result / cleanup |
|---|---|---|---|
| Local Web SPA | Local static build and Playwright; isolated ephemeral contexts | Synthetic fixtures only; role values mocked by `/api/auth/me`; emails use `.invalid` domain | Allowed UAT-only local test; server/context closed at completion. |
| API/Cloud policy | Local regressions plus loopback API against disposable PostgreSQL | Synthetic actor/company IDs; no provider requests | Session CRUD persisted; API and DB stopped after UAT. |
| Deployed development | No reachable/verified safe target configured | No accounts, credentials or tokens used | BLOCKED; user can resume by providing the non-secret development URL and confirming it contains synthetic test data, then authenticate in their own secure interface if needed. |
| Native Electron/device | No supported physical media session in this UAT run | No camera/mic/device data captured | MANUAL/BLOCKED; requires permitted test device and supported Windows host. |
| Disposable DB | PostgreSQL 16.15, `127.0.0.1:55432`; API `127.0.0.1:3041` | Synthetic `.invalid` identities and tenant fixtures | PASS for listed migrations/auth/role/tenant/session operations; exhaustive model matrix and Qdrant-backed deletion remain open. |

No account provisioning, test-role switch, email delivery, production browsing, provider write, paid call, database migration or secret read occurred.

