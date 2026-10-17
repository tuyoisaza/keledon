## Revalidación vigente CMT-003C — 5.2.6 (2026-10-17)

El reporte 5.2.4 que sigue se conserva como historial de Prep previo.

**Estado: BLOCKED** para UAT autenticada del runtime; **PARTIAL** para la preparación documental. Candidato de producto: 5.2.6 / `e7257a7d0c66c8b34e6bbb7028c30be092f33102`; Railway Web/API SUCCESS está registrado para ese source. El merge documental #242 mueve remote `main` a `269b0717`, sin cambiar el candidato de producto.

| Caso / rol | Estado | Razón/evidencia |
|---|---|---|
| Visitante público | REUSED / PASS dentro de UAT-125/126 | Solo geometría anónima pública; no prueba autenticación ni runtime queue. |
| Usuarios/tenants A y B | BLOCKED | No hay fixtures sintéticos productivos provisionados ni camino autorizado de cleanup. |
| Browser devices / leases | BLOCKED | Sin pairings; claim actual no tiene lease durable/fencing; caso se ejecutará solo con candidato corregido. |
| CRM privado/DNS | BLOCKED | Sin sandbox DNS/CRM sintético ni hostname/puerto/CIDR aprobados; fuente no fija la IP al socket. |
| Secreto/credenciales | N/A | No se solicitaron ni expusieron. |
| Tests/builds locales de aplicación | NOT RUN — instrucción del owner | No usar suites o builds locales como evidencia de aceptación. |
| Escrituras o pruebas en producción en esta revalidación | NOT RUN | No se creó cuenta/tenant/device ni se tocó CRM/DB; esta sesión fue lectura de fuente y documentación. |

El plan, matriz, manifiesto y PIA CMT-003C están listos para retomar con el camino autorizado de provisión/cleanup. No se afirma que los fixtures existan ni que la feature haya sido aceptada. CMT-003A/B siguen PARTIAL y el Auto total continúa PARCIALMENTE ENTREGADO.

# Reporte UAT Prep — KELEDON 5.2.4

**Estado: PARTIAL / BLOCKED.** Candidato Web de producto 5.2.4, main `6715ea986bf9058b8f7d50edae1efe2ed4f65b81`; PHDK 2.53.1. Railway Web/API ambos `SUCCESS` sobre main `6715ea9`; esto no acepta el comportamiento autenticado ni los contratos API. UAT-120 solo cubre locale/`lang` público en `/login`.

## Trabajo de Prep

- Revisado el PIA CMT-003A y la implementación `services/api/src/browser-commands/browser-commands.service.ts`: el claim escribe `browser.command.claimed`; `findNextPendingCommand` excluye para siempre todo comando con claim y no existe TTL, heartbeat, intento o lease durable. La recepción de resultados evita duplicados a posteriori, no idempotencia de side effects externos.
- Revisada la regla existente del seeder `services/api/scripts/uat-prep-companyco.ts`: exige destino loopback no productivo y no se fuerza ni ejecuta contra Railway.
- La norma de ejecución del usuario prohíbe app tests/builds locales; no se ejecutó ningún test/build. No hay identidad sintética, tenant, dispositivo ni sandbox productivo disponible. No se usó la identidad del propietario ni se crearon filas/cuentas.
- `PHDK_UAT_PREP.md` prohíbe provisionar identidades privilegiadas de producción. El site prod-only permite UAT público; no alcanza para probar claims, RBAC ni aislamiento entre tenants sin ampliar acceso y crear fixtures.

| Gate | Estado | Evidencia / faltante |
|---|---|---|
| Home/widget público v5.2.4 | PARTIAL | UAT-117/120; solo estado de copia, contrato de hostnames y metadatos de idioma en login. |
| Auth normal por rol | BLOCKED | No hay identidades sintéticas autenticables; no usar owner. |
| Tenant A/B persistente | BLOCKED | No hay tenants sintéticos ni autorización/owner de provisioning. |
| Device A/B y lease | BLOCKED | No pairing sintético ni heartbeat/recovery implementados. |
| OAuth Google | EXTERNAL/BLOCKED | Configuración y cuentas pertenecen a cada cliente. |
| CRM privado sandbox | BLOCKED | No cliente, endpoint, allowlist o side effect sintético seleccionado. |
| Cleanup/revocación | BLOCKED | No fixtures creados, no se simuló cleanup. |
| Tests/builds de app | NOT RUN BY OWNER INSTRUCTION | No se ejecutaron localmente. Aceptación funcional solo tras desplegar un candidato y usar los fixtures permitidos. |

## Próximo gate

Mantener la extensión autenticada BLOCKED. Continuar fuentes/PIAs y UAT público. Antes de cualquier escritura de identidad/tenant/device productiva, se requiere una ruta permitida por seguridad, owner de provisioning y cleanup, y autorización explícita para ese acceso; no se solicitan contraseñas ni secretos por chat. Si la restricción PHDK de no crear identidades privilegiadas productivas permanece, usar un runtime aislado autorizado para la parte autenticada y documentar que no cumple el pedido de UAT prod-only.
