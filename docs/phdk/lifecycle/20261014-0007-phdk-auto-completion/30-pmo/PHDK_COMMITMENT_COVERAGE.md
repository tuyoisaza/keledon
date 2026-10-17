# Cobertura de compromisos PHDK Auto — KELEDON 5.2.4

Run `20261014-0007-phdk-auto-completion` · PHDK **2.53.1** · corte **2026-10-17** · remote `main` `6715ea986bf9058b8f7d50edae1efe2ed4f65b81`.

El alcance confirmado por el usuario tiene cuatro compromisos, en este orden: baseline/versiones/PR; widget/diagnóstico; voz→Cloud→Browser→CRM por cliente; administración/permisos.

| ID | Cobertura alcanzada | Evidencia principal | Estado de salida |
|---|---|---|---|
| CMT-001 | Versión 5.2.4, cinco package/lock roots y renderer alineados; PHDK coherence 64/64; PR #232 fusionado y `main` verificado. Railway Web/API `SUCCESS` para `6715ea9`. | PIA CMT-001; UAT-112/113/117/120; PR #229–#232. | **COMPLETADO para el corte**; mantenimiento continuo. |
| CMT-002 | UAT-112–120 en producción; CTA/login, disclosure, responsive, copia pública y teclado muestreados. UAT-120 confirma metadatos `lang` ES/EN/PT en login. La fuente retira hostnames API/OAuth. | Evidencias JSON UAT-112 a UAT-120. | **ACTIVE / PARTIAL**; no equivale a auditoría WCAG ni cubre autenticación/RBAC o audio. Portapapeles no inspeccionado. |
| CMT-003 | Contrato por tenant y política de destinos privados aprobados registrados; dos PIAs convierten hallazgos source en trabajo ejecutable. | CMT-003A lease/idempotencia; CMT-003B DNS/CIDR; mapa de contrato runtime. | **ACTIVE / PARTIAL**; implementación A/B pendiente. CRM real bloqueado hasta sandbox elegido por cliente. |
| CMT-004 | Política restrictiva aprobada y selector limitado al tenant; manejo de secreto write-only documentado. | PIA CMT-004; PR de selector y cambios de cifrado/auditoría ya integrados. | **ACTIVE / PARTIAL**; fixture autenticado, persistencia, catálogo y cobertura de roles pendientes. |

## Reglas de evidencia

Solo se declaran observaciones confirmadas por evidencia. UAT-112 y UAT-113 muestrean texto plano; no prueban todos los componentes, fondos, estados ni criterios WCAG. Un servicio `Online` y un despliegue `SUCCESS` prueban disponibilidad del servicio/despliegue, no la aceptación de la función. Coherencia 64/64 valida mappings PHDK, no comportamiento de aplicación.

No se ejecutan tests ni builds de aplicación local. Las pruebas de aplicación acordadas se ejecutan en producción usando identidades, tenants, datos, dispositivos y endpoints sintéticos. No se activan operaciones que muten datos de clientes. Secretos y datos personales no se copian a la evidencia.

## Bloqueos con owner/dependencia

- CMT-002 autenticado/audio: owner provisiona identidad sintética, dispositivo de prueba y cleanup; hasta entonces quedan abiertas las pruebas protegidas.
- CMT-003A/B: implementar primero las salvaguardas; validar después con sandbox privado sintético y DNS controlado. Sin esos controles, no aceptar CRM privado.
- CMT-003 por cliente: cada cliente selecciona proveedor de llamadas/CRM y entrega sandbox y autorización de UAT.
- CMT-004: owner resuelve ownership del catálogo histórico y provisiona los fixtures/secretos mediante su canal autorizado; nunca se revelan valores en una respuesta normal.

Estado de cartera: **1/4 completado para el corte; 3/4 ACTIVE / PARTIAL; 0 diferidos; 0 cancelados**. La meta PHDK Auto completa permanece abierta.

SIGUIENTE PASO: continuar CMT-002 con una comprobación pública de producción que no requiera identidad, antes de avanzar a los gates autenticados.
