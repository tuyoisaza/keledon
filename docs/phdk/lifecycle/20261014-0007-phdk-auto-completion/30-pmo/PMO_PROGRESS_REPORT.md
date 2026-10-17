# PHDK Auto — informe de progreso, 2026-10-17

Baseline: PHDK **2.53.1**, KELEDON **5.2.4**, remote `main` `6715ea986bf9058b8f7d50edae1efe2ed4f65b81`. Coherencia estática PHDK: **64/64**. Estado: **PARCIALMENTE ENTREGADO** (CMT-001 completo para el corte, otros tres activos/parciales).

| Frente | Hecho comprobado | Lo que falta |
|---|---|---|
| CMT-001 — baseline/versiones/PR | PR #232 actualiza cinco raíces package/lock y Browser renderer a 5.2.4; merge verificado. Railway Web/API `SUCCESS` para el mismo SHA. | Repetir baseline y despliegue en cada cambio; deploy no acepta comportamiento API. |
| CMT-002 — widget/diagnóstico | UAT-112–120 en producción. UAT-120 confirma `lang` de ES/EN/PT en login; UAT-117 confirma estado de copia/omisión de hostname en fuente; UAT-118 mide targets 44×44. | Completar matriz locale/tema/viewport/rutas, foco/contraste, lector de pantalla, fallo de copia, diagnóstico protegido/RBAC y audio/dispositivo. |
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
- UAT-120: `50-uat/evidence/uat-120-production-locale-lang-2026-10-17.json`.
- PIAs: CMT-002, CMT-003/003A/003B y CMT-004 en `20-plan/pias/`.
- Web Railway `228369da-23e8-49e0-8345-2469f9fd4863` y API Railway `367eb4ae-a101-448a-ac0a-361e7efee620` ambos `SUCCESS` para main `6715ea9`. Deployment `SUCCESS` no equivale a aceptación API funcional; ningún test API se ejecutó en producción.
- Sin pruebas/builds locales de aplicación. Solo JSON parse/version alignment, `git diff --check` y PHDK static 64/64. Sin credenciales, clientes, CRM, llamadas o cambios de caché.

SIGUIENTE PASO: continuar CMT-002 con cobertura pública de foco/lector de pantalla; mantener UAT autenticado/audio tras el gate de fixtures y preparar aceptación API solo con fixtures sintéticos autorizados.
