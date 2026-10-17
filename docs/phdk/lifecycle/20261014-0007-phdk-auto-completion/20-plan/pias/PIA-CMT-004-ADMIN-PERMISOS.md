# PIA CMT-004 — administración y permisos por tenant

Estado: ACTIVE / PARTIAL · Prioridad: 4 · Decisión de tenancy: multi-tenant aprobada.

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

## Prioridad inmediata

Cerrar el origen/provisión tenant del catálogo es prerequisito de aceptación del selector 5.2.1: el código añade `companyId` nullable sin backfill, y no se halló UI superadmin de provisión. No inferir propietario de interfaces históricas ni migrar su ownership automáticamente. El inventario de variables de Railway no encontró el nombre `KELEDON_VENDOR_KEY`; no leer valores ni introducir una clave en evidencia. El owner debe configurar el secreto por canal autorizado. Luego usar una interfaz sintética sin endpoint de cliente.

## Aceptación productiva

1. Usar instancia/tenant/personas sintéticos expresamente autorizados y plan de borrado; confirmar SHA 5.2.1 o candidato posterior desplegado.
2. Verificar alta nueva con rol user, elevación solo por superadmin existente, tenant/compañía desde BD y denegación de ID/header de tenant manipulado.
3. Confirmar que user no administra; coordinator/admin solo ven y asignan equipos/interfaces de su empresa; no pueden elevar ni borrar empresas; superadmin puede provisionar catálogo aislado.
4. Confirmar DB persistence tras logout/login, filtros cross-tenant y comportamiento después de restart/migración. Secretos reemplazados no vuelven en respuestas, logs, auditoría ni captura normal; solo `hasCredentials`/configured.
5. Ejecutar cleanup del fixture y verificar que no hay residual. No realizar rollback/cambios de datos reales.

## Estado/exit gate

El código del selector, guards y cifrado se merged; UAT-104 solo prueba rechazo anónimo. La clave y UI del catálogo, ownership de filas anteriores, persistencia autenticada y ciclo de cuenta siguen sin aceptar. ADM-004/ADM-UAT están BLOCKED hasta las dependencias; ADM-IDENT/RBAC/RECOVERY/AI requieren implementación trazada y no se cierran con estas especificaciones. Mantener CMT-004 PARTIAL.
