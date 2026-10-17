# PHDK Auto — estado de cartera al 2026-10-17

PHDK **2.53.1** · KELEDON **5.2.2** · Run `20261014-0007-phdk-auto-completion` · Estado global: **PARCIALMENTE ENTREGADO**.

El usuario confirmó cuatro frentes y su orden. Se conserva ese orden y no se cierra la meta completa mientras queden gates sin aceptar.

| Orden | Compromiso | Estado | Evidencia vigente | Pendiente / gate de salida |
|---|---|---|---|---|
| 1 | CMT-001 — baseline, versiones y entrega | **COMPLETADO para el corte 5.2.2** | Producto 5.2.2; cinco raíces package/lock y renderer Browser alineados; PHDK coherence 64/64; UAT-112 y UAT-113 en producción; PR #219 de código y PR #220–#224 de evidencia/documentación fusionados; `main` verificado en `1c5bd8abc626d45d2e7c3a1b45d8ba5564359026`; despliegues Railway Web/API tras el último PR: `SUCCESS`, servicios en línea. | Mantener la disciplina de baseline y repetir la reconciliación en cada cambio. Esto no implica aceptación funcional de toda la cartera. |
| 2 | CMT-002 — widget y diagnóstico seguro | **ACTIVE / PARTIAL** | UAT-112/113: CTA/login con contraste muestreado; UAT-114: disclosure en árbol; UAT-115: 320/375/768 sin overflow; UAT-116: español/corporativo/375 sin overflow, CTAs visibles y menú 44×44px en producción 5.2.2. | Recorrido integral de contraste, lector de pantalla, locales/rutas/dispositivos, micrófono/audio de prueba y diagnóstico autenticado con RBAC. No hay identidad sintética ni hardware de UAT provisionados. |
| 3 | CMT-003 — voz → Cloud → Browser → CRM por tenant | **ACTIVE / PARTIAL** | Stack elegido por cada cliente; destino privado permitido solo con allowlist validada por tenant. Revisión de fuente produjo CMT-003A y CMT-003B como planes ejecutables. | Implementar lease/idempotencia y protección DNS/CIDR en el punto de conexión; aceptación de producción con tenant/dispositivo sintéticos. Las pruebas end-to-end de cada CRM/call stack requieren sandbox seleccionado por el cliente. |
| 4 | CMT-004 — administración y permisos | **ACTIVE / PARTIAL** | Política de mínimo privilegio aprobada; selector Web acotado al tenant; secretos reemplazables nunca se devuelven en respuestas ordinarias. | Catálogo/owner provisioning, ownership histórico, persistencia tras login/restart, pruebas autenticadas por rol y negativas cross-tenant. Requiere identidades y datos sintéticos con limpieza aprobada. |

## Producción y método de aceptación

Producción es Railway, proyecto `KELEDON`. El último readback posterior a PR #224 reporta Web y API `SUCCESS`; servicios Web, API, Qdrant y PostgreSQL `Online`, sin trabajo pendiente. Speaches está `Sleeping` por su configuración. UAT-112/113 observaron únicamente rutas públicas; no se enviaron credenciales ni se activaron login, OAuth, altas, mutaciones, CRM ni llamadas.

La regla de trabajo vigente es no ejecutar pruebas ni builds de aplicación localmente. La coherencia PHDK es un chequeo estático de documentación/mapeos, no una prueba de la aplicación. Toda aceptación funcional necesaria se prepara con fixtures sintéticos y se ejecuta en el sitio de producción, con el gate de identidad/tenant/dispositivo correspondiente.

## Siguiente tramo

Continuar por CMT-002 y registrar cada caso de producción con evidencia sanitizada. Antes de pruebas autenticadas, completar el aprovisionamiento de fixture sintético y su plan de limpieza. Después avanzar CMT-003A/B desde sus PIAs; mantener CRM privado cerrado hasta que las defensas de resolución/conexión estén implementadas y probadas. CMT-004 sigue a continuación con los mismos requisitos de fixture.

SIGUIENTE PASO: preparar el siguiente caso público y seguro de CMT-002 sobre producción 5.2.2; no abrir recorridos autenticados hasta contar con identidad sintética autorizada.
