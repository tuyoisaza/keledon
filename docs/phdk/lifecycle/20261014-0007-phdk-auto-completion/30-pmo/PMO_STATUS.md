# PHDK Auto — estado de cartera al 2026-10-17

PHDK **2.53.1** · KELEDON **5.2.3** · Run `20261014-0007-phdk-auto-completion` · Estado global: **PARCIALMENTE ENTREGADO**.

El usuario confirmó cuatro frentes y su orden. CMT-001 cierra para el corte 5.2.3; CMT-002/003/004 siguen activos/parciales.

| Orden | Compromiso | Estado | Evidencia vigente | Pendiente / gate |
|---|---|---|---|---|
| 1 | CMT-001 — baseline/versiones/PR | **COMPLETADO para 5.2.3** | PR #229 fusionado; `main` documental `85d792321445da6ba6a744e79d7128fed8717d3d`; cinco package/lock roots y Browser renderer 5.2.3; PHDK 64/64 estático. Web/API Railway `SUCCESS` sobre `85d7923`. | Repetir conciliación en cada siguiente cambio. El deploy exitoso no significa aceptación de comportamiento API. |
| 2 | CMT-002 — widget/diagnóstico | **ACTIVE / PARTIAL** | UAT-112–119 en producción; UAT-119 confirmó orden de teclado del login en v5.2.3. UAT-117 vio “Diagnóstico copiado”; fuente omite hostnames API/OAuth. Portapapeles no leído. | Corregir `lang` (pt seleccionado/HTML `en`); validar foco/contraste, lector de pantalla, locales/rutas, RBAC autenticado y audio/dispositivo. |
| 3 | CMT-003 — runtime por tenant | **ACTIVE / PARTIAL** | Stack se elige por cliente; privados solo con validación y allowlist por tenant; PIAs 003A/003B. | Implementar lease/idempotencia y defensa DNS/CIDR; después UAT en fixture y sandbox seleccionados. |
| 4 | CMT-004 — administración/permisos | **ACTIVE / PARTIAL** | Política de mínimo privilegio aprobada; selector acotado al tenant; secretos write-only. | Persistencia/roles/cross-tenant con identidades y catálogo sintéticos provisionados y limpiables por owner. |

## Método y límites

La regla vigente es ejecutar aceptación de aplicación solo en producción; no se corrieron suites ni builds locales. UAT-117–119 usaron rutas públicas anónimas. UAT-119 detectó metadatos `lang=en` con el contenido en portugués; no se corrigió en producción. El login mostró una sugerencia autofill sin seleccionarla; no se registraron valores ni se envió el formulario. No se usaron cuentas, secretos, clientes, CRM, llamadas, probe profundo ni limpieza de caché. El chequeo 64/64 valida coherencia PHDK estática y no comportamiento de la app. Sin fixture autenticado/dispositivo no se acepta RBAC, persistencia ni audio.

UAT: `50-uat/UAT_REPORT.md`; casos: `50-uat/UAT_CASES.md`; evidencia más reciente: `50-uat/evidence/uat-119-production-login-keyboard-2026-10-17.json`; PIAs: `20-plan/pias/`.

SIGUIENTE PASO: corregir los metadatos de idioma del login en el siguiente candidato y revalidarlos en producción; luego continuar CMT-002. Mantener UAT autenticado/audio tras fixtures sintéticos y dispositivo de prueba autorizados.
