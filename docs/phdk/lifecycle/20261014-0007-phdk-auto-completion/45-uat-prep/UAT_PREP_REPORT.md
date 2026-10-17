# Reporte UAT Prep — KELEDON 5.2.3

**Estado: PARTIAL / BLOCKED.** Candidato Web de producto 5.2.3 source `3cccb4b2f88828fa5d273b682925d3a106dd3b9`; PHDK 2.53.1; main actual `85d792321445da6ba6a744e79d7128fed8717d3d`. Railway Web/API ambos `SUCCESS` sobre main `85d7923`; esto no acepta el comportamiento autenticado ni los contratos API.

## Trabajo de Prep

- Revisado el PIA CMT-003A y la implementación `services/api/src/browser-commands/browser-commands.service.ts`: el claim escribe `browser.command.claimed`; `findNextPendingCommand` excluye para siempre todo comando con claim y no existe TTL, heartbeat, intento o lease durable. La recepción de resultados evita duplicados a posteriori, no idempotencia de side effects externos.
- Revisada la regla existente del seeder `services/api/scripts/uat-prep-companyco.ts`: exige destino loopback no productivo y no se fuerza ni ejecuta contra Railway.
- La norma de ejecución del usuario prohíbe app tests/builds locales; no se ejecutó ningún test/build. No hay identidad sintética, tenant, dispositivo ni sandbox productivo disponible. No se usó la identidad del propietario ni se crearon filas/cuentas.
- `PHDK_UAT_PREP.md` prohíbe provisionar identidades privilegiadas de producción. El site prod-only permite UAT público; no alcanza para probar claims, RBAC ni aislamiento entre tenants sin ampliar acceso y crear fixtures.

| Gate | Estado | Evidencia / faltante |
|---|---|---|
| Home/widget público v5.2.3 | PARTIAL | UAT-117; solo estado de copia y contrato de hostnames. |
| Auth normal por rol | BLOCKED | No hay identidades sintéticas autenticables; no usar owner. |
| Tenant A/B persistente | BLOCKED | No hay tenants sintéticos ni autorización/owner de provisioning. |
| Device A/B y lease | BLOCKED | No pairing sintético ni heartbeat/recovery implementados. |
| OAuth Google | EXTERNAL/BLOCKED | Configuración y cuentas pertenecen a cada cliente. |
| CRM privado sandbox | BLOCKED | No cliente, endpoint, allowlist o side effect sintético seleccionado. |
| Cleanup/revocación | BLOCKED | No fixtures creados, no se simuló cleanup. |
| Tests/builds de app | NOT RUN BY OWNER INSTRUCTION | No se ejecutaron localmente. Aceptación funcional solo tras desplegar un candidato y usar los fixtures permitidos. |

## Próximo gate

Mantener la extensión autenticada BLOCKED. Continuar fuentes/PIAs y UAT público. Antes de cualquier escritura de identidad/tenant/device productiva, se requiere una ruta permitida por seguridad, owner de provisioning y cleanup, y autorización explícita para ese acceso; no se solicitan contraseñas ni secretos por chat. Si la restricción PHDK de no crear identidades privilegiadas productivas permanece, usar un runtime aislado autorizado para la parte autenticada y documentar que no cumple el pedido de UAT prod-only.
