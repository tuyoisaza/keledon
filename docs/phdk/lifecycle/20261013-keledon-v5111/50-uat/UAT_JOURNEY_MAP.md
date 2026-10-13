# UAT journey map — KELEDON 5.1.12

Candidate: `ca34792`. Browser evidence is local, isolated, and synthetic; role fixture journeys are not real logins.

| Persona / story | Case and steps | Result | Evidence |
|---|---|---|---|
| Anonymous / US-001 | Login → inspect compact version actions → copy → verify success → force clipboard failure → owned-state reset | PASS; success is time-bounded and failure is not reported as success | `uat-login-desktop.png`, `uat-local-web.json` |
| Anonymous / US-005 | Login → choose each palette → verify primary token/actual button RGB → automated visible-text scan → 390/640/320px reflow | PASS; no sampled failures or horizontal overflow | `uat-login-light.png`, `uat-login-corporate.png`, `uat-login-dark.png`, mobile/200/400% captures |
| Superadmin / US-004 | `/management/companies` → open Company Co detail → keyboard/Escape/focus restoration → collapse navigation | PASS in synthetic UI context | `uat-superadmin-company-details.png` |
| Admin / US-003 | Company detail → restricted user/team form → provider settings replacement | PASS in synthetic UI context; API writes intercepted | `uat-admin-company-details.png`, `uat-admin-users-team-scope.png` |
| Coordinator / US-003 | Company detail → keyboard/Escape/focus restoration → collapse navigation | PASS in synthetic UI context | `uat-coordinator-company-details.png` |
| Admin / US-004 | `/management/debug` → off (no read) → on (one safe registry read) → click only safe health probe → off (clear) | PASS with mocked API; CRM execute remains manual-only | `uat-admin-endpoint-diagnostics.png` |
| Guest / US-003 | Attempt `/management/companies` | PASS frontend redirect without loop; actual server auth is separate API evidence | `uat-local-web.json` |
| User/agent / US-002/003 | Persisted login, provider-configured voice/call, database CRUD and tenant isolation | BLOCKED/MANUAL; no real provider, DB or identity was used | API suite is isolated regression evidence only |

No client-specific CRM/call vendor journey was defined. See `UAT_CASES.md` for every case and `UAT_REPORT.md` for the open acceptance actions.
