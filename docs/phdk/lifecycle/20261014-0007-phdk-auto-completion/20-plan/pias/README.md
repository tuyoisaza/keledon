# PIAs de continuación — PHDK Auto / KELEDON 5.2.10+

## Reconciliación posterior a PR #257 — 2026-10-17

El `origin/main` vigente es `edd18be5dd8fd2c49c866f9006ee0f408642e9b4`; el source de producto permanece en KELEDON 5.2.10 (`fd429298a85bdcf3b5c20791f9b1598c132aabcb`). El merge #257 es documental. Railway Web `cb925cdb-413b-420d-95c2-2cdf6047ffc5` y API `02ce9322-a9eb-4bb5-9935-e041b767c18a` reportaron `SUCCESS`. La revisión estática de [CMT-003A/B](../../40-integration/revalidations/20261017-cmt-003a-b-current-source-review.md) reconfirma sus riesgos y gates; no representa acceptance productiva. CMT-003C/C1 sigue siendo el prerequisito para cualquier UAT autenticado.

La reconciliación está en PR [#258](https://github.com/tuyoisaza/keledon/pull/258), abierto contra `main`, esperando review; es solo documentación y no cambia el deploy de producto.

## Revalidación PHDK Check — 2026-10-17

`origin/main` se actualizó a `edd18be5dd8fd2c49c866f9006ee0f408642e9b4`; Web/API Railway siguen SUCCESS sin cambios staged. PHDK coherence 64/64; automation y tema pasan solo su lectura estática. El estado remoto de automatización queda parcialmente verificado: cero workflows habilitados/archivos, un run histórico fallido y `main` sin protección; no se cambió configuración. Ver [PHDK Check actual](../../70-check/PHDK_CHECK_REPORT-5.2.10-PHDK-2.53.1-current-2026-10-17.md). El fix de accesibilidad login está en PR #259 y requiere deploy + UAT-142. Las pruebas autenticadas de interfaces siguen dependiendo de una ruta de fixture compatible; los dos usuarios `user` autorizados no prueban Admin/Coordinator.

## PIA de gobierno externo — CMT-001A

[CMT-001A](PIA-CMT-001A-GOBIERNO-GITHUB-RAILWAY.md) define acceptance para branch protection, Actions, conexión CI/autodeploy y evidencia de costos/restarts. Permanece OWNER DECISION REQUIRED; documentarla no habilita ni cambia settings de proveedor.

## Estado vigente — KELEDON 5.2.10, PHDK 2.53.1 (2026-10-17)

Producto KELEDON 5.2.10 en `fd429298a85bdcf3b5c20791f9b1598c132aabcb`; PR #255 integrado. PR #257 es la actualización documental vigente en `main` `edd18be5dd8fd2c49c866f9006ee0f408642e9b4`; cinco package/lock roots y Browser renderer permanecen alineados a 5.2.10. PHDK 2.53.1, upstream `94f583635d295ae0f227726718904d952cadb8ab`, coherence 64/64. Railway Web `cb925cdb-413b-420d-95c2-2cdf6047ffc5` y API `02ce9322-a9eb-4bb5-9935-e041b767c18a` están `SUCCESS` después del PR documental #257. PIA-AUTO-SEO-002 está aceptada para los contratos de rutas/metadata/localización probados anónimamente en producción por UAT-135/136/137/139 y UAT-140; UAT-138 queda como hallazgo parcial histórico, corregido/retestado por UAT-140. CMT-001 se cierra para este corte; CMT-002 permanece parcial; CMT-003/004 siguen activos y no aceptados de forma integral. Por instrucción vigente del owner, no se ejecutan pruebas/builds/lint locales de aplicación.

## Siguiente ruta de trabajo

1. Completar CMT-003C mediante [PIA-CMT-003C1 — ciclo de vida auditado de fixtures](PIA-CMT-003C1-PROVISIONING-AUDITADO.md). Las pantallas/rutas CRUD normales existen, pero el registro de auditoría de CRUD es asíncrono/no bloqueante, el borrado de empresa es directo, no hay fixture/device lifecycle completo y UAT test-as está desactivado en producción. La autorización actual cubre solo dos tenants, dos usuarios `user`, dos devices y un flow inerte; no se crea ningún superadmin de prueba.
2. Con CMT-003C aceptada, implementar y aceptar CMT-003A (lease/fencing/idempotencia o reconciliación) y después CMT-003B (enforcement de conexión, DNS/CIDR/redirect por tenant), manteniendo cerrados side effects CRM y egress privado hasta pasar los casos de producción.
3. Continuar CMT-004 y aceptar selector por tenant, ciclo de cuentas, RBAC y persistencia con identidades sintéticas; después cerrar los gates amplios CMT-002 y las integraciones que cada cliente seleccione.

La meta de cuatro frentes permanece **PARTIALLY DELIVERED**. La ausencia de un destino `Landing` de producción, audio/dispositivo nativo, aceptación CRM por cliente, ranking/citas externas y cambios de controles de proveedor sigue registrada como límite, no como un PASS.

## Evidencia de ruta aceptada

PR #255 se fusionó en `fd429298a85bdcf3b5c20791f9b1598c132aabcb`. UAT-140 verificó el 404 anónimo, noindex, ausencia de canonical, script same-origin y texto portugués seleccionado desde el control visible, en Railway Web `15f47990-5368-4462-aeba-0d508c388262` y API `1b391751-bfc4-4d88-8131-ae239a3c5a07`; ambos SUCCESS. Evidencia: `../50-uat/evidence/uat-140-production-localized-404-2026-10-17.json`.

---

## Extensión 5.2.8 — producción y HTML SEO inicial (2026-10-17)

La lectura anónima del Web de producción encontró `#root` vacío en el HTML inicial; el producto solo ofrecía H1 y explicación después de ejecutar JavaScript. [PIA-AUTO-SEO-001](PIA-AUTO-SEO-001-WEB-HTML-INICIAL.md) cubre el resumen de contenido ya aprobado, la sustitución por React y la aceptación anónima posterior al despliegue. El cambio afecta el runtime Web, por eso coordina el patch a 5.2.8 en los cinco paquetes versionados y el renderer. Se respetan las pruebas exclusivamente en producción; no se permiten suites ni builds locales de aplicación.

La aceptación detectó dos hallazgos separados: metadata estática de home compartida temporalmente con `/login` y rutas SPA inexistentes que responden 200/redirigen al home. [PIA-AUTO-SEO-002](PIA-AUTO-SEO-002-METADATA-Y-RUTAS-SPA.md) define el inventario y la aceptación de ruta/header/meta para corregirlos sin romper deep links ni exponer rutas privadas.

## Histórico — estado de PIAs en KELEDON 5.2.7 (2026-10-17)

Baseline remoto `main` `a7ca8689265642e6fe1f2f69aa4fa2c90b81867b`; KELEDON 5.2.7; PR #247 integrado; PHDK 2.53.1 coherence 64/64; Railway Web/API `SUCCESS`. El usuario mantiene las pruebas de aplicación exclusivamente en producción y prohíbe suites/builds locales. CMT-001 completo para el corte 5.2.7; CMT-002 parcial: UAT-130 pasa estado de copia Web y fuente Landing, pero runtime Landing está bloqueado al no haber destino de producción verificado; CMT-003A/B siguen pendientes; CMT-003C y CMT-004 autenticado bloqueados por falta de provisioning/cleanup sintético compatible con PHDK.

## Histórico — reconciliación de PIAs en KELEDON 5.2.4 — 2026-10-17

Baseline remoto verificado: KELEDON 5.2.4, main 26e1fe1452cffb97164d65917b3c9a4308bdbdc2; PHDK 2.53.1. El selector de interfaces por tenant ya está implementado y fusionado. La nueva PIA [ADM-IF](PIA-CMT-004A-ASIGNACION-INTERFACES-POR-TENANT.md) documenta el alcance autorizado y separa la aceptación anónima productiva (UAT-121 PASS limitado) de las pruebas autenticadas, que siguen bloqueadas sin identidades sintéticas autorizadas.

Fecha: 2026-10-17 · Baseline vigente: `origin/main` `26e1fe14` · KELEDON 5.2.4 · PHDK 2.53.1 · objetivo global PARTIAL.

Este directorio convierte los cuatro compromisos confirmados en paquetes ejecutables de implementación y aceptación (PIA). Conserva su orden, las decisiones aprobadas y la política del usuario: las pruebas funcionales se hacen en el sitio productivo; no se ejecutan suites ni builds locales de aplicación. La aceptación productiva debe usar sesión, identidades, tenant y datos sintéticos expresamente preparados, nunca datos de clientes.

| Orden | PIA | Alcance inmediato | Estado |
|---|---|---|---|
| 1 | [CMT-001 — baseline y entrega](PIA-CMT-001-BASELINE-ENTREGA.md) | Mantener versiones, PHDK, PR y readback de despliegue | Completo para el corte 5.2.10; continuar en cada cambio |
| 2 | [CMT-002 — widget y diagnóstico](PIA-CMT-002-WIDGET-DIAGNOSTICO.md) | Aceptar widget/diagnóstico y cerrar accesibilidad segura | Activo/parcial; UAT público limitado hasta UAT-140; Landing y RBAC/audio pendientes |
| 3 | [CMT-003 — voz/Cloud/Browser/CRM](PIA-CMT-003-RUNTIME-POR-TENANT.md) | Contrato adaptable por cliente y destinos privados seguros | Activo; [CMT-003C](PIA-CMT-003C-FIXTURES-SINTETICOS-PRODUCCION.md) y [CMT-003C1](PIA-CMT-003C1-PROVISIONING-AUDITADO.md) bloquean acceptance auth; CMT-003A/B continúan después |
| 4 | [CMT-004 — administración y permisos](PIA-CMT-004-ADMIN-PERMISOS.md) + [ADM-IF — asignación de interfaces por tenant](PIA-CMT-004A-ASIGNACION-INTERFACES-POR-TENANT.md) | Catálogo tenant, selector de equipo, ciclo de cuentas, roles y persistencia | Selector implementado; aceptación autenticada bloqueada por falta de sesión sintética autorizada |

## Reglas compartidas de ejecución

- Historical candidate: KELEDON 5.2.3, main `3cccb4b2f88828fa5d273b682925d3a106dd3b9`; retained only as historical context. Current baseline is listed at the top of this README. El CI o pruebas locales no sustituyen la aceptación productiva solicitada.
- Cada PIA se entrega por PR contra `main`. Para aceptación, registrar SHA desplegado, URL/entorno, hora UTC, rol sintético, pasos y resultado redacted. La evidencia no incluye cookies, tokens, cuerpos con clientes, URLs con datos sensibles ni secretos.
- No iniciar sesión con la identidad habitual del propietario, no modificar datos/configuración real de clientes y no provisionar ni borrar cuentas, catálogos o compañías productivas sin fixture/propietario autorizado.
- UAT-103 informó que `KELEDON_VENDOR_KEY` no aparece en el inventario de nombres de variables de `keledon-api`; no se leyó su valor. Solo su propietario puede configurarla por el canal autorizado. UAT-104 es una lectura pública limitada (Web, bundle y health 200; catálogo anónimo 401).
- Un gate que requiere precondiciones ausentes queda `BLOCKED`, no `PASS`; los compromisos siguen activos hasta que fuente, despliegue y UAT requerido estén aceptados.


Reentrada 2026-10-17: UAT-121 en producción 5.2.4 pasa solo la redirección anónima de `/management/teams` a login. ADM-IF-01..06 siguen bloqueados a la espera de identidad sintética, datos sintéticos y cleanup autorizados.
