# PHDK Auto — informe de progreso, 2026-10-17

Baseline: PHDK **2.53.1**, KELEDON **5.2.3**, remote `main` `3cccb4b2f88828fa5d273b682925d3a106dd3b9`. Coherencia estática PHDK: **64/64**. Estado: **PARCIALMENTE ENTREGADO** (CMT-001 completo para el corte, otros tres activos/parciales).

| Frente | Hecho comprobado | Lo que falta |
|---|---|---|
| CMT-001 — baseline/versiones/PR | PR #229 actualiza producto y cinco raíces package/lock más Browser renderer a 5.2.3; merge verificado. | Repetir baseline, versiones, PR y despliegue en cada cambio. |
| CMT-002 — widget/diagnóstico | UAT-112–119 en producción. UAT-119 confirma orden público de teclado en login, pero detecta `lang=en` mientras el contenido está en portugués; UAT-117 confirma estado de copia/omisión de hostname en fuente; UAT-118 mide targets 44×44. | Corregir metadatos `lang`; completar matriz locale/tema/viewport/rutas, foco/contraste, lector de pantalla, fallo de copia, diagnóstico protegido/RBAC y audio/dispositivo. |
| CMT-003 — runtime por tenant | Se documentaron claims sin lease/idempotencia y riesgo DNS/CIDR; PIAs CMT-003A/B listas. | Implementación no iniciada; probar luego en producción con tenant/dispositivo sintéticos. CRM real espera sandbox elegido por el cliente. |
| CMT-004 — administración/permisos | Política de roles mínimos, actor/tenant desde BD, claves write-only y selector acotado al tenant. | UAT persistente autenticado, propiedad de catálogo, provisioning de owner, revocación y limpieza de fixtures sintéticos. |

## Verificación del corte

- UAT-112: `50-uat/evidence/uat-112-production-cta-theme-contrast-2026-10-17.json`.
- UAT-113: `50-uat/evidence/uat-113-production-login-public-accessibility-2026-10-17.json`.
- UAT-114: `50-uat/evidence/uat-114-production-landing-demo-disclosure-2026-10-17.json`.
- UAT-115: `50-uat/evidence/uat-115-production-responsive-layout-2026-10-17.json`.
- UAT-116: `50-uat/evidence/uat-116-production-spanish-corporate-mobile-2026-10-17.json`.
- UAT-117: `50-uat/evidence/uat-117-production-copy-status-2026-10-17.json`.
- UAT-118: `50-uat/evidence/uat-118-production-diagnostics-keyboard-2026-10-17.json`.
- UAT-119: `50-uat/evidence/uat-119-production-login-keyboard-2026-10-17.json`.
- PIAs: CMT-002, CMT-003/003A/003B y CMT-004 en `20-plan/pias/`.
- Web Railway `51d32a43-e3ea-4961-a4ea-b5ac8fd68621` y API Railway `567027ff-9d5f-411f-b073-3b6eed4eeb2f` ambos `SUCCESS` sobre `85d7923`. Deployment `SUCCESS` no equivale a aceptación API funcional; ningún test API se ejecutó en producción.
- Sin pruebas/builds locales de aplicación. Solo JSON parse/version alignment, `git diff --check` y PHDK static 64/64. Sin credenciales, clientes, CRM, llamadas o cambios de caché.

SIGUIENTE PASO: corregir `lang` en login y verificar el arreglo en producción; continuar CMT-002 con otra muestra pública segura, y mantener UAT autenticado/audio tras el gate de fixtures.
