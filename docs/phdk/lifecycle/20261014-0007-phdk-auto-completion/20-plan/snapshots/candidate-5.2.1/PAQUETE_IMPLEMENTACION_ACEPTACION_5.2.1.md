# Paquete de Implementación y Aceptación (PIA) — KELEDON 5.2.1

Este PIA reúne el alcance implementado y la evidencia necesaria para continuar la meta PHDK Auto. Es un índice de ejecución; las arquitecturas, el plan y los contratos PHDK canónicos siguen siendo la autoridad.

## Objetivo y decisiones vigentes

Continuar la estandarización de KELEDON con PHDK y avanzar, en este orden, los cuatro frentes confirmados: (1) baseline/versiones/PR; (2) widget y diagnóstico seguro; (3) voz→Cloud→Browser→CRM según configuración de cada cliente; (4) administración y permisos. Se mantienen las decisiones aprobadas: usuarios nuevos con rol mínimo, elevación administrada por superadmin existente, aislamiento por tenant, credenciales nunca devueltas en respuestas ordinarias, y destinos privados de CRM permitidos solo con validación y allowlist por tenant. Admin/Coordinator reciben asignaciones Web de interfaces limitadas a sus equipos y tenant.

## Candidato y estado

- Repositorio: `tuyoisaza/keledon`.
- Rama: `feature/tenant-interface-selector-5.2.0`.
- Candidato de producto: 5.2.1; selector base `ef6fe6dbf7eca04708c7200615e7538812751f7e`; cifrado de credenciales y redacción de auditoría añadidos hasta `fd7af3b963505fd7756c78ecfa7d8469096a9d84`; head actual del PR `58ffb1a9c20dd593ae2fd9b5aaabbd3e9a951c01` también incluye evidencia y documentación PHDK.
- Base `main` registrada: `6ae4e0a07fa6b0683ad3d32878a00feb6a88dc50`.
- PHDK actualizado: 2.53.1 desde upstream `94f583635d295ae0f227726718904d952cadb8ab`; coherencia estática 64/64.
- Tras la reparación de credenciales: `npm run build:typescript` y lint sobre los archivos API/Cloud modificados pasan; no se ejecutaron tests de aplicación locales.
- Fuentes relevantes: `services/web/src/pages/ManagementTeamsPage.tsx`, `services/web/src/lib/request-sequence.ts`, guards y servicios API/Cloud de asignación tenant/equipo, y la regresión `services/web/test/team-interface-request-sequence.test.cjs`.
- El selector y la protección contra respuestas asíncronas obsoletas están en la rama. La preparación de fixtures rechaza targets productivos. PR [#210](https://github.com/tuyoisaza/keledon/pull/210) está abierto, no fusionado; producción continúa en v5.1.85.

## Hallazgos PHDK 2.53.1 que condicionan la continuación

La auditoría del 17-oct-2026 dejó el Check **PARTIAL — REMEDIATION REQUIRED**. El rastreo no encontró consumidor de `ManagedInterface.credentials` en el repositorio. En esta continuación, API y Cloud cifran nuevas altas/reemplazos con AES-256-GCM y una etiqueta/dominio de clave `ManagedInterface`; las respuestas solo exponen `hasCredentials`. Se exige `KELEDON_VENDOR_KEY` de al menos 32 caracteres y se falla de forma cerrada si falta. Las filas históricas no se convierten automáticamente: primero hay que validar el formato y acordar conversión, recuperación y rotación sin leer ni mostrar la clave ni volcar plaintext. La fuente corregida aún requiere aceptación del candidato exacto y verificación operativa de la clave.

| Prioridad | PIA / salida verificable | Condición de aceptación |
|---|---|---|
| P0 / ADM-004 | **Fuente corregida** en API/Cloud: AES-256-GCM para nuevas altas/reemplazos, dominio de clave ManagedInterface, respuesta con `hasCredentials`; no se encontró lector runtime interno | En el sitio de producción solo después de que el candidato esté desplegado: comprobar disponibilidad de configuración `KELEDON_VENDOR_KEY` sin revelar el valor; crear/reemplazar y limpiar solo con fixture/credencial sintética; verificar persistencia cifrada sin exponer plaintext, paridad API/Cloud y ninguna respuesta/log con el secreto. Diseñar por separado el tratamiento de filas históricas y rotación/recuperación; no convertirlas en bloque sin plan validado. |
| P1 / ADM-002/003 | Completar modelo de ciclo de vida de cuentas/sesiones y editor o contrato de permisos protegido por el servidor | Verificar invitación/expiración, desactivación y revocación persistida; conservar rol mínimo para altas y elevación solo por superadmin existente; casos positivos/negativos de tenant. |
| P1 / ADM-005 | Identificar respaldo/restauración real del PostgreSQL gestionado, propietario operativo, retención, aislamiento y recuperación | Evidencia del proveedor/operador y restore de prueba autorizado en destino aislado. La clase JSON sobre `Map` no cuenta como respaldo PostgreSQL. |
| P2 / ADM-001/006 | Cerrar mapa de consola y grafo AI desde rutas/callsites reales, sin inventar transiciones | Matriz por rol con estados vacíos/error/guardado; trazas/replay sintéticos y límites de ciclo/terminación evidenciados. |

Este plan no cambia el alcance confirmado ni habilita acceso a datos/secretos de producción. El Check activo contiene el detalle ADM-001…006. La evidencia UAT-100 solo confirma presencia anónima del widget en producción v5.1.85; no acepta el candidato.

## Mapa de implementación a aceptación

| Necesidad | Implementación/evidencia disponible | Aceptación pendiente |
|---|---|---|
| Admin/Coordinator eligen interfaces de su tenant/equipo | Selector de equipo, filtro de catálogo, asociación protegida por servidor y corrección de cargas/guardados obsoletos; fuente versionada en la rama | Sesión real por rol, lectura/escritura persistida, negativas cross-tenant y UI del candidato exacto |
| Interfaces existentes y provisión tenant | La migración agrega `ManagedInterface.companyId` nullable, FK e índice; la API y Cloud filtran por empresa y omiten valores de credenciales | No hay backfill: las filas previas quedan sin empresa y no salen en el selector. Confirmar el origen/provisión de cada interfaz tenant y mapear filas antiguas solo con ownership verificado antes de aceptar el flujo |
| Las respuestas viejas no pisan el equipo seleccionado | Regresión de secuencia HTTP enfocada; Web typecheck/lint/build reportados PASS | Repetir con usuario/tenant reales únicamente en target aislado y candidato 5.2.1 |
| Provisionamiento de identidades sintéticas | Seeder idempotente, validación de host/db y rechazo de producción; artefactos de fixture ya existen | Ejecución con PostgreSQL dedicado de UAT, login normal por rol, Test-as y cleanup |
| Prueba en el sitio solicitado | UAT-098 cargó la página pública; UAT-099 redirigió `/management/teams` sin sesión a `/login`. Ambos muestran versión 5.1.85 y son de solo lectura | Producción no sirve el candidato 5.2.1; por ello no prueba ni acepta el selector de la rama ni sus roles por tenant |
| Presencia del widget en home/login | UAT-100 inspeccionó los árboles de accesibilidad anónimos de `/` y `/login`: versión y dos acciones de diagnóstico visibles en 5.1.85 | No se activaron acciones; no verifica su funcionamiento, permisos de diagnóstico ni la rama candidata |

## Orden ejecutable

1. Mantener Preflight y este Plan revalidados contra PHDK 2.53.1.
2. Cerrar Integration Review para la revisión exacta `ef6fe6d` y enlazar reportes ya existentes.
3. Completar UAT Prep solo en PostgreSQL dedicado aislado. No reutilizar la BD de Railway/producción.
4. Ejecutar UAT web/API con roles sintéticos y evidencias de permiso, persistencia, denegación cross-tenant, estados vacíos/error y accesibilidad.
5. Reparar hallazgos; después cerrar SEO/AEO-GEO aplicable, Check y remediación.
6. Versionar/publicar mediante PR y verificar revisión, merge, `main` y despliegue real; no declarar completa la meta mientras las cuatro líneas y gates obligatorios sigan abiertos.

## Condiciones de seguridad y bloqueo

En producción solo se realizaron comprobaciones anónimas de lectura: portada y redirección de la ruta de administración a login, ambas en v5.1.85. No se inició sesión, no se enviaron solicitudes API manuales ni se tocaron datos. La rama candidata es 5.2.1. El candidato no está desplegado, y la migración añade una columna de ownership sin backfill. Antes de asignar roles o probar persistencia, verificar el provisionamiento y el ownership de las interfaces en un destino seguro con el candidato exacto; no inferir propiedad de filas antiguas. Este paquete enlaza los artefactos canónicos de PHDK y deja trazabilidad para continuar.

## Artefactos canónicos

- Plan y arquitectura: `docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/20-plan/`.
- Preparación/auth/fixtures: `UAT_AUTH_PLAN.md`, `UAT_ROLE_MATRIX.md`, `UAT_FIXTURE_MANIFEST.md`, `UAT_PREP_REPORT.md`.
- Casos/evidencia: `UAT_STORIES.md`, `UAT_JOURNEY_MAP.md`, `UAT_CASES.md`, `UAT_ACCESS_REPORT.md`, `UAT_REPORT.md`, `UX_UI_AUDIT_REPORT.md`.
- Check de candidato vigente: `docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/70-check/PHDK_CHECK_REPORT-5.2.1-PHDK-2.53.1.md` (ADM-001…006 y límites de evidencia).
- Evidencia UAT-100 y reingreso de solo lectura: `docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/50-uat/evidence/uat-100-production-anonymous-widget-5.1.85.json` y `50-uat/snapshots/production-widget-20261017/HANDOFF.md`.
- Readiness UAT-102: `docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/50-uat/evidence/uat-102-production-release-readiness-2026-10-17.json`; production still serves 5.1.85.
- Estado de continuación: **PARTIAL**. Siguiente paso técnico: revisar el diff de cifrado API/Cloud y preparar su aceptación de producción para el candidato exacto; después continuar ADM-002/003. Sin aceptación del sitio, no marcar ADM-004 como cerrado.
