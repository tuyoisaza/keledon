## Revalidación vigente CMT-003C — 5.2.6 (2026-10-17)

### UAT-130 readiness — candidate v5.2.7 / CMT-002

Source review found the Landing diagnostics builder emitted the configured API and OAuth hostnames. The candidate now withholds them on both public surfaces. After PR merge and observed production deployment, the permitted acceptance is an anonymous public copy action's visible accessible success/failure status only; do not read/collect clipboard contents. No credentials, private CRM/network destination, customer data, local app test, or build is part of this case. Browser access proceeds only after the exact deployed candidate and active production UAT readiness are recorded in `50-uat/UAT_ACCESS_REPORT.md`.

Remote `main` ahora es `7969fc87d3d5dc9f65a9a198d0f7a504577c7252` tras PR #246 (documentación únicamente); Railway Web/API #246 `SUCCESS`, source de producto sin cambio.

El reporte 5.2.4 que sigue se conserva como historial de Prep previo.

**Estado: BLOCKED** para UAT autenticada del runtime; **PARTIAL** para preparación. Producto 5.2.6 source `e7257a7d0c66c8b34e6bbb7028c30be092f33102`. Main `9d34bb82b67e62457fd9333d4ca5e3d5ba7d8c12`; PR #244/#245 son solo documentación. Railway Web `b3dd466a-5c1a-40a9-ac99-c032cfaa6d32` y API `430a4bd6-4d9f-4b32-89c9-10501c617df1` SUCCESS para deploy documental #245; versión de producto no cambió.

| Caso / rol | Estado | Razón/evidencia |
|---|---|---|
| Visitante público | PASS SCOPED | UAT-125/126 targets móviles; UAT-127/128 AX presence; UAT-129 orden/foco público en producción. No prueba autenticación ni runtime queue. |
| Usuarios/tenants A y B | BLOCKED | No hay fixtures sintéticos productivos provisionados ni camino autorizado de cleanup. |
| Browser devices / leases | BLOCKED | Sin pairings; claim actual no tiene lease durable/fencing; caso se ejecutará solo con candidato corregido. |
| CRM privado/DNS | BLOCKED | Sin sandbox DNS/CRM sintético ni hostname/puerto/CIDR aprobados; fuente no fija la IP al socket. |
| Secreto/credenciales | N/A | No se solicitaron ni expusieron. |
| Tests/builds locales de aplicación | NOT RUN — instrucción del owner | No usar suites o builds locales como evidencia de aceptación. |
| Escrituras de DB/CRM o pruebas autenticadas de runtime en esta revalidación | NOT RUN | No se creó cuenta/tenant/device ni se tocó CRM/DB; UAT público CMT-002 (UAT-127–129) está registrado por separado. |

El plan, matriz, manifiesto y PIA CMT-003C están listos para retomar con el camino autorizado de provisión/cleanup. No se afirma que los fixtures existan ni que la feature haya sido aceptada. CMT-003A/B siguen PARTIAL y el Auto total continúa PARCIALMENTE ENTREGADO.

# Reporte UAT Prep — KELEDON 5.2.4

**Estado: PARTIAL / BLOCKED.** Candidato Web de producto 5.2.4, main `6715ea986bf9058b8f7d50edae1efe2ed4f65b81`; PHDK 2.53.1. Railway Web/API ambos `SUCCESS` sobre main `6715ea9`; esto no acepta el comportamiento autenticado ni los contratos API. UAT-120 solo cubre locale/`lang` público en `/login`.

## Trabajo de Prep

- Revisado el PIA CMT-003A y la implementación `services/api/src/browser-commands/browser-commands.service.ts`: el claim escribe `browser.command.claimed`; `findNextPendingCommand` excluye para siempre todo comando con claim y no existe TTL, heartbeat, intento o lease durable. La recepción de resultados evita duplicados a posteriori, no idempotencia de side effects externos.
- Revisión estática de `services/api/scripts/uat-prep-companyco.ts` y `.policy.cjs`: el comando confirma exclusivamente PostgreSQL `keledon_phdk_uat` en `127.0.0.1`/`localhost`/`::1`, exige confirmación explícita y deployment `development` o `test`; rechaza production/staging y hosts remotos. Por tanto, no ofrece provisión en Railway. El script tiene un fixture `superadmin` de desarrollo, seis cuentas fijas, sin pairing de Browser device ni CRM sandbox y cleanup con retención de auditoría; no se ejecutó ni se debe debilitar para producción.
- La norma de ejecución del usuario prohíbe app tests/builds locales; no se ejecutó ningún test/build. No hay identidad sintética, tenant, dispositivo ni sandbox productivo disponible. No se usó la identidad del propietario ni se crearon filas/cuentas.
- `phdk-standards/PHDK_UAT_PREP.md` prohíbe identidades privilegiadas de prueba en producción y cualquier auth bypass. El pedido prod-only permite solo UAT pública anónima. No existe flujo aprobado de sandbox IdP/admin productivo, provisioning de fixtures ni cleanup que satisfaga FIXTURE-01..05; no usar el seeder loopback ni crear cuentas superadmin productivas.

| Gate | Estado | Evidencia / faltante |
|---|---|---|
| Home/widget público v5.2.6 | PARTIAL | UAT-127/128 tree presence y UAT-129 orden/foco teclado limitados; despliegues #245 SUCCESS. |
| Auth normal por rol | BLOCKED | No hay identidades sintéticas autenticables; no usar owner. |
| Tenant A/B persistente | BLOCKED | No hay tenants sintéticos ni autorización/owner de provisioning. |
| Device A/B y lease | BLOCKED | No pairing sintético ni heartbeat/recovery implementados. |
| OAuth Google | EXTERNAL/BLOCKED | Configuración y cuentas pertenecen a cada cliente. |
| CRM privado sandbox | BLOCKED | No cliente, endpoint, allowlist o side effect sintético seleccionado. |
| Cleanup/revocación | BLOCKED | No fixtures creados, no se simuló cleanup. |
| Tests/builds de app | NOT RUN BY OWNER INSTRUCTION | No se ejecutaron localmente. La aceptación autenticada/productiva no es segura ni posible hasta habilitar un mecanismo permitido de fixture sin privilegios productivos.

## Próximo gate

Mantener la extensión autenticada BLOCKED. Continuar fuentes/PIAs y UAT público. Antes de cualquier escritura de identidad/tenant/device productiva, se requiere una ruta permitida por seguridad, owner de provisioning y cleanup, y autorización explícita para ese acceso; no se solicitan contraseñas ni secretos por chat. Si la restricción PHDK de no crear identidades privilegiadas productivas permanece, usar un runtime aislado autorizado para la parte autenticada y documentar que no cumple el pedido de UAT prod-only.
