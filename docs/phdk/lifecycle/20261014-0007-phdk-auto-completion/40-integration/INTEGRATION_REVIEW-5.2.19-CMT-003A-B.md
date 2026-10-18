# Revisión de integración CMT-003A/B — KELEDON 5.2.19 / PHDK 2.56.0

Fecha: 2026-10-18 · Base: `origin/main` `4643e8025d41f3571865123f154e6ae8ae2cb8ed` · Tipo: revisión estática de fuente, sin pruebas/build/lint locales de aplicación y sin destinos externos.

## Resultado

CMT-003 continúa **ACTIVE / PARTIAL**. La ruta de claims API corrigió parte del diagnóstico antiguo: lectura/selección y claim ahora ocurren dentro de la misma transacción PostgreSQL y bajo advisory transaction lock por `deviceId`; resultado, actualización de `FlowRun` y evento de paso también comparten transacción. Esto reduce la carrera entre dos pollers del mismo dispositivo. No constituye un lease recuperable ni resuelve efectos externos.

## CMT-003A — command lifecycle

Fuentes: `services/api/src/browser-commands/browser-commands.controller.ts`, `browser-commands.service.ts`, `dto/browser-commands.dto.ts`, `browser/src/command-poller.ts` y `browser/src/cloud-command-polling.ts`.

- `GET next-command` inserta `browser.command.claimed` con `claimedAt` y `deviceId` bajo el lock; no persiste attempt, owner token, expiry, start ni heartbeat. `findNextPendingCommand` excluye permanentemente un comando con cualquier claim previo. Un Browser que cae tras claim deja ese comando sin recuperación.
- El poller ejecuta inmediatamente el handler después de recibir el comando. No pide un `start` aceptado por servidor, no mantiene un lease por comando y no renueva heartbeat. El heartbeat WebSocket existente es de conectividad de dispositivo, no de la operación.
- `command-result` es append-only en eventos y atómico con `FlowRun`; devuelve el resultado existente ante un duplicado por ID, sin comparar si el nuevo resultado contradictorio coincide. No hay attempt/token para fencing ni estado `reconciliation_required`.
- La deduplicación por `commandId` evita duplicar el evento terminal, pero no garantiza idempotencia de una mutación CRM ya ejecutada ni guarda una `operationKey` por step. La política no permite retry de efecto incierto sin adaptador idempotente demostrado.
- Posible compatibilidad a revisar: el selector permite fallback al `deviceId` de sesión cuando el evento `issued` carece de `metadata.deviceId`; la validación de resultado exige actualmente el `deviceId` explícito en el evento. Confirmar si existen comandos legacy con ese shape antes de endurecer o migrar el contrato.

**Gate:** PIA-CMT-003A mantiene explícitamente el bloqueo a cambios del contrato persistido/expiración de claims antes del cierre del fixture gate CMT-003C. No se modifica esquema ni se habilita redelivery en esta revisión. CMT-003C1 sí contiene lifecycle source en main, pero falta acceptance autenticada con sesión superadmin existente y fixtures sintéticos autorizados; ese requisito bloquea solo los casos dependientes.

## CMT-003B — egress Browser

Fuentes: `browser/src/security-policy.ts`, `browser/src/tab-manager.ts`, `browser/src/autobrowse-bridge.ts` y configuración tenant de vendors.

- Navegación, ventanas y requests HTTP(S)/WS(S) se filtran por origen exacto derivado del vendor activo; redirects y frames vuelven a pasar el guard. URL sin credenciales embebidas y esquemas no web se rechazan.
- El conjunto de orígenes es hostname/puerto/esquema, no una declaración CIDR explícita ligada/auditada en este código. No hay validación conjunta de A/AAAA, pinning del socket, broker de egress ni evidencia de binding TLS/SNI; comparar redirects/orígenes no evita DNS rebinding.
- Consecuencia: no activar destinos privados de clientes desde Browser todavía. Tampoco añadir comprobación DNS previa aislada, bloquear RFC1918 globalmente o probar CRM/private/metadata. Se requiere el enforcement del punto de conexión definido en PIA-CMT-003B y UAT con sandbox privado exacto autorizado por tenant.

## Secuencia segura y siguiente acción

1. Completar, si se presenta, la aceptación productiva de CMT-003C1 con un superadmin ya existente y dos identidades sintéticas normales; no crear credenciales ni usar test-as/bypass. Hoy el gate no está disponible en esta sesión.
2. Continuar el diseño de migración compatible CMT-003A sin alterar persistencia todavía: estados monotónicos, owner/attempt token, TTL bounded, accepted-start, heartbeat, fencing, límite de intentos, retención y reconciliación at-most-once; revalidar con auth/device/tenant guards.
3. Para CMT-003B, diseñar enforcement efectivo por conexión y redirect con compatibilidad Electron/TLS/SNI y allowlist de tenant; no implementar un chequeo que no controle el socket.
4. Mantener toda aceptación funcional/red en producción con fixtures y sandbox sintéticos. No usar customer CRM/calls, hosts privados observados o metadata.

La captura de integración anterior a UAT-156/157 observó temporalmente Web/API en BUILDING. Esa observación es histórica y quedó supersedida por el readback posterior: PR #271 está en remote `main` como `4643e8025d41f3571865123f154e6ae8ae2cb8ed`, KELEDON 5.2.19; UAT-156/157 y Railway SUCCESS 1/1 están en `UAT_REPORT.md`. PR #271 no cambió el source CMT-003A/B.

## Reentrada — revisión de privacidad de logs Browser (working tree, 2026-10-18)

El readback autoritativo actualizado confirma que PR #271 está en remote `main` `4643e8025d41f3571865123f154e6ae8ae2cb8ed`, KELEDON 5.2.19, y Web/API son SUCCESS; ver `PMO_STATUS.md` y UAT-156/157. El siguiente hallazgo CMT-003 independiente no requiere ejecutar un comando ni tocar persistencia: el poller guardaba previews de payload/output, respuestas HTTP, errores libres, y los handlers registraban transcript/goals/reasons/IDs; `EventLogger` retenía y exportaba objetos sin redacción.

Un candidato de trabajo separado intentó limitar algunos logs Browser a metadatos y sanitizar `cmdlog`/`EventLogger`. La revisión técnica de esta invocación encontró callsites aún sin sanear y una respuesta de error cruda emitida a Cloud; ese candidato queda fuera de KELEDON 5.2.20, no está aceptado y requiere reparación/revisión antes de proponerlo para otra entrega. API aún persiste `dto.error` libre en tres proyecciones; no se alteró porque el contrato persistido sigue explícitamente gated por PIA CMT-003C.
