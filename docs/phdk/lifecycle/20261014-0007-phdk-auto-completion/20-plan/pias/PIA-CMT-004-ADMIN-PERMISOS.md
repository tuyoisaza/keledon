# PIA CMT-004 — administración y permisos por tenant

Estado: ACTIVE / PARTIAL · Prioridad: 4 · Baseline KELEDON 5.2.7 en main `a7ca8689265642e6fe1f2f69aa4fa2c90b81867b`, Railway Web/API SUCCESS; PR #247 no cambió RBAC, modelo de datos ni flujos administrativos. Decisión de tenancy: multi-tenant aprobada.

## Política autorizada

Altas email/Google reciben `user`; solo un superadmin existente eleva roles o asigna compañía; admin/coordinator actúan dentro de su compañía, no elevan roles ni eliminan compañías; actor y tenant se resuelven desde la base de datos; las respuestas normales jamás devuelven claves. Interfaces privadas solo se asignan desde catálogo del tenant; para CRM privado se usa allowlist validada por tenant.

## Paquetes implementables

| Sub-PIA | Resultado | Dependencias |
|---|---|---|
| ADM-CAT | CRUD web protegido para que superadmin provisione/edite catálogo por empresa; auditar cambios sin cuerpo de secretos | Confirmar modelo/origen de catálogo y contrato de credenciales; `KELEDON_VENDOR_KEY` provisionada por su owner |
| ADM-IDENT | Invitación, expiración, desactivación, revocación de sesiones y anonimización con rol mínimo e historial | Mapear proveedor de identidad y sesión persistida; fixture de UAT sintético |
| ADM-RBAC | Editor/matriz de permisos con roles protegidos; permisos efectivos validados por API y Cloud | Catálogo de recursos/acciones real y decisión de política por recurso |
| ADM-RECOVERY | Propietario, política, retención y recuperación de PostgreSQL; restore de prueba en destino aislado | Evidencia del proveedor/operador y autorización para restore aislado |
| ADM-AI | Grafo de agentes/acciones y permisos a partir de callsites reales, con límites de ciclo/terminación | Trazado source completo y fixtures sintéticos |
| ADM-UAT | Probar selector y CRUD con user/coordinator/admin/superadmin sintéticos; cross-tenant deny y cleanup | Tenant/roles sintéticos autorizados, versión exacta desplegada, plan de limpieza |
| [ADM-IF](PIA-CMT-004A-ASIGNACION-INTERFACES-POR-TENANT.md) | Selector Web y asignación de interfaces por empresa, con denegación cross-tenant | Decisión aprobada; falta sesión sintética autorizada en producción |

## Prioridad inmediata

El owner aprobó el selector de Admin/Coordinator con asignación por tenant el 2026-10-17. La PIA ADM-IF registra alcance, controles fuente y aceptación productiva pendiente. En producción solo se comprobó la redirección anónima a login; no se infiere aceptación autenticada.

La PIA ADM-IF separa el selector de equipo, ya implementado, de la provisión del catálogo y de la aceptación persistida. El esquema deja companyId nullable y no backfillea filas históricas; no inferir dueño. No se encontró UI Web de provisión superadmin. El inventario histórico de Railway no encontró el nombre KELEDON_VENDOR_KEY; no leer valores ni incluir claves en evidencia. Su owner debe provisionarla por canal autorizado antes de acceptance de secretos.

## Aceptación productiva

1. Usar instancia/tenant/personas sintéticos expresamente autorizados y plan de borrado; confirmar SHA 5.2.1 o candidato posterior desplegado.
2. Verificar alta nueva con rol user, elevación solo por superadmin existente, tenant/compañía desde BD y denegación de ID/header de tenant manipulado.
3. Confirmar que user no administra; coordinator/admin solo ven y asignan equipos/interfaces de su empresa; no pueden elevar ni borrar empresas; superadmin puede provisionar catálogo aislado.
4. Confirmar DB persistence tras logout/login, filtros cross-tenant y comportamiento después de restart/migración. Secretos reemplazados no vuelven en respuestas, logs, auditoría ni captura normal; solo `hasCredentials`/configured.
5. Ejecutar cleanup del fixture y verificar que no hay residual. No realizar rollback/cambios de datos reales.

## Estado/exit gate

El selector por tenant, guards, cifrado y redacción de secretos se fusionaron en PR #210. UAT-104 prueba disponibilidad/denegación anónima del catálogo y UAT-121 prueba la redirección anónima del selector en Web v5.2.4; ambos tienen alcance limitado. El comportamiento por rol, persistencia autenticada, UI Web de provisión, ownership de filas antiguas y ciclo de cuenta siguen sin aceptación. ADM-IF-01..06 y ADM-UAT están BLOCKED por falta de fixtures productivos autorizados; ADM-IDENT/RBAC/RECOVERY/AI requieren implementación y evidencia trazadas. Mantener CMT-004 ACTIVE / PARTIAL.
