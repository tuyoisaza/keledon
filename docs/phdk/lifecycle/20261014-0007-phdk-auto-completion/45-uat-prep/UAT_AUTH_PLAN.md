## Revalidación CMT-003C — 5.2.6 (2026-10-17)

Estado: **BLOCKED** para aceptación autenticada/cola/egress. Producto candidato: KELEDON 5.2.6, source `e7257a7d0c66c8b34e6bbb7028c30be092f33102`; PHDK 2.53.1. Remote `main` `9d34bb82b67e62457fd9333d4ca5e3d5ba7d8c12` tras PR #245 (docs/evidencia); el source desplegado no cambia.

La ruta de identidad se conserva: login normal y actor/tenant derivados por servidor desde BD. No se preparará un bypass, endpoint público de fixture, token manual, secreto de seed persistente ni alta de identidad privilegiada productiva. El owner exige pruebas de aplicación en producción; por tanto, antes de aprovisionar recursos se requiere una vía existente, auditada y autorizada que permita crear/desactivar solo fixtures sintéticos bajo prefijo/run ID y verificar su cleanup sin tocar settings del IdP ni clientes activos.

Para CMT-003A se necesitan dos tenants/devices sintéticos y un workflow inerte; para CMT-003B además un sandbox DNS/CRM aislado con hostname, puerto, esquema y CIDR exactos aprobados. No usar destinos privados encontrados en configuración o navegación de clientes. No contactar una plataforma de llamadas ni CRM real.

Entrada actual: PIA CMT-003C en `20-plan/pias/PIA-CMT-003C-FIXTURES-SINTETICOS-PRODUCCION.md`. Ninguna cuenta, token, sesión, tenant, device, CRM, llamada o dato productivo se creó/consultó en esta revalidación estática. No se ejecutan pruebas/builds locales de aplicación.

## Historial del plan — KELEDON 5.2.4

Estado: **PARTIAL / BLOCKED** · Fecha: 2026-10-17 · PHDK: 2.53.1.

## Candidato y entorno

- Candidato Web: v5.2.4, merge `6715ea986bf9058b8f7d50edae1efe2ed4f65b81`; PR #232. `main` actual: `6715ea986bf9058b8f7d50edae1efe2ed4f65b81`.
- Producción declarada: `https://keledon.tuyoisaza.com/`; latest Web `228369da-23e8-49e0-8345-2469f9fd4863` y API `367eb4ae-a101-448a-ac0a-361e7efee620` reportaron `SUCCESS` sobre main `6715ea9`. Esto no acepta comportamiento autenticado ni contratos API.
- El usuario indicó pruebas funcionales únicamente en producción y no ejecutar pruebas locales de aplicación. Se sigue esa restricción; PHDK estático y parseo/version alignment no cuentan como app tests.

## Límite de identidad y confianza

La ruta admitida para un UAT autenticado es el login normal del producto y autorización derivada por API de identidad/rol/tenant persistidos. No se fabrican tokens, no se suplanta actor, no se usa UI de rol simulada como autenticación ni se activa un test adapter en producción. OAuth/Google se excluye porque depende de cada proveedor de cliente.

El seeder `uat-prep-companyco` solo acepta DB PostgreSQL `keledon_phdk_uat` por loopback y env development/test; rechaza production/staging y contiene fixture superadmin local. No hay identidades, tenants ni devices sintéticos productivos disponibles ni mecanismo permitido para crearlos. La norma [`PHDK_UAT_PREP.md`](../../../../../phdk-standards/PHDK_UAT_PREP.md) prohíbe provisionar identidades de prueba privilegiadas en producción; el usuario autorizó el entorno de pruebas, pero todavía no autorizó la expansión concreta de acceso ni existe owner de provisioning/cleanup asignado. Por ello Prep no provisiona usuarios, cambia roles, escribe configuración del IdP ni toca datos live.

## Plan de prueba cuando exista fixture autorizado

1. Obtener por canal seguro y con owner asignado seis identidades sintéticas independientes: plataforma `superadmin`; tenant A `admin`, `coordinator`, `agent` y `user`; tenant B `user`. No se pega ninguna credencial en chat ni evidencia.
2. Crear dos tenants ficticios con marcador único de run, sin CRM real, datos de clientes, invitaciones ni llamadas. Para CMT-003A, registrar un Browser device sintético por tenant sin permisos de audio.
3. Ejecutar aceptación solo en UI/API de producción contra las entidades sintéticas; capturar IDs sintéticos, estados y tiempos redacted. Nada de transcripciones, cookies, tokens, payloads completos o endpoints CRM.
4. Revocar sesiones/cuentas y retirar solo records con marcador del run por el owner; verificar acceso revocado y dejar auditoría append-only intacta.

## Gate

**BLOCKED:** no usar el login del propietario ni crear identidades privilegiadas en producción. Se puede seguir haciendo UAT público anónimo. Para aceptar UAT autenticado hacen falta identidades/tenants/devices sintéticos preparados por su owner en un destino permitido, plan de limpieza verificado y evidencia de autorización de acceso; si se mantiene la prohibición de producción, usar únicamente ese destino aislado para pruebas autenticadas, dejando claro que no sustituye la aceptación prod-only solicitada.
