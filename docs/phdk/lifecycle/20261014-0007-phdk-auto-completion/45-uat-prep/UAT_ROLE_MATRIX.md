# Matriz de roles y tenant — CMT-003C / KELEDON 5.2.10

Fecha: 2026-10-17 · Estado de fixtures: **NOT PROVISIONED** · aceptación autenticada: **BLOCKED**.

| Actor/recurso | Permitido en este run | Denegación requerida | Estado |
|---|---|---|---|
| Visitante anónimo | Páginas y assets públicos; 404 noindex | API/rutas privadas sin sesión | UAT-140 PASS_SCOPED (404); no cubre API autenticada |
| Operador superadmin existente | Provisionar/limpiar los fixtures mínimos por la consola normal, si está disponible | Crear superadmin de prueba; crear roles admin/coordinator; compartir o falsear claims | No se preparó sesión y el ciclo auditado/reversible de fixtures no está listo; no ejecutar |
| Usuario regular Tenant A | Sus rutas/recursos permitidos en A | B, IDs ajenos, administración o secretos | BLOCKED — cuenta no creada |
| Usuario regular Tenant B | Sus rutas/recursos permitidos en B | A, IDs ajenos, administración o secretos | BLOCKED — cuenta no creada |
| Browser device A | Comandos de A con vínculo vigente | Comandos/resultados de B; lease vencido o replay | BLOCKED — device no creado |
| Browser device B | Comandos de B con vínculo vigente | Comandos/resultados de A; lease vencido o replay | BLOCKED — device no creado |
| Flow sintético A | Secuencia inerte sin PII ni destino externo, ligado a Team A | Usuario B/device B no pueden leer ni ejecutar el flow A; sin efectos CRM, email, voz o escritura de cliente | BLOCKED — único flow autorizado no creado |

Este mínimo **no** incluye fixtures para superadmin, admin, coordinator o agent. Sus permisos se aceptan bajo CMT-004 y requieren su propio alcance sintético, identidad normal y autorización. La política de tenant sigue siendo: actor/tenant derivados de la BD; ninguna selección del cliente reemplaza autorización server-side.
