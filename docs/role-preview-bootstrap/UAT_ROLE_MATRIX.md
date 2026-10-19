# Planned role cases — runtime not yet verified

| Persona | Scope | Required denial |
|---|---|---|
| Real operator | Provision/retire owned synthetic run only during this acceptance | Not used as acceptance identity |
| Synthetic superadmin | Identity, role list/start/return only | General CRUD/admin, bootstrap, TTS, sockets |
| Synthetic user | Own allowed read-only views | Writes, privileged switches, foreign tenant |
| Synthetic agent | Own allowed read-only views | Writes, privileged switches, foreign tenant |
| Synthetic admin | Company Co A read-only management | Writes, Company Co B/global scope |
| Synthetic coordinator | Company Co A read-only management | Writes, Company Co B/global scope |
| Expired/revoked operator or preview | No authenticated access | Identity and role operations denied |

All identities remain UNVERIFIED until exact-candidate production bootstrap and `/me` evidence. Do not infer readiness from these labels.
