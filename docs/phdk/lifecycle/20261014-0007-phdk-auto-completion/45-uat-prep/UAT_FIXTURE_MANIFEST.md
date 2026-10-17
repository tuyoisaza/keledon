# Manifiesto UAT — CMT-003C / KELEDON 5.2.10

Run ID propuesto: `phdk-auto-uat-20261017` · entorno objetivo: producción · estado: **NOT PROVISIONED / BLOCKED**.

Baseline: producto source `fd429298a85bdcf3b5c20791f9b1598c132aabcb`; PHDK 2.53.1 upstream `94f583635d295ae0f227726718904d952cadb8ab`. Los identificadores siguientes son etiquetas propuestas, no recursos ni cuentas reales.

| Fixture | Etiqueta propuesta | Tenant | Estado / límite |
|---|---|---|---|
| Tenant A | `phdk-auto-tenant-a-20261017` | — | BLOCKED — falta vía autenticada/auditada de creación y cleanup |
| Brand A | `phdk-auto-brand-a-20261017` | A | BLOCKED — scaffold mínimo para el Team/Flow; sin catálogo global |
| Team A | `phdk-auto-team-a-20261017` | A | BLOCKED — scaffold mínimo; flow inerte único se asignaría aquí |
| User A | `phdk-auto-user-a-20261017` | A | BLOCKED — rol regular únicamente; sin invitación/email |
| Browser device A | `phdk-auto-device-a-20261017` | A | BLOCKED — sin pairing ni credenciales |
| Tenant B | `phdk-auto-tenant-b-20261017` | — | BLOCKED — falta vía autenticada/auditada de creación y cleanup |
| Brand B | `phdk-auto-brand-b-20261017` | B | BLOCKED — scaffold mínimo para asignación de team; sin catálogo global |
| Team B | `phdk-auto-team-b-20261017` | B | BLOCKED — scaffold mínimo para tenant isolation; no se crea un segundo flow |
| User B | `phdk-auto-user-b-20261017` | B | BLOCKED — rol regular únicamente; sin invitación/email |
| Browser device B | `phdk-auto-device-b-20261017` | B | BLOCKED — sin pairing ni credenciales |
| Flow inerte | `phdk-auto-flow-a-20261017` | A / Team A | BLOCKED — único flow autorizado; prohibidos PII y side effects; no demuestra la dirección inversa B→flow propio |
| DNS/CRM sandbox | No asignada | Por tenant | BLOCKED — no hay hostname/puerto/esquema/CIDR sandbox aprobados |
| Secretos/tokens | Ninguno | — | No solicitar, crear ni registrar en evidencia |

## Ciclo de vida

- Solo un operador autorizado ya existente, mediante consola first-party normal y auditada; no se crean cuentas privilegiadas para este run.
- Prefijo/run ID obligatorio, idempotencia por run, expiración máxima 24 horas y cleanup inmediato al terminar.
- Cleanup desactiva/revoca solo IDs de este run y verifica acceso/login y comandos denegados; la auditoría append-only se conserva según retención vigente.
- No se permiten escrituras directas a BD, rutas públicas de seed, auth bypass, invitaciones, clientes activos, llamadas a Genesys/Salesforce/CallPicker, CRM real, redes privadas de cliente ni hosts metadata.

El registro de producción permanece vacío para este manifiesto. No se aprovisionaron filas, usuarios, tenants, devices o URLs CRM.
