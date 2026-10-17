# Reporte UAT Prep — CMT-003C / KELEDON 5.2.10

Fecha: 2026-10-17 · **PARTIAL / BLOCKED** · meta PHDK Auto: **PARTIALLY DELIVERED**.

## Resultado

Se actualizaron los artefactos de preparación al baseline de producto 5.2.10 y se acotó la matriz a los dos usuarios regulares y dos devices aprobados. El scope de provisioning mínimo está autorizado por el owner en la PIA CMT-003C. La fuente sí ofrece CRUD normal de empresas/usuarios con auth y guards de rol/tenant, pero no se encontró un camino completo que incluya login sintético normal, device/flow, auditoría durable previa a cada mutación y cleanup reversible/idempotente. Se creó [PIA-CMT-003C1](../20-plan/pias/PIA-CMT-003C1-PROVISIONING-AUDITADO.md) para revisar ese remedio. No se elevó el estado a READY y no se hizo ninguna escritura productiva.

Producto source: `fd429298a85bdcf3b5c20791f9b1598c132aabcb`; main documental antes de este update `357cc5074da94741b4717404f2b588a6daa8755d`. PHDK 2.53.1, upstream `94f583635d295ae0f227726718904d952cadb8ab`; chequeo estático PASS, 64 mappings. Railway Web `7724c95e-84e8-4923-8f76-6c0a0151ff49` y API `abb17a83-2de2-470b-86da-3bf3397ca5f9`: SUCCESS, 1/1; despliegue documental, sin cambio de runtime del producto. UAT-140 PASS_SCOPED: 404 anónimo localizado en producción, sin sesión.

## Revisión de preparación

- La PIA CMT-003C mantiene dos tenants sintéticos, un `user` y un device por tenant, un flow inerte y cleanup inmediato con máximo de 24 h; excluye roles privilegiados, invitaciones/email, clientes activos, proveedores de llamada y CRM real. La lectura vigente de Prisma añade una Brand y un Team estructural por tenant para asociar usuarios/flows; el único flow autorizado queda en Team A. No se amplía a un segundo flow.
- El seeder `uat-prep-companyco` está limitado a DB `keledon_phdk_uat` por loopback en desarrollo/test y rechaza producción/staging. Su fixture local incluye superadmin; no se ejecutó ni se modificó esa protección. El test-as existente excluye production; no se alteró su guard ni se leyeron variables de proveedor.
- Fuente: `/management/companies` y `/management/users` llaman al CRUD autenticado. `AuthGuard` y `CrudAccessGuard` comprueban la identidad/rol desde BD; el `AuditInterceptor` intenta registrar CREATE/DELETE de forma asíncrona y no bloqueante. `deleteCompany` borra directamente, así que no es un cleanup seguro por run.
- No se usó la identidad habitual del owner, sesión no entregada, token, datos de clientes, base de datos, IdP, CRM, llamada o red privada. No se ejecutaron pruebas/builds/lint locales de aplicación.
- La revisión del navegador se limita a la UAT pública autorizada ya registrada; no se intentó iniciar sesión ni abrir una superficie administrativa.

| Gate | Estado | Evidencia / faltante |
|---|---|---|
| PHDK coherencia | PASS estático | PHDK 2.53.1, 64 mappings; bloque `PHDK-MANAGED` coincide con canonical |
| UAT público 404 localizado | PASS_SCOPED | UAT-140 y su evidencia; no cubre autenticación |
| Provisioning fixture mínimo | BLOCKED | Falta canal administrativo existente y auditado disponible para el run |
| Brand/Team mínimo por tenant | BLOCKED | Requeridos por las relaciones `Company → Brand → Team`; solo scaffolding sintético, no catálogo global |
| Tenant A/B, user y devices | BLOCKED | No hay recursos sintéticos aprovisionados |
| Aislamiento simétrico de flows A/B | BLOCKED | La aprobación actual contiene un flow en A; el flow propio de B exigiría un segundo fixture |
| Queue/lease/fencing | BLOCKED para aceptación | Requiere identities/devices sintéticos y candidato runtime desplegado |
| DNS/CRM privado positivo | BLOCKED | Sin sandbox sintético aprobado por tenant con host/port/esquema/CIDR |
| Cleanup/expiración | BLOCKED | No se puede probar sin fixture y acción de cleanup disponible |
| Tests/builds/lint locales de app | NOT RUN | Instrucción del owner; solo producción sirve para acceptance funcional |

## Siguiente paso exacto

Revisar PIA-CMT-003C1 y decidir el camino de identidad sintética normal controlada por KELEDON. Si el flujo admin existente no cubre login, auditoría durable y cleanup reversible, la implementación queda detrás de una revisión de seguridad antes de tocar auth/admin. Hasta entonces CMT-003C sigue BLOCKED; CMT-003A/B admiten revisión de fuente, pero no aceptación autenticada/egress. Ningún secreto o contraseña se necesita por chat.
