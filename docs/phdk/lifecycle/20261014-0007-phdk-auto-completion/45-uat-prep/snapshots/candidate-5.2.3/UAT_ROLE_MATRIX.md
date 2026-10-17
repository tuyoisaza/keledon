# Matriz de roles UAT — KELEDON 5.2.3

Los nombres/emails `.invalid` de abajo son IDs propuestos, no cuentas reales. Ninguna identidad se provisionó. Usuario, tenant y sesión se derivan del camino de auth normal y BD; una etiqueta de rol en navegador no prueba autorización.

| Persona | Fixture propuesto | Acceso permitido | Denegación requerida | Preparación actual |
|---|---|---|---|---|
| Anónimo | Ninguno | `/`, `/login`, assets públicos | rutas/diagnósticos protegidos sin sesión | UAT público UAT-112–117 parcial; API actual pendiente |
| Plataforma | `phdk-uat-superadmin` / `uat-superadmin@companyco.example.invalid` | asignar roles/tenants según server authority | suplantar identidad; revelar valores secretos; acción con tenant client-supplied | BLOCKED; no cuenta |
| Admin tenant A | `phdk-uat-admin` / `uat-admin@companyco.example.invalid` | usuarios/equipos/interfaces de su empresa | elevar roles, crear/borrar empresa, acceso tenant B | BLOCKED; no cuenta |
| Coordinator tenant A | `phdk-uat-coordinator` / `uat-coordinator@companyco.example.invalid` | operaciones autorizadas de su empresa | elevar roles, crear/borrar empresa, acceso tenant B | BLOCKED; no cuenta |
| Agent tenant A | `phdk-uat-agent` / `uat-agent@companyco.example.invalid` | equipo asignado y operaciones permitidas | administración, secretos y equipo ajeno | BLOCKED; no cuenta |
| User tenant A | `phdk-uat-user` / `uat-user@companyco.example.invalid` | datos/rutas propios permitidos | admin, recursos ajenos y tenant B | BLOCKED; no cuenta |
| User tenant B | `phdk-uat-other-user` / `uat-user@otherco.example.invalid` | recursos propios de tenant B | Company Co/tenant A y IDs directos ajenos | BLOCKED; no cuenta |
| Browser device A | `phdk-uat-device-a` | reclamar comandos solo de A con lease vigente | claim/heartbeat/result de B, replay de lease vencido | BLOCKED; no device |
| Browser device B | `phdk-uat-device-b` | reclamar comandos solo de B con lease vigente | claim/heartbeat/result de A, replay de lease vencido | BLOCKED; no device |

Ningún account, device, secret, CRM o voice provider se configura desde esta matriz. Google OAuth queda EXTERNAL/BLOCKED porque cada cliente es dueño de su proveedor.
