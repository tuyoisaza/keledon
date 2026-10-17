# PIA CMT-001 — baseline, versiones y entrega

Estado: ACTIVE / PARTIAL · Prioridad: 1 · Owner: mantenimiento KELEDON/PHDK.

## Resultado esperado

Conservar una base reproducible entre paquetes del producto, el renderer y los estándares PHDK, y enlazar cada cambio aprobado con su PR, SHA de `main`, despliegue y aceptación correspondiente. La versión 5.2.1 y el merge de producto `9c4c143abba911261f8c881cfc1b3c4e32c373a9` están confirmados; Railway reportó API/Web exitosos y UAT-104 comprobó disponibilidad pública. Esto no cierra el portfolio ni crea evidencia de pruebas funcionales.

## Trabajo

1. En cada cambio de producto, revisar los package/lock roots de API, Cloud, Web, Landing y Browser renderer; mantenerlos alineados en la versión propuesta. No hacer un version bump solo por ejecutar el PIA.
2. Antes de PR: comprobar diff y manifiesto PHDK. Los checks estáticos documentales no se presentarán como test de aplicación. No ejecutar localmente suites, builds de app ni crear fixture local.
3. Usar una rama/PR limpia por cambio, enlazar el PIA y las decisiones tenant existentes, y preservar el target configurado de autodeploy de Railway. No cambiar configuración de GitHub/Railway desde este paquete.
4. Tras merge, leer `main` desde remoto, comparar SHA/tree/versions, identificar despliegues API/Web del SHA y visitar las rutas productivas necesarias. Documentar si el provider no atribuye el SHA o si checks de hosting no existen.

## Aceptación

- Los cinco roots/renderer del candidato concuerdan y las reglas PHDK instaladas pasan coherencia estática.
- PR mergeado; `git ls-remote origin refs/heads/main` coincide con readback; evidencia identifica SHA, tree, versión y deployments sin declararlos equivalentes a aceptación funcional.
- Los fallos P0/P1 o diferencias de versión se reparan con un PR posterior; no se proclama completa la meta mientras otros CMT estén abiertos.

## Evidencia / límites

UAT-104 (`50-uat/evidence/uat-104-production-candidate-smoke-2026-10-17.json`) registra Web, bundle y `/health` 200 en 5.2.1 y 401 sin autenticación para el catálogo. La consulta Railway es de solo lectura. No hay hosted checks ni protección/rulesets de `main` según el readback incluido en `70-check/PHDK_CHECK_REPORT-5.2.1-PHDK-2.53.1.md`.
