# Plan de autenticación UAT — KELEDON 5.2.3

Estado: **PARTIAL / BLOCKED** · Fecha: 2026-10-17 · PHDK: 2.53.1.

## Candidato y entorno

- Candidato Web: v5.2.3, source merge `3cccb4b2f88828fa5d273b682925d3a106dd3b9`; PR #229. `main` documental actual: `85d792321445da6ba6a744e79d7128fed8717d3d`.
- Producción declarada: `https://keledon.tuyoisaza.com/`; Web para el código #229 informó `SUCCESS` en `3e168f0c-50b9-4ebb-b3c1-0cd5bd81b2a7`. API quedó `BUILDING` en los últimos readbacks; no se afirma acceptance API.
- El usuario indicó pruebas funcionales únicamente en producción y no ejecutar pruebas locales de aplicación. Se sigue esa restricción; PHDK estático y parseo/version alignment no cuentan como app tests.

## Límite de identidad y confianza

La ruta admitida para un UAT autenticado es el login normal del producto y autorización derivada por API de identidad/rol/tenant persistidos. No se fabrican tokens, no se suplanta actor, no se usa UI de rol simulada como autenticación ni se activa un test adapter en producción. OAuth/Google se excluye porque depende de cada proveedor de cliente.

No hay identidades, tenants ni devices sintéticos de producción disponibles. La norma [`PHDK_UAT_PREP.md`](../../../../../phdk-standards/PHDK_UAT_PREP.md) prohíbe provisionar identidades de prueba privilegiadas en producción; el usuario autorizó el entorno de pruebas, pero todavía no autorizó la expansión concreta de acceso ni existe owner de provisioning/cleanup asignado. Por ello Prep no provisiona usuarios, cambia roles, escribe configuración del IdP ni toca datos live.

## Plan de prueba cuando exista fixture autorizado

1. Obtener por canal seguro y con owner asignado seis identidades sintéticas independientes: plataforma `superadmin`; tenant A `admin`, `coordinator`, `agent` y `user`; tenant B `user`. No se pega ninguna credencial en chat ni evidencia.
2. Crear dos tenants ficticios con marcador único de run, sin CRM real, datos de clientes, invitaciones ni llamadas. Para CMT-003A, registrar un Browser device sintético por tenant sin permisos de audio.
3. Ejecutar aceptación solo en UI/API de producción contra las entidades sintéticas; capturar IDs sintéticos, estados y tiempos redacted. Nada de transcripciones, cookies, tokens, payloads completos o endpoints CRM.
4. Revocar sesiones/cuentas y retirar solo records con marcador del run por el owner; verificar acceso revocado y dejar auditoría append-only intacta.

## Gate

**BLOCKED:** no usar el login del propietario ni crear identidades privilegiadas en producción. Se puede seguir haciendo UAT público anónimo. Para aceptar UAT autenticado hacen falta identidades/tenants/devices sintéticos preparados por su owner en un destino permitido, plan de limpieza verificado y evidencia de autorización de acceso; si se mantiene la prohibición de producción, usar únicamente ese destino aislado para pruebas autenticadas, dejando claro que no sustituye la aceptación prod-only solicitada.
