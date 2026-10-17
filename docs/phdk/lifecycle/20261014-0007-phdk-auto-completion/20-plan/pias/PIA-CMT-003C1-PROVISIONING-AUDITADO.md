# Sub-PIA CMT-003C1 — provisioning/cleanup auditado de fixtures

Estado: **DESIGN READY / IMPLEMENTATION BLOCKED FOR SECURITY REVIEW** · Compromiso: CMT-003 · Requisito de CMT-003C y aceptación dependiente de CMT-003A/B y CMT-004. Baseline de producto KELEDON 5.2.10, source `fd429298a85bdcf3b5c20791f9b1598c132aabcb`; PHDK 2.53.1. Fecha: 2026-10-17.

## Hallazgo de fuente

La administración de empresas y usuarios ya tiene páginas normales bajo `/management/companies` y `/management/users`, rutas `/api/crud/companies` y `/api/crud/users`, `AuthGuard` global y `CrudAccessGuard` que vuelve a leer rol/tenant desde la BD. El guard restringe el CRUD de empresas a superadmin y fuerza nuevas cuentas de admin/coordinator a rol `user` dentro de su propia empresa.

El ciclo existente no cumple el gate CMT-003C completo:

- `AuditInterceptor` inicia la escritura de auditoría en forma asíncrona tras enviar la respuesta; un fallo de auditoría no revierte ni rechaza la mutación. Para crear/borrar fixtures no garantiza evidencia durable antes de aceptar la operación.
- `deleteCompany` llama `prisma.company.delete`; no demuestra desactivación reversible, TTL o cleanup idempotente por run.
- `createUser` crea un registro de usuario, pero no aprovisiona un login normal sin configuración/identidad de proveedor; no se debe mandar invitación para el run autorizado.
- El test-as existente solo opera en development/staging y `uatTestProfilesEnabled` excluye producción. No habilitar variables ni relajar ese control para hacer pasar UAT.
- El Browser device, su vínculo y un flow inerte necesitan su propio ciclo de vida y cleanup por tenant.

La relectura de autenticación confirma que sí existe alta e inicio de sesión first-party normal: `POST /api/auth/register` y `/api/auth/login`, además de Google OAuth. Las altas locales y Google asignan `role: user`; el alta no asigna `companyId`. El flujo local retorna su token de sesión a quien se registra, como parte del contrato normal de autenticación. Esto satisface la existencia de un mecanismo normal para la identidad sintética, condicionado a que el owner controle la cuenta/mailbox; no crea por sí solo un fixture ligado al tenant/run, ni garantiza auditoría durable, device/flow o cleanup. No habilitar test-as ni crear una cuenta durante esta revisión.

Esta es revisión estática de código; no prueba el runtime desplegado ni justifica escrituras productivas.

Referencias de fuente verificadas: `services/web/src/pages/ManagementCompaniesPage.tsx`, `services/web/src/pages/ManagementUsersPage.tsx`, `services/api/src/main.ts`, `services/api/src/guards/crud-access.guard.ts`, `services/api/src/interceptors/audit.interceptor.ts`, `services/api/src/crud/crud.controller.ts`, `services/api/src/crud/crud-company.service.ts`, `services/api/src/auth-local/uat-test-profile.policy.ts` y `services/api/src/auth-local/uat-test-profiles.service.ts`.

## Resultado esperado

Permitir, mediante el flujo administrativo first-party normal y solo a un superadmin ya existente, crear y retirar fixtures de aceptación identificados por `runId`, sin abrir un seeder público ni habilitar test-as en producción. El run autorizado por [PIA-CMT-003C](PIA-CMT-003C-FIXTURES-SINTETICOS-PRODUCCION.md) queda limitado a:

- Dos tenants temporales y aislados, cada uno con un único usuario de rol `user` y un Browser device sintético.
- Un flow inerte sin PII ni destinos externos.
- Sin usuarios sintéticos admin/coordinator/superadmin; sin elevación; sin invitación/email; sin CRM, llamada, audio ni acceso a clientes.
- TTL máximo 24 horas, cleanup inmediato al terminar y retención únicamente de la auditoría mínima aprobada.

