# PIAs de continuación — PHDK Auto / KELEDON 5.2.1+

Fecha: 2026-10-17 · Baseline: `origin/main` 4.19f9786 · PHDK 2.53.1 · objetivo global PARTIAL.

Este directorio convierte los cuatro compromisos confirmados en paquetes ejecutables de implementación y aceptación (PIA). Conserva su orden, las decisiones aprobadas y la política del usuario: las pruebas funcionales se hacen en el sitio productivo; no se ejecutan suites ni builds locales de aplicación. La aceptación productiva debe usar sesión, identidades, tenant y datos sintéticos expresamente preparados, nunca datos de clientes.

| Orden | PIA | Alcance inmediato | Estado |
|---|---|---|---|
| 1 | [CMT-001 — baseline y entrega](PIA-CMT-001-BASELINE-ENTREGA.md) | Mantener versiones, PHDK, PR y readback de despliegue | Activo; base 5.2.1 verificada |
| 2 | [CMT-002 — widget y diagnóstico](PIA-CMT-002-WIDGET-DIAGNOSTICO.md) | Aceptar widget 5.2.1 y cerrar accesibilidad/diagnóstico seguro | Activo; smoke público disponible |
| 3 | [CMT-003 — voz/Cloud/Browser/CRM](PIA-CMT-003-RUNTIME-POR-TENANT.md) | Contrato adaptable por cliente y destinos privados seguros | Activo; sin CRM de cliente seleccionado |
| 4 | [CMT-004 — administración y permisos](PIA-CMT-004-ADMIN-PERMISOS.md) | Catálogo tenant, ciclo de cuentas, roles y persistencia | Activo; requiere clave y fixture autorizados |

## Reglas compartidas de ejecución

- Candidato de partida: KELEDON 5.2.1, merge de producto `9c4c143abba911261f8c881cfc1b3c4e32c373a9`; PHDK 2.53.1 y 64/64 mappings. El CI o pruebas locales no sustituyen la aceptación productiva solicitada.
- Cada PIA se entrega por PR contra `main`. Para aceptación, registrar SHA desplegado, URL/entorno, hora UTC, rol sintético, pasos y resultado redacted. La evidencia no incluye cookies, tokens, cuerpos con clientes, URLs con datos sensibles ni secretos.
- No iniciar sesión con la identidad habitual del propietario, no modificar datos/configuración real de clientes y no provisionar ni borrar cuentas, catálogos o compañías productivas sin fixture/propietario autorizado.
- UAT-103 informó que `KELEDON_VENDOR_KEY` no aparece en el inventario de nombres de variables de `keledon-api`; no se leyó su valor. Solo su propietario puede configurarla por el canal autorizado. UAT-104 es una lectura pública limitada (Web, bundle y health 200; catálogo anónimo 401).
- Un gate que requiere precondiciones ausentes queda `BLOCKED`, no `PASS`; los compromisos siguen activos hasta que fuente, despliegue y UAT requerido estén aceptados.
