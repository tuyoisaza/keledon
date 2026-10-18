# Revalidación estática CMT-003C1 — KELEDON 5.2.19 / PHDK 2.56.0

Fecha: 2026-10-18 · main `4643e8025d41f3571865123f154e6ae8ae2cb8ed` · sin pruebas/build/lint locales y sin escrituras de producción.

## Fuente y controles confirmados

Se revisaron `uat-fixtures.controller.ts`, `uat-fixtures.service.ts`, `account-lifecycle.policy.ts`, guards de auth/device/runtime y `UatFixturesPanel.tsx`. La ruta no es pública y exige `SuperAdminGuard`/rol `superadmin`; el servicio vuelve a resolver el rol desde DB dentro de transacción. `create` limita el cuerpo a runId/userIds/ttlHours, exige exactamente dos cuentas `user` first-party sin company/team/run/sessions/devices/agents, TTL 1–24h, serializa capacidad con advisory lock, y crea solo Company/Brand/Team mínimos, agentes inactivos, dispositivos pendientes sin token/código y un único Flow inactivo de Team A. La auditoría de create/retire/restore ocurre dentro de transacción y su fallo revierte la operación. Capacidad retenida: un solo run de dos tenants; expirado/retirado no habilita crear otro. No crea credenciales, invitaciones, correo, proveedores, CRM ni scheduler.

## Semántica de retiro/restauración

Retirar invalida el acceso de cuenta, fija la barrera de emisión de tokens, revoca token/códigos del device y desactiva agente/flow. `restore` solo devuelve elegibilidad de login de la cuenta antes del TTL y exige login normal nuevo; mantiene los dispositivos revocados/sin credenciales y agente/flow inactivos. Por tanto no es un rollback completo del fixture ni permite reusar el dispositivo: el operador debe re-parear el Browser normalmente y mantener la automatización/flow inerte. El runbook ya lo declara. Este comportamiento falla cerrado y no autoriza expandir límites; aceptación productiva de restore/re-pair sigue sin ejecutarse.

La respuesta administrativa del run manifiesta IDs internos generados y estado/TTL, pero no email, password, tokens, códigos, secrets ni URLs CRM. La fuente confirma `passwordHash` presente, email reservado y cero sesiones/devices/keledons; el modelo no expone relaciones completas a flows creados históricamente por esos users. Como el criterio operativo exige cuentas first-party sin uso previo, el owner debe usar cuentas nuevas reservadas, no reciclar una identidad con historial; no se crea cuenta durante esta revisión.

## Gate actual

No encontramos otra condición de implementación que requiera una escritura inmediata. Sí permanece una condición real de ejecución: ninguna sesión superadmin existente ni identidades normales sintéticas están disponibles en la pestaña conectada; por ello no se provisionó fixture. La PIA bloquea aceptación auth y CMT-003A persistent lease mutation hasta completar esa entrada. El fixture source no reemplaza UAT. Evidencia de lectura API UAT-157 confirma solamente liveness/version, no este módulo.

Siguiente paso permitido: cuando haya sesión superadmin existente y las dos cuentas sintéticas first-party ya estén controladas por el owner, usar exactamente el runbook; si aún no hay sesión, seguir revisión fuente/diseño independiente sin passwords, bypass/test-as ni escritura productiva.