## Controles obligatorios antes de implementación

1. Actor extraído de la sesión normal y revalidado desde la BD como superadmin; nunca confiar en role/tenant de body, query o headers. Todas las rutas privadas responden denegación si no hay actor válido.
2. `runId` validado, único e idempotente. Creación, estado, expiración y cleanup de cada recurso están ligados al mismo run; no aceptar IDs arbitrarios que permitan borrar recursos ajenos.
3. Registrar auditoría durable y redacted antes o en la misma transacción que la mutación; si falla el registro durable, no confirmar create/cleanup. Conservar actor, runId, tipo/ID anonimizado, operación, TTL, resultado y timestamp. Excluir secretos, emails completos, tokens, body, URL privada y datos de cliente.
4. Cleanup reversible/reintentable e idempotente: invalidar login/device/flow primero; desactivar o aislar registros sintéticos por run; comprobar que login y comandos quedan denegados. No usar el delete genérico de empresa ni purgar evidencia append-only.
5. No crear password/token/secret de acceso a partir de una ruta de fixtures. El login usa el alta/inicio de sesión normal existente (email/password o Google) y una identidad sintética controlada por el owner; no se cambian settings del IdP ni se envían invitaciones. El alta puede crear solo `user`; la vinculación al tenant ocurre mediante una operación administrativa autorizada y auditada. Si no existe mailbox/cuenta sintética controlada por el owner, no se crea un usuario autenticable y el gate permanece BLOCKED.
6. No incluir job/cron/scheduler, endpoint sin autenticación, secret de seed persistente, escritura directa a PostgreSQL, test adapter en production o expansión del catálogo global.

## Aceptación productiva

Todas las pruebas funcionales/de seguridad se hacen en el sitio de producción una vez desplegado y únicamente con el fixture aprobado. No se ejecutan pruebas/builds/lint de aplicación localmente, por instrucción del owner.

| Caso | Resultado exigido |
|---|---|
| FIXTURE-CREATE-01 | Anónimo y rol `user` no pueden crear ni listar runs de fixtures; solo actor superadmin de BD puede hacerlo. |
| FIXTURE-CREATE-02 | Crear dos veces el mismo run no duplica tenants, users, devices ni flows. |
| FIXTURE-CREATE-03 | Ningún rol privilegiado, invitación/email, secreto persistente ni llamada externa se crea. |
| FIXTURE-AUDIT-01 | Cada mutación queda durablemente auditada con runId antes de confirmarse; una falla de auditoría rechaza la mutación. |
| FIXTURE-TTL-01 | Recursos vencidos dejan de autenticarse/ejecutar comandos; TTL nunca excede 24 horas. |
| FIXTURE-CLEANUP-01 | Cleanup del run solo invalida sus IDs, es reintentable y verifica login/comandos denegados; retiene auditoría. |
| FIXTURE-TENANT-01 | A no lee/modifica B; B no lee/modifica A; actor/tenant siempre vienen de registros server-side. |

La evidencia de UAT incluye SHA/deploy, timestamp UTC, runId no sensible, resultado redacted, estado de auditoría y lectura posterior de cleanup. No se incluyen sesiones, tokens, emails completos, URL/host privados, payloads o datos de clientes.

## Gate y siguiente paso

La ruta normal de login está confirmada en fuente; no se cambiaron settings ni se crearon cuentas. La PIA sigue lista para revisión de seguridad, pero aún no para implementación: afecta auth, autorización, modelo de datos y cleanup productivo. Antes de codificar, definir el vínculo seguro del usuario `user` al tenant/run sintético, la auditoría durable para cada mutación, el ciclo de device/flow y el cleanup reversible/idempotente. Si el owner no controla una identidad/mailbox sintética, mantener ese caso BLOCKED; no inventar un bypass. Tras revisión independiente, el cambio requiere PR con revisión real y UAT productiva. Hasta su aceptación, CMT-003C queda BLOCKED y no se aprovisiona nada.
