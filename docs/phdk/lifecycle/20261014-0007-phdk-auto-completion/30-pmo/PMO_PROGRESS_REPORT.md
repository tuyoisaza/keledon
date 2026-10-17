# PHDK Auto — informe de progreso, 2026-10-17

Baseline: PHDK **2.53.1**, producto **5.2.2**, remote `main` `1c5bd8abc626d45d2e7c3a1b45d8ba5564359026`. Coherencia estática PHDK: **64/64**. El estado global sigue **PARCIALMENTE ENTREGADO**.

| Frente | Hecho comprobado | Lo que falta |
|---|---|---|
| CMT-001 — baseline/versiones/PR | Versión de producto alineada; PR #219 entregó el ajuste de CTA; #220–#224 conciliaron evidencia y PIA. Remote `main` se leyó de nuevo. Railway Web y API finalizaron `SUCCESS` después del último PR y los servicios están en línea. | Continuidad del proceso en el siguiente cambio. CMT-001 queda cerrado para este corte, no para futuras entregas. |
| CMT-002 — widget/diagnóstico | UAT-112–116 se hicieron en producción 5.2.2. El contraste cubre pares planos muestreados; login: árbol, Tab y foco visible; portada: disclosure accesible, 320/375/768 sin overflow y español/corporativo/375 sin overflow. | Muestras ampliadas por locale, viewport y temas; lector de pantalla; pruebas de dispositivo/audio autorizadas; diagnóstico protegido con roles sintéticos. |
| CMT-003 — runtime por tenant | Se documentaron gaps de claim sin expiración/idempotencia y de DNS-rebinding/CIDR. Se añadieron PIAs CMT-003A y CMT-003B con criterios de diseño y aceptación. | La implementación de ambas está **NO INICIADA**. Hace falta fixture tenant/dispositivo sintético para aceptación; los CRM reales esperan selección y sandbox de cada cliente. |
| CMT-004 — administración/permisos | Se conserva la política aprobada de roles mínimos, actor/tenant desde BD y secretos write-only; el selector se limita al tenant. | UAT persistente autenticado, catálogo con ownership conocido, backfill decidido por owner, credenciales de servicio provisionadas por su owner y limpieza de fixtures. |

## Verificación del corte

- UAT-112: `50-uat/evidence/uat-112-production-cta-theme-contrast-2026-10-17.json`.
- UAT-113: `50-uat/evidence/uat-113-production-login-public-accessibility-2026-10-17.json`.
- UAT-114: `50-uat/evidence/uat-114-production-landing-demo-disclosure-2026-10-17.json`.
- UAT-115: `50-uat/evidence/uat-115-production-responsive-layout-2026-10-17.json`.
- UAT-116: `50-uat/evidence/uat-116-production-spanish-corporate-mobile-2026-10-17.json`.
- Detalle, límites y bloqueos: [PIA CMT-002](../20-plan/pias/PIA-CMT-002-WIDGET-DIAGNOSTICO.md), [PIA CMT-003](../20-plan/pias/PIA-CMT-003-RUNTIME-POR-TENANT.md), [PIA CMT-004](../20-plan/pias/PIA-CMT-004-ADMIN-PERMISOS.md).
- Sin prueba/build local de la aplicación. El 64/64 es estático. No se usaron cuentas, secretos, datos de clientes, CRM real ni mutaciones productivas.

SIGUIENTE PASO: identificar y preparar un caso CMT-002 de solo lectura en producción; mantener bloqueados audio y diagnóstico autenticado hasta tener el fixture autorizado y el dispositivo de prueba.
