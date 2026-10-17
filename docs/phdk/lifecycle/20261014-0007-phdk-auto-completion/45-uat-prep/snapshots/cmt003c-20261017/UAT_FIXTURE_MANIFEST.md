## Revalidación CMT-003C — 5.2.6 (2026-10-17)

**Resultado: NOT PROVISIONED / BLOCKED.** Producto source: `e7257a7d0c66c8b34e6bbb7028c30be092f33102`; PR #242 solo actualizó documentación. Run propuesto: `20261014-0007-phdk-auto-completion-cmt003c-20261017`.

| Fixture requerido | Alcance mínimo | Estado |
|---|---|---|
| Tenant sintético A/B | Dos empresas aisladas marcadas por el run; sin usuarios/clientes copiados | BLOCKED — vía/owner autorizado de provisioning y cleanup pendiente |
| Device Browser A/B | Device sintético por tenant; sin audio ni token en evidencia | BLOCKED — no pairings productivos |
| Flow | Workflow inerte para polling, lease/heartbeat/result | BLOCKED — sin efecto; candidato con cambios aún no desplegado |
| DNS/CRM sandbox | Host/port/schema/CIDR exacto y controlado, con respuestas y redirects sintéticos | BLOCKED — owner y sandbox no seleccionados |
| Credenciales/tokens | Secretos solo en ruta segura existente | Ninguno solicitado, creado o registrado |

No se ejecutó el seeder local, no se modificó la protección que rechaza producción y no se escribió directamente a la BD. Cleanup exigirá desactivar/revocar exclusivamente IDs de este run y leer evidencia de acceso negado después; auditoría append-only se conserva. Ver detalle y dependencias en `20-plan/pias/PIA-CMT-003C-FIXTURES-SINTETICOS-PRODUCCION.md`.

# Manifest de fixtures UAT — KELEDON 5.2.4

Fecha: 2026-10-17 · run `20261014-0007-phdk-auto-completion` · entorno solicitado: producción para UAT funcional.

## Resultado actual

**NOT PROVISIONED.** No se creó usuario, tenant, device, catálogo, token, sesión, fila de BD ni URL CRM. No se ejecutó seeder ni prueba local de aplicación. El único UAT vigente del candidato actual es anónimo y público (UAT-117).

| Recurso sintético propuesto | Propietario/tenant | Identificador estable propuesto | Estado |
|---|---|---|---|
| Empresa A | Company Co ficticia | `phdk-uat-companyco-20261017` | BLOCKED — no write autorizado/owner |
| Empresa B | Other Co ficticia | `phdk-uat-otherco-20261017` | BLOCKED — no write autorizado/owner |
| Roles | A/B | `phdk-uat-{superadmin,admin,coordinator,agent,user,other-user}` | BLOCKED — ninguna cuenta |
| Devices Browser | A/B | `phdk-uat-device-a`, `phdk-uat-device-b` | BLOCKED — no registro pairing |
| CRM endpoint | tenant-specific, simulado | Ningún hostname configurado | N/A — no contactar CRM real |
| Credenciales/tokens | IdP/app | Ninguno | Ninguno solicitado, creado o registrado |

## Invariantes de provisioning/cleanup

- Nunca usar cuentas del propietario ni registros de cliente.
- Provisioning, si se autoriza por un camino permitido, queda a nombre de un owner identificado; toda fila lleva marcador único del run para limpieza exacta.
- No enviar invitaciones ni correo; usar `.invalid` únicamente cuando el flujo admite alta sin side effect externo.
- Revocar sesiones y credenciales de prueba al final; retirar solo registros marcados del run. Retener auditoría append-only; no purgarla.
- No configurar un destino privado; el CRM sandbox de cada tenant espera owner, allowlist y autorización del cliente.

El seeder vigente `services/api/scripts/uat-prep-companyco.ts` rechaza producción y requiere target loopback aislado. No se modifica esa protección ni se fuerza el seeder a producción.
