# Sub-PIA CMT-003A — lease de comandos y efectos idempotentes

Estado: PLAN READY / IMPLEMENTATION NOT STARTED · Prioridad: CMT-003, gate 1 · Candidato observado: KELEDON 5.2.1.

## Hallazgo y objetivo

La revisión `40-integration/revalidations/20261017-runtime-contract/RUNTIME_CONTRACT_MAP.md` encontró que `getNextCommand()` registra `browser.command.claimed` sin expiración ni heartbeat. El comando queda excluido de polls posteriores aunque el Browser o la red caigan antes de guardar resultado. El endpoint de resultado reconoce `commandId` duplicado después de completarse, pero esa deduplicación no vuelve idempotente un efecto externo que ya ocurrió.

Definir y desplegar una entrega recuperable y trazable que no repita una mutación CRM al reconectar, reintentar o competir dos workers. La garantía aplica por step/efecto de negocio, además de la idempotencia del transporte.

## Contrato propuesto

1. Mantener un ID estable del comando y un ID estable por paso/efecto (`operationKey = tenantId + commandId + stepId`); cualquier reentrega conserva ambos IDs. No derivar autoridad desde valores del Browser: tenant, device, team y actor se recargan/validan en servidor desde la BD.
2. Persistir transiciones monotónicas: `pending → leased → running → completed`; `leased/running → retryable` solo ante expiración/cancelación permitida; `completed` es terminal. Rechazar resultados de lease vencido o de un intento anterior salvo que sean el mismo resultado terminal ya almacenado. Guardar `attempt`, `leaseOwner`, `leaseExpiresAt`, `startedAt`, `completedAt` y correlation ID sanitizado.
3. Reclamar atómicamente por tenant/device usando transacción o compare-and-set de BD, de modo que dos pollers no obtengan lease válido simultáneo. Lease con TTL acotado, renovación autenticada mientras hay actividad, expiración/reconciliación y límites de intentos/tiempo total. Desconexión libera o deja vencer el lease; no borra la historia.
4. Ejecutar una acción externa con `operationKey` persistida como idempotency key de extremo a extremo cuando el adaptador/CRM la soporte y su contrato lo confirme. Reentregar solo el mismo paso/clave y bajo el retry policy declarado. Registrar respuesta externa sanitizada suficiente para reconciliar el resultado.
5. Si un destino no admite idempotencia, declarar `at_most_once`: después de que el intento pueda haber producido el side effect, no reejecutar automáticamente. Marcar `reconciliation_required` y ofrecer reconciliación/manual recovery con estado y evidencia, sin generar una nueva operación implícitamente.
6. El modelo/Cloud no decide reintentos ni crea claves; el flujo versionado y el adaptador declaran acción, efecto, timeout, política de retry y soporte idempotente. Una ambigüedad de resultado externo no se interpreta como fallo seguro.

## Casos de aceptación

| Caso | Resultado exigido | Canal/evidencia |
|---|---|---|
| Q-LEASE-01 | Caída tras lease y antes de ejecutar: vence/libera lease y la misma operación puede retomarse. | Producción con device/tenant sintéticos; estados y timestamps sanitizados. |
| Q-LEASE-02 | Dos pollers simultáneos: solo uno obtiene lease vigente. | Producción; IDs sintéticos y registros de estado sin token. |
| Q-IDEM-03 | Timeout después del side effect: reentrega con la misma operationKey no duplica la mutación en sandbox idempotente. | Producción; CRM sandbox elegido/autorizado por cliente; contar efectos sintéticos. |
| Q-ONCE-04 | Adaptador sin idempotencia: incertidumbre termina en `reconciliation_required`; no hay reintento automático. | Producción; simulador/sandbox sintético. |
| Q-FENCE-05 | Resultado tardío con lease vencido/attempt viejo no pisa el resultado de un lease más nuevo. | Producción con worker sintético y relojes/eventos controlados. |
| Q-TENANT-06 | Comando, lease, resultado o idempotency key no se puede reclamar/reutilizar entre tenants/devices. | Producción con dos tenants sintéticos autorizados. |

## Invariantes, privacidad y límites

- No habilitar reintentos de mutaciones CRM hasta que un adaptador registre soporte idempotente y un UAT-03A desplegado pase con sandbox autorizado. Para los demás, solo at-most-once más reconciliación explícita.
- Estado de lease no concede autoridad. Cada poll, heartbeat y resultado revalida actor/device/tenant contra BD.
- No guardar transcripciones, cuerpos completos, tokens, cookies, secretos ni PII en la cola/auditoría. Evidencia registra IDs sintéticos, transición, `attempt`, duración y resultado redacted.
- No crear ni ejecutar pruebas de aplicación local: todos los casos se corren en la producción desplegada usando identidades, device y tenant sintéticos aprobados; limpieza validada después.
- No elegir un CRM ni inferir la semántica de sus operaciones. La aceptación del adaptador real queda bloqueada hasta que ese cliente elija sandbox y autorice su uso.

## Entregables y salida

Diseño/versionado del estado y migración compatible; reclamación atómica y expiración/heartbeat; política retry por operación/adaptador; reconciliación de resultado ambiguo; auditoría/redacción; UAT production-runbook/cleanup; evidencia de los seis casos. Mantener CMT-003A PARTIAL hasta que el efecto idempotente y el camino at-most-once hayan sido aceptados en el candidato desplegado.
