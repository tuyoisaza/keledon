# PHDK Auto — estado de cartera al 2026-10-17

## Reconciliación post PR #257

`origin/main` está en `edd18be5dd8fd2c49c866f9006ee0f408642e9b4`. El source de KELEDON 5.2.10 permanece en `fd429298a85bdcf3b5c20791f9b1598c132aabcb`; PR #257 solo actualizó documentación. Railway Web `cb925cdb-413b-420d-95c2-2cdf6047ffc5` y API `02ce9322-a9eb-4bb5-9935-e041b767c18a` están `SUCCESS`. La revisión estática CMT-003A/B está registrada en [`20261017-cmt-003a-b-current-source-review.md`](../40-integration/revalidations/20261017-cmt-003a-b-current-source-review.md). Ambos gates permanecen parciales y su aceptación productiva sigue bloqueada por CMT-003C/C1 y sus sandboxes sintéticos; ningún deploy documental cambia ese estado. Sin pruebas/build/lint locales de aplicación.

Revalidación de CMT-003C1: fuente confirma signup/login normal por email/Google con rol `user`, pero las nuevas cuentas no reciben tenant/run y las mutaciones de compañía, vinculación y recursos no tienen el ciclo durable/reversible requerido. Esto elimina el supuesto de que falte autenticación normal; no habilita provisioning ni UAT productivo.

