# Sub-PIA ADM-IF — asignación de interfaces por tenant

Estado: SOURCE IMPLEMENTED / PRODUCTION ACCEPTANCE PARTIAL · CMT-004 · Decisión del owner: 2026-10-17.

## Decisión y resultado esperado

El owner confirma el selector Web de interfaces para Admin/Coordinator con asignación limitada a su tenant. El catálogo visible y cada asignación deben pertenecer a la empresa resuelta para el actor en servidor. El navegador nunca aporta autoridad de tenant. Superadmin puede administrar el catálogo global/por empresa; los roles de empresa no pueden provisionar interfaces ni elevar privilegios.

## Contrato rastreable en `main` 5.2.4

| Requisito | Evidencia de fuente | Resultado revisado |
|---|---|---|
| Selector solo en edición de equipo y respuesta asíncrona obsoleta descartada | `services/web/src/pages/ManagementTeamsPage.tsx` (`openEditForm`, `saveTeamInterfaces`, `createRequestSequence`) | Implementado; no acepta prueba visual autenticada |
| Catálogo filtrado por compañía del actor, sin devolver credenciales | `services/api/src/crud/crud.controller.ts` (`getManagedInterfaces`); `services/api/src/crud/crud.service.ts` (`getManagedInterfaces`) | Implementado en API; Cloud conserva paridad; verificar con actores persistidos |
| Asignación consulta equipo e interfaces dentro de compañía y persiste atómicamente | `services/api/src/crud/crud.controller.ts` (`getTeamInterfaces`, `setTeamInterfaces`); `services/api/src/crud/crud.service.ts` (`setTeamInterfaces`) | Implementado; transacción y alcance por companyId |
| Guard rechaza cuerpos malformados y cualquier ID fuera de la compañía | `services/api/src/guards/crud-access.guard.ts`; su equivalente en `cloud/src/guards/crud-access.guard.ts` | Implementado en fuente; falta aceptación HTTP con sesiones sintéticas |
| Nuevos registros del catálogo se provisionan con dueño explícito | `ManagedInterface.companyId`, ruta superadmin y controles CRUD | Fuente tiene propiedad nullable y no backfill; filas antiguas sin dueño no se asignan implícitamente |

El cambio fue entregado en PR [#210](https://github.com/tuyoisaza/keledon/pull/210), merge `9c4c143abba911261f8c881cfc1b3c4e32c373a9`. El candidato fuente que introdujo el selector no equivale por sí solo a aceptación productiva autenticada.

## Casos de aceptación

| Caso | Resultado exigido | Estado/evidencia |
|---|---|---|
| ADM-IF-01 | Admin/Coordinator solo listan interfaces de su compañía en Web y API/Cloud | BLOCKED: falta sesión sintética autorizada en producción |
| ADM-IF-02 | El equipo y todas las interfaces asignadas pertenecen a la misma compañía; guardar y recargar conserva el conjunto | BLOCKED: requiere fixture sintético, login real de prueba y lectura persistida |
| ADM-IF-03 | Un `interfaceId` de otra compañía se deniega sin cambiar asignaciones existentes | Fuente revisada; producción autenticada BLOCKED |
| ADM-IF-04 | `user` no puede abrir/usar el selector ni invocar el endpoint de escritura | Fuente/guard revisados; producción autenticada BLOCKED |
| ADM-IF-05 | Interfaz histórica con `companyId = null` no se asigna ni se adopta automáticamente | Fuente filtra por compañía; dueño de filas históricas no inferido |
| ADM-IF-06 | Respuesta y auditoría no exponen credenciales; una sustitución no devuelve el secreto | Relacionado con ADM-CAT/secretos; falta aceptación persistida y clave de cifrado autorizada |
| ADM-IF-07 | Navegación anónima a `/management/teams` termina en login sin mostrar datos del tenant | PASS limitado en producción 5.2.4; evidencia `50-uat/evidence/uat-121-production-anonymous-team-selector-2026-10-17.json` |

## Límites, seguridad y salida

- La aceptación ejecutada usa solamente navegador anónimo y una ruta protegida. No se envió login, OAuth, alta, mutación ni petición de datos.
- No crear cuentas elevadas, cambiar empresas ni escribir registros productivos para fabricar evidencia. Para cerrar ADM-IF-01..06 se necesita una identidad sintética preautorizada de tenant/rol, su sesión por el flujo real, dataset sintético y plan de limpieza aprobado por el owner.
- No asignar ownership a filas `ManagedInterface` históricas con `companyId` nulo sin decisión y fuente del owner. La UI superadmin de provisión y el inventario de filas quedan como dependencias de ADM-CAT.
- CMT-004 permanece ACTIVE / PARTIAL. La salida requiere los casos autenticados, persistencia después de recarga/reinicio cuando aplique, denegación cross-tenant y cleanup verificado en producción.
