# PHDK Auto — informe de progreso, 2026-10-17

Baseline: PHDK **2.53.1**, KELEDON **5.2.3**, remote `main` `3cccb4b2f88828fa5d273b682925d3a106dd3b9`. Coherencia estática PHDK: **64/64**. Estado: **PARCIALMENTE ENTREGADO** (CMT-001 completo para el corte, otros tres activos/parciales).

| Frente | Hecho comprobado | Lo que falta |
|---|---|---|
| CMT-001 — baseline/versiones/PR | PR #229 actualiza producto y cinco raíces package/lock más Browser renderer a 5.2.3; merge verificado. | Repetir baseline, versiones, PR y despliegue en cada cambio. |
| CMT-002 — widget/diagnóstico | UAT-112–117 en producción. UAT-117 observó estado accesible de copia en Web 5.2.3; la fuente omitió hostnames de API/OAuth. UAT-112–116 aportan muestras específicas, no aceptación WCAG integral. | Mapa completo de locale/tema/viewport/rutas, contraste integral, lector de pantalla, fallo de copia, diagnóstico protegido/RBAC y audio/dispositivo autorizado. |
| CMT-003 — runtime por tenant | Se documentaron claims sin lease/idempotencia y riesgo DNS/CIDR; PIAs CMT-003A/B listas. | Implementación no iniciada; probar luego en producción con tenant/dispositivo sintéticos. CRM real espera sandbox elegido por el cliente. |
| CMT-004 — administración/permisos | Política de roles mínimos, actor/tenant desde BD, claves write-only y selector acotado al tenant. | UAT persistente autenticado, propiedad de catálogo, provisioning de owner, revocación y limpieza de fixtures sintéticos. |

## Verificación del corte

- UAT-112: `50-uat/evidence/uat-112-production-cta-theme-contrast-2026-10-17.json`.
- UAT-113: `50-uat/evidence/uat-113-production-login-public-accessibility-2026-10-17.json`.
- UAT-114: `50-uat/evidence/uat-114-production-landing-demo-disclosure-2026-10-17.json`.
- UAT-115: `50-uat/evidence/uat-115-production-responsive-layout-2026-10-17.json`.
- UAT-116: `50-uat/evidence/uat-116-production-spanish-corporate-mobile-2026-10-17.json`.
- UAT-117: `50-uat/evidence/uat-117-production-copy-status-2026-10-17.json`.
- PIAs: CMT-002, CMT-003/003A/003B y CMT-004 en `20-plan/pias/`.
- Web Railway `3e168f0c-50b9-4ebb-b3c1-0cd5bd81b2a7` `SUCCESS` sobre `3cccb4b`. API Railway `6467f5d6-d99b-41ed-9af8-2f3176d505b7` seguía `BUILDING` al último readback; el siguiente paso verifica settlement.
- Sin pruebas/builds locales de aplicación. Solo JSON parse/version alignment, `git diff --check` y PHDK static 64/64. Sin credenciales, clientes, CRM, llamadas o cambios de caché.

SIGUIENTE PASO: volver a leer Railway API; continuar CMT-002 con el siguiente caso público de solo lectura, y mantener UAT autenticado/audio tras el gate de fixtures.
