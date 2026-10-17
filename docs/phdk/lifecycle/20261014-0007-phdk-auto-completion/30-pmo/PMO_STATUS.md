# PHDK Auto — estado de cartera al 2026-10-17

PHDK **2.53.1** · KELEDON **5.2.6** · Run `20261014-0007-phdk-auto-completion` · Estado global: **PARCIALMENTE ENTREGADO**.

Producto desplegado: source `e7257a7d0c66c8b34e6bbb7028c30be092f33102`; PR #243 actualizó PIAs/documentación y está fusionado en remote `main` `870e6db73b5706d8469b2d9a49e575bf735a9a3f` tras PR #244 (documentación); el source desplegado no cambió. Railway Web `3688c933-9806-4546-aa2e-a1aa4515e4b7` y API `27dba245-5425-47d4-a1cf-cdc3aee2f480` reportan SUCCESS para el deploy documental `870e6db`; el source de producto sigue en `e7257a7`. Cinco package/lock roots y Browser renderer alineados en 5.2.6; PHDK coherence 64/64. UAT-125/126 pasan sus alcances limitados de target-size móvil en producción; UAT-126 mide todos los controles de header/menú incluidos logo, selectores y acciones a 44px en 320/375.

| Orden | Compromiso | Estado | Evidencia vigente | Pendiente / gate |
|---|---|---|---|---|
| 1 | CMT-001 — baseline/versiones/PR | **COMPLETADO para corte 5.2.6** | Cinco raíces 5.2.6, Browser renderer sincronizado, PHDK 2.53.1 64/64, PR #240/#241 integrados y producción Web/API SUCCESS. | Reconciliar en cada entrega; despliegue no equivale a aceptación funcional. |
| 2 | CMT-002 — widget/diagnóstico | **ACTIVE / PARTIAL** | UAT-112–128 en producción dentro de alcances limitados; UAT-125/126 validan targets móviles de menú/encabezado a 44px en 320/375 sin overflow; UAT-127/128 confirman presencia semántica pública en 5.2.6; UAT-128 revalida post-merge. | A11y integral/lector, diagnóstico RBAC y audio/dispositivo; amplio cruce de rutas/temas/locales. |
| 3 | CMT-003 — runtime por tenant | **ACTIVE / PARTIAL** | Integración configurable por cliente; 5.2.6 revalidado: claim permanente/no atómico y egress solo por origen; PIAs CMT-003A/B actualizadas y CMT-003C creada. | UAT Prep CMT-003C: falta aprobación y mecanismo auditado de provisión/cleanup para tenants/devices sintéticos; egress privado requiere sandbox DNS/CRM y hostname/puerto/CIDR exactos. No hay pruebas de aplicación locales ni producción ejecutadas para esta revisión. |
| 4 | CMT-004 — administración/permisos | **ACTIVE / PARTIAL** | Política de mínimo privilegio y selector por tenant en fuente; UAT-121 anónimo limitado. | Aceptación autenticada/persistencia/cross-tenant y catálogo con fixture sintético autorizado y limpieza. |

La aceptación de aplicación se hace en el sitio de producción; no se ejecutaron suites ni builds locales. No se usaron cuentas, secretos, clientes, CRM, llamadas ni datos productivos. UAT: `50-uat/UAT_REPORT.md`; casos: `50-uat/UAT_CASES.md`; PIAs: `20-plan/pias/`.

SIGUIENTE PASO: completar UAT Prep CMT-003C con el camino de fixture sintético y cleanup auditables; después implementar lease/fencing egress en candidato nuevo y ejecutar la aceptación en producción. Mantener el Auto global PARCIAL; CMT-004 auth/persistencia/cross-tenant sigue tras este gate.
