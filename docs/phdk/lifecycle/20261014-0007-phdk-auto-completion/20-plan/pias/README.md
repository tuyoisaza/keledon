# PIAs de continuación — PHDK Auto / KELEDON 5.2.1+

## Extensión 5.2.8 — producción y HTML SEO inicial (2026-10-17)

La lectura anónima del Web de producción encontró `#root` vacío en el HTML inicial; el producto solo ofrecía H1 y explicación después de ejecutar JavaScript. [PIA-AUTO-SEO-001](PIA-AUTO-SEO-001-WEB-HTML-INICIAL.md) cubre el resumen de contenido ya aprobado, la sustitución por React y la aceptación anónima posterior al despliegue. El cambio afecta el runtime Web, por eso coordina el patch a 5.2.8 en los cinco paquetes versionados y el renderer. Se respetan las pruebas exclusivamente en producción; no se permiten suites ni builds locales de aplicación.

## Estado vigente — KELEDON 5.2.7 (2026-10-17)

Baseline remoto `main` `a7ca8689265642e6fe1f2f69aa4fa2c90b81867b`; KELEDON 5.2.7; PR #247 integrado; PHDK 2.53.1 coherence 64/64; Railway Web/API `SUCCESS`. El usuario mantiene las pruebas de aplicación exclusivamente en producción y prohíbe suites/builds locales. CMT-001 completo para el corte 5.2.7; CMT-002 parcial: UAT-130 pasa estado de copia Web y fuente Landing, pero runtime Landing está bloqueado al no haber destino de producción verificado; CMT-003A/B siguen pendientes; CMT-003C y CMT-004 autenticado bloqueados por falta de provisioning/cleanup sintético compatible con PHDK.

## Reconciliación vigente — 2026-10-17

Baseline remoto verificado: KELEDON 5.2.4, main 26e1fe1452cffb97164d65917b3c9a4308bdbdc2; PHDK 2.53.1. El selector de interfaces por tenant ya está implementado y fusionado. La nueva PIA [ADM-IF](PIA-CMT-004A-ASIGNACION-INTERFACES-POR-TENANT.md) documenta el alcance autorizado y separa la aceptación anónima productiva (UAT-121 PASS limitado) de las pruebas autenticadas, que siguen bloqueadas sin identidades sintéticas autorizadas.

Fecha: 2026-10-17 · Baseline vigente: `origin/main` `26e1fe14` · KELEDON 5.2.4 · PHDK 2.53.1 · objetivo global PARTIAL.

Este directorio convierte los cuatro compromisos confirmados en paquetes ejecutables de implementación y aceptación (PIA). Conserva su orden, las decisiones aprobadas y la política del usuario: las pruebas funcionales se hacen en el sitio productivo; no se ejecutan suites ni builds locales de aplicación. La aceptación productiva debe usar sesión, identidades, tenant y datos sintéticos expresamente preparados, nunca datos de clientes.

| Orden | PIA | Alcance inmediato | Estado |
|---|---|---|---|
| 1 | [CMT-001 — baseline y entrega](PIA-CMT-001-BASELINE-ENTREGA.md) | Mantener versiones, PHDK, PR y readback de despliegue | Completo para el corte 5.2.4; continuar en cada cambio |
| 2 | [CMT-002 — widget y diagnóstico](PIA-CMT-002-WIDGET-DIAGNOSTICO.md) | Aceptar widget/diagnóstico y cerrar accesibilidad segura | Activo; UAT público 112–121 con límites explícitos |
| 3 | [CMT-003 — voz/Cloud/Browser/CRM](PIA-CMT-003-RUNTIME-POR-TENANT.md) | Contrato adaptable por cliente y destinos privados seguros | Activo; cola y DNS revisados; UAT Prep de fixtures sintéticos pendiente |
| 4 | [CMT-004 — administración y permisos](PIA-CMT-004-ADMIN-PERMISOS.md) + [ADM-IF — asignación de interfaces por tenant](PIA-CMT-004A-ASIGNACION-INTERFACES-POR-TENANT.md) | Catálogo tenant, selector de equipo, ciclo de cuentas, roles y persistencia | Selector implementado; aceptación autenticada bloqueada por falta de sesión sintética autorizada |

## Reglas compartidas de ejecución

- Candidato vigente: KELEDON 5.2.3, main `3cccb4b2f88828fa5d273b682925d3a106dd3b9`; cinco roots y renderer alineados; PHDK 2.53.1 y 64/64 mappings. El CI o pruebas locales no sustituyen la aceptación productiva solicitada.
- Cada PIA se entrega por PR contra `main`. Para aceptación, registrar SHA desplegado, URL/entorno, hora UTC, rol sintético, pasos y resultado redacted. La evidencia no incluye cookies, tokens, cuerpos con clientes, URLs con datos sensibles ni secretos.
- No iniciar sesión con la identidad habitual del propietario, no modificar datos/configuración real de clientes y no provisionar ni borrar cuentas, catálogos o compañías productivas sin fixture/propietario autorizado.
- UAT-103 informó que `KELEDON_VENDOR_KEY` no aparece en el inventario de nombres de variables de `keledon-api`; no se leyó su valor. Solo su propietario puede configurarla por el canal autorizado. UAT-104 es una lectura pública limitada (Web, bundle y health 200; catálogo anónimo 401).
- Un gate que requiere precondiciones ausentes queda `BLOCKED`, no `PASS`; los compromisos siguen activos hasta que fuente, despliegue y UAT requerido estén aceptados.


Reentrada 2026-10-17: UAT-121 en producción 5.2.4 pasa solo la redirección anónima de `/management/teams` a login. ADM-IF-01..06 siguen bloqueados a la espera de identidad sintética, datos sintéticos y cleanup autorizados.
