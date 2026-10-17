# PHDK Auto — informe de progreso, 2026-10-17

Baseline: PHDK **2.53.1**, KELEDON **5.2.4**, remote `main` `26e1fe1452cffb97164d65917b3c9a4308bdbdc2`. Coherencia estática PHDK: **64/64**. Estado: **PARCIALMENTE ENTREGADO** (CMT-001 completo para el corte, otros tres activos/parciales).

| Frente | Hecho comprobado | Lo que falta |
|---|---|---|
| CMT-001 — baseline/versiones/PR | PR #232 actualiza cinco raíces package/lock y Browser renderer a 5.2.4; PR #233 registra la aceptación locale y está fusionado. Railway Web/API `SUCCESS` para main `26e1fe1`. | Repetir baseline y despliegue en cada cambio; deploy no acepta comportamiento API. |
| CMT-002 — widget/diagnóstico | UAT-112–120 en producción. UAT-120 confirma `lang` ES/EN/PT en login; UAT-117 confirma estado de copia/omisión de hostname en fuente; UAT-118 mide targets 44×44. | Completar matriz locale/tema/viewport/rutas, foco/contraste, lector de pantalla, fallo de copia, diagnóstico protegido/RBAC y audio/dispositivo. |
| CMT-003 — runtime por tenant | Se documentaron claims sin lease/idempotencia y riesgo DNS/CIDR; PIAs CMT-003A/B listas. | Implementación no iniciada; probar luego en producción con tenant/dispositivo sintéticos. CRM real espera sandbox elegido por el cliente. |
| CMT-004 — administración/permisos | Política de roles mínimos, actor/tenant desde BD, claves write-only y selector acotado al tenant; UAT-121 pasa solo la barrera anónima del selector. | UAT persistente autenticado, propiedad de catálogo, provisioning de owner, revocación y limpieza de fixtures sintéticos. |

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
- UAT-121: `50-uat/evidence/uat-121-production-anonymous-team-selector-2026-10-17.json` (barrera anónima únicamente).
- PIAs: CMT-002, CMT-003/003A/003B y CMT-004 en `20-plan/pias/`.
- Web Railway `be95247a-bd0e-49d9-bcb6-4166a4222746` y API Railway `0c31ee86-59f5-4943-82d6-902ec0d6b6dc` ambos `SUCCESS` para main `26e1fe1`. Deployment `SUCCESS` no equivale a aceptación API funcional; ningún test API se ejecutó en producción.
- Sin pruebas/builds locales de aplicación. Solo JSON parse/version alignment, `git diff --check` y PHDK static 64/64. Sin credenciales, clientes, CRM, llamadas o cambios de caché.

SIGUIENTE PASO: continuar CMT-002 con cobertura pública de foco/lector de pantalla; mantener UAT autenticado/audio tras el gate de fixtures y preparar aceptación API solo con fixtures sintéticos autorizados.


## Reentrada PMO — ADM-IF / UAT-121 (2026-10-17)

El owner confirmó la asignación tenant-scoped para Admin/Coordinator. La fuente Web/API/Cloud existente fue mapeada en `20-plan/pias/PIA-CMT-004A-ASIGNACION-INTERFACES-POR-TENANT.md`; producción 5.2.4 solo aceptó el límite anónimo en UAT-121. Los casos autenticados, persistencia y denegación cross-tenant están BLOCKED por falta de fixture sintético productivo autorizado. La decisión y evidencia no cierran CMT-004.
