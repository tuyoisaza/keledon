# UAT role matrix — run 20261014-0007-phdk-auto-completion

Fixture policy: all names/data are synthetic Company Co records. UAT harness uses intercepted API responses and role-shaped fixtures; it does not create or authenticate real accounts.

| Persona | Source-backed intended access | Local UI fixture | Access verification |
|---|---|---|---|
| Anonymous/guest | Public home/login and public-safe diagnostics; no management | Local production SPA, mocked endpoints | To be exercised in UAT; actual deployed auth not verified. |
| user | Own profile/devices and permitted operator flows; no management or elevation | Synthetic Company Co operator response | Mocked UI only; backend denial separately source-regression tested. |
| coordinator | Company-bounded management, cannot elevate or delete companies | Synthetic tenant role where journey supports | Mocked UI only; tenant/role negatives in API/Cloud regressions. |
| admin | Company-bounded management, cannot elevate or delete companies | Synthetic tenant role where journey supports | Mocked UI only; tenant/role negatives in API/Cloud regressions. |
| superadmin | Authorized cross-tenant administration and role/company assignment | Synthetic elevated response for UI journey | Mocked UI only; current DB-role guard covered by server tests. |
| Native Browser/device | Paired tenant runtime, explicitly permitted media permission and vendor origin | Not exercised through OS/Electron in this local SPA UAT | MANUAL/BLOCKED pending supported desktop and device/audio setup. |

No real login accounts, role-switch capability, or hosted development target is claimed. Superadmin audited test-profile switching is not evidenced; record as blocked requirement for UAT Fix/decision routing.

