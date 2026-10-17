# PHDK Auto — informe de progreso, 2026-10-17

Baseline producto: PHDK **2.53.1**, KELEDON **5.2.6**, desplegado source `e7257a7d0c66c8b34e6bbb7028c30be092f33102`; PR #243 documental fusionado y remote `main` `870e6db73b5706d8469b2d9a49e575bf735a9a3f` tras PR #244 (documentación); PR #241 y #240 integraron el source del producto. Coherencia estática PHDK: **64/64**; cinco package/lock roots y renderer alineados. Railway Web/API `SUCCESS` para el SHA actual. Estado: **PARCIALMENTE ENTREGADO** (CMT-001 completo para el corte, otros tres activos/parciales).

## Revalidación de continuidad — CMT-002 UAT-127/128 y CMT-003 / 5.2.6 (2026-10-17)

El producto desplegado sigue en KELEDON 5.2.6, source `e7257a7d0c66c8b34e6bbb7028c30be092f33102`; PR #243 (PIAs) y #244 (UAT-127) están fusionados; remote `main` es `870e6db73b5706d8469b2d9a49e575bf735a9a3f`. Ninguno cambió el source de producto. UAT-127 registra presencia AX limitada tras un 502 inicial (causa desconocida); UAT-128 repite presencia AX tras asentarse el deploy de #244, con primera navegación correcta. Evidencias y snapshots disponibles. Deploy docs-only #244 quedó SUCCESS en Web/API.

- CMT-003A/B: source review revalidado; no hay lease/fencing durable y el Browser solo verifica el origen, no fija DNS/IP al socket. Hallazgos y referencias actuales: `40-integration/revalidations/20261017-runtime-contract-5.2.6/`.
- CMT-003C: PIA creada para fixtures sintéticos de producción con provisión autenticada/auditada y cleanup. Estado **BLOCKED** hasta que exista esa vía autorizada. La parte privada requiere además DNS/CRM sandbox y hostname/puerto/CIDR exactos.
- No se ejecutaron pruebas/builds locales, pruebas de aplicación productiva, escrituras de BD, sesiones Browser, CRM ni endpoints privados durante esta revalidación estática.

SIGUIENTE PASO: UAT Prep CMT-003C — confirmar y habilitar el mecanismo auditado de provisión/desactivación sintética; después implementar CMT-003A/B y probar únicamente el candidato desplegado en producción.

| Frente | Hecho comprobado | Lo que falta |
|---|---|---|
| CMT-001 — baseline/versiones/PR | PR #240/#241 sincronizan las cinco raíces package/lock y Browser renderer a 5.2.6; Railway Web/API reportan `SUCCESS` para main `e7257a7`. | Repetir baseline y despliegue en cada cambio; deploy no acepta comportamiento API. |
| CMT-002 — widget/diagnóstico | UAT-112–128 en producción. UAT-125/126 retestan header/menu con 44px en 320/375 y sin overflow; UAT-127 confirma presencia semántica pública en 5.2.6; UAT-120 confirma `lang` ES/EN/PT en login; UAT-117 confirma estado de copia/omisión de hostname. | Completar matriz locale/tema/viewport/rutas, lector de pantalla, fallo de copia, diagnóstico protegido/RBAC y audio/dispositivo. |
| CMT-003 — runtime por tenant | Se documentaron claims sin lease/idempotencia y riesgo DNS/CIDR; PIAs CMT-003A/B vigentes; CMT-003C define el fixture/cleanup productivo requerido. | Implementación de safeguards pendiente; UAT Prep bloqueada por la falta de una vía autorizada de fixture/cleanup y, para egress privado, DNS/CRM sandbox sintético. CRM real espera sandbox elegido por el cliente. |
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
- PIAs: CMT-002, CMT-003/003A/003B/003C y CMT-004 en `20-plan/pias/`.
- Web Railway `be95247a-bd0e-49d9-bcb6-4166a4222746` y API Railway `0c31ee86-59f5-4943-82d6-902ec0d6b6dc` ambos `SUCCESS` para main `26e1fe1`. Deployment `SUCCESS` no equivale a aceptación API funcional; ningún test API se ejecutó en producción.
- Sin pruebas/builds locales de aplicación. Solo JSON parse/version alignment, `git diff --check` y PHDK static 64/64. Sin credenciales, clientes, CRM, llamadas o cambios de caché.

SIGUIENTE PASO: completar UAT Prep CMT-003C y fijar el camino de fixtures sintéticos/cleanup para CMT-003/004; continuar CMT-002 en frentes públicos independientes.


## Reentrada PMO — ADM-IF / UAT-121 (2026-10-17)

El owner confirmó la asignación tenant-scoped para Admin/Coordinator. La fuente Web/API/Cloud existente fue mapeada en `20-plan/pias/PIA-CMT-004A-ASIGNACION-INTERFACES-POR-TENANT.md`; producción 5.2.4 solo aceptó el límite anónimo en UAT-121. Los casos autenticados, persistencia y denegación cross-tenant están BLOCKED por falta de fixture sintético productivo autorizado. La decisión y evidencia no cierran CMT-004.
