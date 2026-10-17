# Paquete de Implementación y Aceptación (PIA) — KELEDON 5.2.1

Este PIA reúne el alcance implementado y la evidencia necesaria para continuar la meta PHDK Auto. Es un índice de ejecución; las arquitecturas, el plan y los contratos PHDK canónicos siguen siendo la autoridad.

## Objetivo y decisiones vigentes

Continuar la estandarización de KELEDON con PHDK y avanzar, en este orden, los cuatro frentes confirmados: (1) baseline/versiones/PR; (2) widget y diagnóstico seguro; (3) voz→Cloud→Browser→CRM según configuración de cada cliente; (4) administración y permisos. Se mantienen las decisiones aprobadas: usuarios nuevos con rol mínimo, elevación administrada por superadmin existente, aislamiento por tenant, credenciales nunca devueltas en respuestas ordinarias, y destinos privados de CRM permitidos solo con validación y allowlist por tenant. Admin/Coordinator reciben asignaciones Web de interfaces limitadas a sus equipos y tenant.

## Candidato y estado

- Repositorio: `tuyoisaza/keledon`.
- Rama: `feature/tenant-interface-selector-5.2.0`.
- Candidato de producto: 5.2.1; commit de código revisado: `ef6fe6dbf7eca04708c7200615e7538812751f7e`. Ver el handoff de entrega para el head actual del PR, que también incluye evidencia y documentación PHDK.
- Base `main` registrada: `6ae4e0a07fa6b0683ad3d32878a00feb6a88dc50`.
- PHDK actualizado: 2.53.1 desde upstream `94f583635d295ae0f227726718904d952cadb8ab`; coherencia estática 64/64.
- Fuentes relevantes: `services/web/src/pages/ManagementTeamsPage.tsx`, `services/web/src/lib/request-sequence.ts`, guards y servicios API/Cloud de asignación tenant/equipo, y la regresión `services/web/test/team-interface-request-sequence.test.cjs`.
- El selector y la protección contra respuestas asíncronas obsoletas están en la rama. La preparación de fixtures rechaza targets productivos. PR [#210](https://github.com/tuyoisaza/keledon/pull/210) está abierto, no fusionado; producción continúa en v5.1.85.

## Mapa de implementación a aceptación

| Necesidad | Implementación/evidencia disponible | Aceptación pendiente |
|---|---|---|
| Admin/Coordinator eligen interfaces de su tenant/equipo | Selector de equipo, filtro de catálogo, asociación protegida por servidor y corrección de cargas/guardados obsoletos; fuente versionada en la rama | Sesión real por rol, lectura/escritura persistida, negativas cross-tenant y UI del candidato exacto |
| Interfaces existentes y provisión tenant | La migración agrega `ManagedInterface.companyId` nullable, FK e índice; la API y Cloud filtran por empresa y omiten valores de credenciales | No hay backfill: las filas previas quedan sin empresa y no salen en el selector. Confirmar el origen/provisión de cada interfaz tenant y mapear filas antiguas solo con ownership verificado antes de aceptar el flujo |
| Las respuestas viejas no pisan el equipo seleccionado | Regresión de secuencia HTTP enfocada; Web typecheck/lint/build reportados PASS | Repetir con usuario/tenant reales únicamente en target aislado y candidato 5.2.1 |
| Provisionamiento de identidades sintéticas | Seeder idempotente, validación de host/db y rechazo de producción; artefactos de fixture ya existen | Ejecución con PostgreSQL dedicado de UAT, login normal por rol, Test-as y cleanup |
| Prueba en el sitio solicitado | UAT-098 cargó la página pública; UAT-099 redirigió `/management/teams` sin sesión; UAT-100 observó el widget anónimo en portada y login. Solo lectura; versión observada 5.1.85 | Producción no sirve el candidato 5.2.1; por ello no prueba ni acepta el selector de la rama ni sus roles por tenant |

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
- Check de candidato: `docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/70-check/PHDK_CHECK_REPORT-5.2.1.md`.
- Arquitectura/console PHDK actualizada: `ADMIN_ARCHITECTURE.md`, `ADMIN_CAPABILITY_MATRIX.md`, `ADMIN_SETTINGS_REGISTRY.md`; catálogo AI: `AI_WORKFLOW_CATALOG.md`. Son baseline fuente con gaps explícitos, no aceptación runtime.
- Gaps del Check PHDK 2.53.1: ADM-001…006 en `docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/70-check/PHDK_CHECK_REPORT-5.2.1-PHDK-2.53.1.md`; varios requieren diseño de secretos o respaldo/recuperación antes de cambiar datos/configuración.
- Hallazgo de seguridad CMT-004: `ManagedInterface.credentials` se proyecta fuera de respuestas ordinarias, pero los métodos de alta/edición pasan el campo directamente a Prisma. La protección en reposo no está establecida; resolver con un límite de secreto aprobado y validación segura antes de aceptar la configuración.