La actualización documental está en [PR #258](https://github.com/tuyoisaza/keledon/pull/258), abierto y sin review/checks reportados todavía. Su entrega no modifica el producto ni desbloquea aceptación runtime.

## Readback vigente — candidate 5.2.10 / CMT-003C1

Repo `tuyoisaza/keledon`; producto 5.2.10 en source `fd429298a85bdcf3b5c20791f9b1598c132aabcb`; main documental vigente `edd18be5dd8fd2c49c866f9006ee0f408642e9b4`. PR #255 producto y PR #256/#257 documentales integrados. Railway Web/API posteriores al PR #257 SUCCESS, 1/1 (`cb925cdb-413b-420d-95c2-2cdf6047ffc5` / `02ce9322-a9eb-4bb5-9935-e041b767c18a`). PHDK 2.53.1, canonical upstream `94f583635d295ae0f227726718904d952cadb8ab`; coherencia estática 64/64; `AGENTS.md` managed block coincide byte por byte con `PHDK_NATIVE_RULES.md`. La revalidación de CMT-003A/B está en `40-integration/revalidations/20261017-cmt-003a-b-current-source-review.md`.

UAT-140 acepta en producción solo el 404 anónimo localizado, no auth ni runtime. La revisión de fuente encontró CRUD normal de empresa/usuarios con guards DB-derived, pero auditoría no bloqueante, borrado directo, ausencia de ciclo synthetic device/flow y test-as deshabilitado para producción. UAT Prep quedó actualizado y se creó PIA-CMT-003C1. No hubo escrituras productivas ni pruebas/builds/lint locales de aplicación. Meta total **PARTIALLY DELIVERED**.

| Orden | Compromiso | Estado vigente | Evidencia / siguiente gate |
|---|---|---|---|
| 1 | CMT-001 — baseline/versiones/PR | **COMPLETO para corte 5.2.10** | Cinco package/lock roots y Browser renderer alineados; PR #255; Web/API SUCCESS. Reconciliar en cada entrega. |
| 2 | CMT-002 — widget/diagnóstico | **ACTIVE / PARTIAL** | UAT público hasta UAT-140 dentro del alcance declarado; accesibilidad integral, audio/dispositivo y runtime Landing siguen sin aceptación. |
| 3 | CMT-003 — voz/Cloud/Browser/CRM por tenant | **ACTIVE / PARTIAL / BLOCKED AUTH** | Stack configurable por cliente; CMT-003A/B tienen gates de fuente/UAT pendientes; CMT-003C1 define el remedio de fixture/auth/audit/cleanup. Egress positivo requiere DNS/CRM sandbox sintético exacto y autorizado por tenant. |
| 4 | CMT-004 — administración/permisos | **ACTIVE / PARTIAL / BLOCKED AUTH** | Selector Web asignado por tenant implementado; RBAC, persistencia y denegaciones cross-tenant requieren usuarios sintéticos normales y limpieza. |

SIGUIENTE PASO: revisar PIA-CMT-003C1 para fijar una identidad sintética con login normal y ciclo auditado reversible; después avanzar CMT-003A/B y aceptación en producción con ese run. No cambiar el control `uat-test-as` de production.

---

## Histórico — candidate 5.2.7 / CMT-002

Repo `tuyoisaza/keledon`; production `main` `a7ca8689265642e6fe1f2f69aa4fa2c90b81867b`; KELEDON 5.2.7, PR #247 merged; Railway Web/API SUCCESS. PHDK 2.53.1 coherence 64/64. UAT-130 passes Web copy-status and reviewed Landing source privacy; Landing runtime remains blocked because there is no verified deployment target.

UAT-129 solo aprueba secuencia/foco público muestreados. UAT-130 confirma estado de copia Web, no lee clipboard, y conserva BLOCKED la ejecución de `landing/`. CMT-001 está completo para el corte 5.2.7; CMT-002 parcial y CMT-003/004 activos/parciales. La matriz de personas de UAT propone IDs; no hay cuentas/tenants/devices sintéticos reales ni camino permitido de provisioning/cleanup en producción. El seeder actual rechaza producción.

SIGUIENTE PASO: continuar CMT-003A/B y resolver el destino de producción de Landing antes de afirmar su runtime; preservar bloqueados los casos autenticados sin fixture autorizado.

---

PHDK **2.53.1** · KELEDON **5.2.6** · Run `20261014-0007-phdk-auto-completion` · Estado global: **PARCIALMENTE ENTREGADO**.

Producto desplegado: source `e7257a7d0c66c8b34e6bbb7028c30be092f33102`; PR #243 actualizó PIAs/documentación y está fusionado en remote `main` `870e6db73b5706d8469b2d9a49e575bf735a9a3f` tras PR #244 (documentación); el source desplegado no cambió. Railway Web `3688c933-9806-4546-aa2e-a1aa4515e4b7` y API `27dba245-5425-47d4-a1cf-cdc3aee2f480` reportan SUCCESS para el deploy documental `870e6db`; el source de producto sigue en `e7257a7`. Cinco package/lock roots y Browser renderer alineados en 5.2.6; PHDK coherence 64/64. UAT-125/126 pasan sus alcances limitados de target-size móvil en producción; UAT-126 mide todos los controles de header/menú incluidos logo, selectores y acciones a 44px en 320/375.

| Orden | Compromiso | Estado | Evidencia vigente | Pendiente / gate |
|---|---|---|---|---|
| 1 | CMT-001 — baseline/versiones/PR | **COMPLETADO para corte 5.2.6** | Cinco raíces 5.2.6, Browser renderer sincronizado, PHDK 2.53.1 64/64, PR #240/#241 integrados y producción Web/API SUCCESS. | Reconciliar en cada entrega; despliegue no equivale a aceptación funcional. |
| 2 | CMT-002 — widget/diagnóstico | **ACTIVE / PARTIAL** | UAT-112–129 en producción dentro de alcances limitados; UAT-125/126 validan targets móviles de menú/encabezado a 44px en 320/375 sin overflow; UAT-127/128 confirman presencia semántica pública y UAT-129 muestrea orden/foco de teclado en 5.2.6. | A11y integral/lector, diagnóstico RBAC y audio/dispositivo; amplio cruce de rutas/temas/locales. |
| 3 | CMT-003 — runtime por tenant | **ACTIVE / PARTIAL** | Integración configurable por cliente; 5.2.6 revalidado: claim permanente/no atómico y egress solo por origen; PIAs CMT-003A/B actualizadas y CMT-003C creada. | UAT Prep CMT-003C: el seeder revisado rechaza producción y solo siembra DB loopback development/test; falta ruta permitida de sandbox IdP/provisioning y cleanup para tenants/devices sintéticos; egress privado requiere sandbox DNS/CRM y hostname/puerto/CIDR exactos. No hay pruebas de aplicación locales ni producción ejecutadas para esta revisión. |
| 4 | CMT-004 — administración/permisos | **ACTIVE / PARTIAL** | Política de mínimo privilegio y selector por tenant en fuente; UAT-121 anónimo limitado. | Aceptación autenticada/persistencia/cross-tenant y catálogo con fixture sintético autorizado y limpieza. |

La aceptación de aplicación se hace en el sitio de producción; no se ejecutaron suites ni builds locales. No se usaron cuentas, secretos, clientes, CRM, llamadas ni datos productivos. UAT: `50-uat/UAT_REPORT.md`; casos: `50-uat/UAT_CASES.md`; PIAs: `20-plan/pias/`.

SIGUIENTE PASO: completar UAT Prep CMT-003C con el camino de fixture sintético y cleanup auditables; después implementar lease/fencing egress en candidato nuevo y ejecutar la aceptación en producción. Mantener el Auto global PARCIAL; CMT-004 auth/persistencia/cross-tenant sigue tras este gate.
