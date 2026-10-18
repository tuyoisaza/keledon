# PIA CMT-004 — administración y permisos por tenant

## Revalidación Auto — KELEDON 5.2.19 / 2026-10-18

UAT-158 en producción confirma solo que el GET anónimo de `/api/crud/interfaces` devuelve 401 sin filas. Revisión de source existente sigue apoyando tenant scope/write-only; roles autenticados, persistencia, secret replacement/audit y cross-tenant deny no están aceptados. No se introdujo cambio funcional en PR #271. CMT-004 permanece ACTIVE/PARTIAL. Evidencia `50-uat/evidence/uat-158-production-anonymous-interface-api-denial-2026-10-18.json`.

## Historical source revalidation — catalog, 2026-10-18

El candidato 5.2.15 añade la pantalla `/admin/interfaces` únicamente para `superadmin`, enlazada desde Configuración. La lista superadmin expone empresa propietaria, nombre, URL, categoría, estado y solo `hasCredentials`; proyecciones de lista/detalle/asignación usadas por tenant omiten la URL privada. Alta exige compañía existente y URL HTTP(S) normalizada. La edición no permite cambiar ownership; los registros históricos sin `companyId` quedan sin asignación implícita. La API limita los campos aceptados, valida formato y longitud también fuera del navegador, cifra reemplazos con `KELEDON_VENDOR_KEY` y nunca devuelve el valor. El interceptor de auditoría ahora redacta URL/baseUrl, orígenes permitidos, hostname, host, CIDR, IP y campos secretos. La pantalla no realiza conexiones de prueba. No se ejecutaron tests/build/lint locales ni mutaciones productivas. El código fuente y sus contratos no se han aceptado aún en la versión desplegada.

Estado ADM-CAT: **SOURCE IMPLEMENTED / PRODUCTION ACCEPTANCE PENDING**. Falta confirmar en producción roles, persistencia, sustitución write-only de secretos y auditoría; el owner debe provisionar `KELEDON_VENDOR_KEY` por su canal autorizado antes de guardar secretos. La sesión admin sintética solicitada sigue ausente. CMT-004 permanece ACTIVE / PARTIAL.

Estado: ACTIVE / PARTIAL · Prioridad: 4 · Baseline productivo KELEDON 5.2.10 en main `fd429298a85bdcf3b5c20791f9b1598c132aabcb`, Railway Web/API SUCCESS; los PR #253–255 no cambiaron RBAC, modelo de datos ni flujos administrativos. Decisiones confirmadas: cuenta nueva=user; solo superadmin existente eleva roles/asigna empresas; admin/coordinator quedan confinados a su empresa; actor/tenant se derivan de BD; secretos son write-only. Decisión de tenancy: multi-tenant aprobada.

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
