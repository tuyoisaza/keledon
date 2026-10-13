# UAT role matrix — KELEDON 5.1.12

Candidate: `ca34792` (branch `phdk/theme-palette-descendant-vars`). Synthetic Company Co fixtures only; UI roles use isolated contexts and intercepted APIs.

| Persona/role | Intended boundary | Verified in this run | Not established |
|---|---|---|---|
| Anonymous | Public/login diagnostics and locale/theme controls | Headless Edge UI journey; copy/reset, theme, mobile, zoom simulation | Live auth or production session |
| Guest | No management access | Synthetic frontend guest redirected without a loop; API denial covered by regression | Persisted role/session |
| User | Company/team scoped product access | DB actor and resource negative/positive contract cases in API regression | Dedicated frontend session and full CRUD persistence |
| Agent | Assigned operational work | Source/API boundaries only | Browser execution or live call |
| Coordinator | Company-scoped coordination; no role/company escalation | Synthetic management detail, keyboard/focus, collapsed widget | Persisted account and exhaustive operation matrix |
| Admin | Company administration; no role/company escalation | Synthetic management and user/team write payload; write-only provider key | Persisted account and full tenant matrix |
| Superadmin | Global administration and permitted role/company assignment | Synthetic company detail and user-form privilege controls; isolated API role guards | Persisted account or live impersonation/session |

Client-specific call/CRM systems are tenant-selected. No provider is treated as universal and no client workflow was run.
