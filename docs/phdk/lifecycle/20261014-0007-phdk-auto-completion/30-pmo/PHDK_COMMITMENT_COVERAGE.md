# Cobertura de compromisos PHDK Auto — KELEDON 5.2.6

Run `20261014-0007-phdk-auto-completion` · PHDK **2.53.1** · corte **2026-10-17** · producto desplegado KELEDON 5.2.6 source `e7257a7d0c66c8b34e6bbb7028c30be092f33102` · remote `main` `9d34bb82b67e62457fd9333d4ca5e3d5ba7d8c12` tras PR #245 (docs/evidencia); source de producto no cambia.

El alcance confirmado por el usuario tiene cuatro compromisos, en este orden: baseline/versiones/PR; widget/diagnóstico; voz→Cloud→Browser→CRM por cliente; administración/permisos.

| ID | Cobertura alcanzada | Evidencia principal | Estado de salida |
|---|---|---|---|
| CMT-001 | Versión 5.2.6, cinco package/lock roots y renderer alineados; PHDK coherence 64/64; PR #240/#241 fusionados y `main` verificado. Railway Web/API `SUCCESS` para `e7257a7`. | PIA CMT-001; UAT-112/113/117/120/125/126; PR #240/#241. | **COMPLETADO para el corte**; mantenimiento continuo. |
| CMT-002 | UAT-112–129 en producción; CTA/login, disclosure, responsive, copia pública, teclado y targets de header/menu móvil a 44px muestreados. UAT-120 confirma `lang` ES/EN/PT en login. | Evidencias JSON UAT-112 a UAT-129; UAT-129 es un muestreo público de foco/teclado. | **ACTIVE / PARTIAL**; no equivale a auditoría WCAG ni cubre autenticación/RBAC o audio. Portapapeles no inspeccionado. |
| CMT-003 | Contrato por tenant y política de destinos privados aprobados registrados; dos PIAs convierten hallazgos source en trabajo ejecutable. | CMT-003A lease/idempotencia; CMT-003B DNS/CIDR; CMT-003C fixtures productivos; mapa de contrato revalidado en source 5.2.6. | **ACTIVE / PARTIAL**; implementación A/B pendiente; 003A/B production UAT bloqueada hasta cerrar fixture/cleanup y sandbox controlado. CRM real bloqueado hasta sandbox elegido por cliente. |
| CMT-004 | Política restrictiva aprobada y selector limitado al tenant; fuente revisada y UAT-121 solo confirma la redirección anónima; UAT-129 confirma foco/orden público en 5.2.6. ADM-IF documenta los casos autenticados pendientes. | PIA CMT-004/ADM-IF; PR #210 selector y cambios de cifrado/auditoría ya integrados; UAT-121 anónimo limitado. | **ACTIVE / PARTIAL**; fixture autenticado, persistencia, catálogo y cobertura de roles pendientes. |

## Reglas de evidencia

Solo se declaran observaciones confirmadas por evidencia. UAT-112 y UAT-113 muestrean texto plano; no prueban todos los componentes, fondos, estados ni criterios WCAG. Un servicio `Online` y un despliegue `SUCCESS` prueban disponibilidad del servicio/despliegue, no la aceptación de la función. Coherencia 64/64 valida mappings PHDK, no comportamiento de aplicación.

No se ejecutan tests ni builds de aplicación local. Las pruebas de aplicación acordadas se ejecutan en producción usando identidades, tenants, datos, dispositivos y endpoints sintéticos. No se activan operaciones que muten datos de clientes. Secretos y datos personales no se copian a la evidencia.

## Bloqueos con owner/dependencia

- CMT-002 autenticado/audio: PHDK prohíbe identidades privilegiadas de prueba en producción; el seeder existente es loopback-only; hasta entonces quedan abiertas las pruebas protegidas.
- CMT-003A/B: implementar primero las salvaguardas; validar después con sandbox privado sintético y DNS controlado. Sin esos controles, no aceptar CRM privado.
- CMT-003 por cliente: cada cliente selecciona proveedor de llamadas/CRM y entrega sandbox y autorización de UAT.
- CMT-004: owner/administración no dispone de ruta aprobada de fixture/cleanup; PHDK prohíbe privilegiados de prueba en producción; secretos se provisionan por canal seguro y nunca se revelan en una respuesta normal.

Estado de cartera: **1/4 completado para el corte; 3/4 ACTIVE / PARTIAL; 0 diferidos; 0 cancelados**. La meta PHDK Auto completa permanece abierta.

SIGUIENTE PASO: mantener UAT Prep CMT-003C BLOCKED hasta que exista una ruta compatible con PHDK; mantener pruebas autenticadas de CMT-003/004 BLOCKED hasta que exista provisión/cleanup sintético autorizado, y egress privado hasta contar con DNS/CRM sandbox y enforcement en el socket.
