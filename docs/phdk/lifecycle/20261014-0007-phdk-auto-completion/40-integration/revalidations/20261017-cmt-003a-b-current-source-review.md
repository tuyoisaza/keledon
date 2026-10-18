# Revisión de fuente CMT-003A/B — KELEDON 5.2.10

Fecha: 2026-10-17 · Tipo: revisión estática, sin cambios de aplicación · Resultado: ambos gates siguen parciales; aceptación productiva bloqueada.

## Baseline verificado

- Repositorio: `tuyoisaza/keledon`; `origin/main` en `edd18be5dd8fd2c49c866f9006ee0f408642e9b4` (PR documental #257 integrado).
- Producto: KELEDON 5.2.10, source `fd429298a85bdcf3b5c20791f9b1598c132aabcb`. El merge documental no cambió el source de API ni Browser.
- PHDK: 2.53.1, upstream `94f583635d295ae0f227726718904d952cadb8ab`; coherencia estática registrada en 64/64.
- Railway después del merge documental #257: API `02ce9322-a9eb-4bb5-9935-e041b767c18a` y Web `cb925cdb-413b-420d-95c2-2cdf6047ffc5`, ambos `SUCCESS`. Ese deploy documental no acepta runtime autenticado, comandos, CRM o egress.
- Restricción del owner: las pruebas de aplicación se hacen en producción con fixtures sintéticos aprobados; no correr tests, build ni lint locales de aplicación.

## CMT-003A — cola, lease y resultado

Fuente revisada: `services/api/src/browser-commands/browser-commands.service.ts`.

1. `getNextCommand()` busca sesiones/eventos, elige un comando pendiente y después inserta `browser.command.claimed`. La selección y el claim no comparten transacción ni compare-and-set; dos pollers pueden seleccionar el mismo comando antes de insertar sus eventos.
2. `findNextPendingCommand()` descarta cualquier comando con un claim previo. El evento no tiene vencimiento, owner de lease, attempt ni renovación, así que una desconexión después del claim deja el comando sin reentrega.
3. `recordCommandResult()` reconoce un `commandId` con resultado previo, pero inserta resultado, actualiza `FlowRun` e inserta el evento de paso en operaciones separadas. No hay transición de lease ni fencing para descartar un worker viejo.
4. La deduplicación de transporte por `commandId` no garantiza idempotencia de un efecto externo. La fuente actual no define `operationKey` por efecto ni un camino `reconciliation_required`.

**Decisión:** no intentar resolver esto cambiando solo filtros de eventos, ni habilitar retry de side effects. La PIA CMT-003A exige persistencia/claim atómico, fencing e idempotencia o `at_most_once`; además prohíbe cambiar contrato persistido o activar expiración de claims antes de cerrar CMT-003C. El gate inmediato es completar CMT-003C/C1 y la revisión de seguridad. Después, preparar migración compatible, revisión de código/PR y UAT productivo con workers y CRM sandbox sintéticos autorizados. Hasta entonces, no realizar mutaciones CRM ni afirmar que los reintentos son seguros.

## CMT-003B — egress por tenant

Fuentes revisadas: `browser/src/security-policy.ts`, `browser/src/tab-manager.ts` y el guard instalado en la sesión Electron.

1. La navegación y `onBeforeRequest` comparan esquema/origen con la allowlist derivada de la configuración del vendor. Esto limita navegación y solicitudes según origen, pero no inspecciona todas las respuestas DNS ni fija la conexión a una IP validada.
2. El handler de redirect vuelve a comprobar el origen de navegación; no es un broker de egress ni demuestra que el socket Chromium abrió una IP permitida. Una allowlist de hostname por tenant no elimina DNS rebinding ni basta para autorizar CIDR privado.
3. El usuario autorizó destinos privados configurados por cliente únicamente con validación y allowlist por tenant. No se puede convertir esa decisión en permiso RFC1918/ULA general.

**Decisión:** mantener bloqueada la aceptación y el uso de destinos privados hasta que exista enforcement en el punto de conexión (pinning fiable con TLS/SNI o proxy de egress equivalente), validación completa A/AAAA y revalidación de cada redirect/conexión. No agregar un chequeo DNS previo aislado ni llamar host privado, CRM de cliente o metadata. El gate de implementación incluye diseño de compatibilidad Electron/TLS, revisión de seguridad, PR y casos NET-DNS-01..06 en candidato desplegado con DNS/CRM sandbox sintético exacto y autorizado.

## Secuencia y salida

1. Resolver CMT-003C1: flujo first-party de identidad normal, auditoría durable previa/transaccional y cleanup idempotente/reversible; sin fixture endpoint público, test-as productivo o bypass.
2. Tras revisión de seguridad, implementar CMT-003A con transiciones monotónicas, claim atómico, TTL/fencing y política de retry por efecto. Los resultados ambiguos sin idempotencia quedan para reconciliación manual.
3. Implementar CMT-003B solo con control en la ruta efectiva de cada conexión y redirect; allowlist/CIDR exactos ligados al tenant y revocables.
4. Aceptar cada caso funcional/de seguridad exclusivamente en producción con las identidades, workers y sandboxes sintéticos aprobados; registrar evidencia redacted y confirmar cleanup.

Esta revisión no cambia código de aplicación ni ejecuta pruebas/build/lint locales. La meta CMT-003 permanece **ACTIVE / PARTIAL / BLOCKED FOR ACCEPTANCE**; CMT-003A/B no pasan a completo por la revisión estática ni por el despliegue documental.
