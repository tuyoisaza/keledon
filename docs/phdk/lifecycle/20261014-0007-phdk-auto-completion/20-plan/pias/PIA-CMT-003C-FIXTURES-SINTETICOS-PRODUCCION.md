# Sub-PIA CMT-003C — fixtures sintéticos para aceptación productiva

Estado: OWNER AUTHORIZED MINIMAL SYNTHETIC FIXTURE SCOPE / PROVISIONING PATH NOT READY · Prioridad: CMT-003, prerequisito para CMT-003A/B UAT · Baseline productivo KELEDON 5.2.10 en main `fd429298a85bdcf3b5c20791f9b1598c132aabcb`; el código runtime CMT-003 no cambió desde `e7257a7d0c66c8b34e6bbb7028c30be092f33102` (5.2.6). Instrucción directa del owner del 2026-10-17: crear lo necesario para continuar la meta y ejecutar toda aceptación en producción. Se registra como autorización para preparar y, al existir un canal permitido, aprovisionar y limpiar únicamente el fixture mínimo sintético definido aquí; la aceptación de alcance general no autoriza tráfico/datos de clientes.

## Hallazgo y objetivo

La revisión de fuente puede avanzar sin cuentas, pero la aceptación de cola, aislamiento tenant y egress exige actores, devices y endpoints sintéticos en el sitio productivo. No hay un CRM ni una plataforma universal: cada cliente elige su stack, y no se usará configuración, tráfico o datos de clientes existentes para representar un sandbox. El owner autorizó que las pruebas de aplicación ocurran en producción y la política del producto exige aislamiento por tenant; falta autorización concreta para crear y limpiar identidades o recursos sintéticos en el entorno productivo.

Preparar una ruta de UAT que permita ejecutar Q-LEASE-01..Q-TENANT-06 y NET-DNS-01..NET-PRIVATE-06 sobre el candidato desplegado, con resultados reproducibles, mínimos privilegios, evidencia redacted y cleanup verificable. No convertir esta PIA en un endpoint o seeder público disponible en producción.

## Contrato de preparación

1. Usar un prefijo inequívoco y fecha/run ID para dos tenants sintéticos aislados, al menos un usuario y device por tenant, un flujo sin PII y una cuenta CRM sandbox vacía. No asociar identidades reales, tokens ni tenants activos.
2. Aprovisionar con una vía administrativa existente, autenticada y auditada; no añadir ruta bypass, secreto de seed permanente, fixture por defecto ni escritura directa a la BD productiva. Registrar quién autorizó, qué IDs sintéticos se crearon, alcance y vencimiento; secretos quedan en el store seguro y nunca aparecen en evidencia.
3. Para NET-DNS-01..06, el owner aporta y aprueba hostname, puerto, esquema y CIDR exactos de un DNS/CRM sandbox controlado por KELEDON o por un entorno autorizado. El sandbox debe proveer respuestas estables/cambiantes y redirects sintéticos sin llamar hosts metadata ni redes de clientes. Si el punto real de salida no puede fijarse, ejecutar solo negativos seguros y mantener privados bloqueados.
4. Limitar los tests de cola a comandos y efectos sin datos reales; controlar concurrencia/clock mediante el harness de producción autorizado, no falsificar actor/tenant en cabeceras públicas. Las acciones CRM no idempotentes no se disparan; se valida el estado `reconciliation_required`.
5. Guardar evidencia con run ID, SHA/deployment exactos, estado/attempt/tiempo, identificadores sintéticos anonimizados, clase de IP redacted, redirects/hops y resultado. No incluir correo completo, token, URL privada, query, body, transcripción ni datos de cliente.
6. Ejecutar cleanup por el mismo límite autenticado y dejar evidencia de que tenants/devices/flows/sandbox fueron desactivados o retirados. Verificar que las identidades sintéticas ya no pueden iniciar sesión ni ejecutar comandos; conservar solo evidencia anonimizada de auditoría conforme a retención aprobada.

## Autorización del owner — 2026-10-17

- Aprobado para esta meta: dos tenants temporales aislados con prefijo/run ID `phdk-auto-uat-20261017`, un usuario sin privilegios y un device sintético por tenant, un flujo sin PII y cleanup inmediato al terminar la aceptación (límite máximo propuesto: 24 horas).
- No incluidos: identidades de prueba `admin`, `coordinator` o `superadmin`; elevación de cuentas; envío de invitaciones/email; acceso a tenant real; datos/secretos de clientes; llamada a proveedor real, red privada externa o metadata cloud.
- No hay endpoint o sesión administrativa de provisión/cleanup disponible en este run. Por eso la autorización de alcance **no** se convierte en escritura: CMT-003C permanece BLOCKED hasta que exista un camino first-party autenticado y auditado que respete la política. No crear bypass, fixture endpoint público ni escritura directa a la base productiva.
- Sin un CRM/DNS sandbox sintético controlado, solo podrán ejecutarse casos de cola/tenant sin efectos externos; casos de egress positivo permanecen BLOCKED.

## Casos de aceptación

| Caso | Resultado exigido | Canal/evidencia |
|---|---|---|
| FIXTURE-01 | La autorización identifica producción, owner, run, tenants y recursos sintéticos permitidos antes de cualquier escritura. | Artefacto firmado/aprobación auditable vinculada al UAT run. |
| FIXTURE-02 | El aprovisionamiento crea solo recursos sintéticos mínimos bajo el tenant declarado y no crea privilegios superadmin. | Producción; inventario redacted y rol verificado. |
| FIXTURE-03 | Recursos, IDs y datos no cruzan tenants; el sandbox no tiene rutas a clientes ni servicios metadata. | Producción; controles de red/tenant comprobados. |
| FIXTURE-04 | La expiración/cleanup desactiva y elimina lo desechable; la comprobación posterior niega acceso y comandos. | Producción; evidencia antes/después y auditoría sin secretos. |
| FIXTURE-05 | Repetir el run ID no duplica recursos; falla de cleanup deja el run BLOCKED y no autoriza una repetición insegura. | Producción; lectura auditada de estado, sin escritura duplicada. |

## Invariantes y límites

- El owner autorizó el alcance sintético acotado anterior; esta autorización no reemplaza el mecanismo permitido. Hasta verificar el aprovisionamiento y cleanup first-party, no realizar escrituras productivas.
- El límite explícito de `PHDK_UAT_PREP.md` sigue vigente: no aprovisionar identidades de prueba privilegiadas en producción ni crear auth bypass. Mantener aceptación de roles elevados, autenticación persistida y acciones privadas externas en BLOCKED hasta resolver una ruta que cumpla el estándar.
- No se requieren credenciales de clientes para preparar mocks/sandboxes sintéticos. No pedir ni registrar secretos en conversación; usar un flujo de alta seguro ya existente.
- No ejecutar suites, builds ni pruebas de aplicación locales. La aceptación funcional y de seguridad se ejecuta en la instancia productiva, con casos y evidencia de UAT.
- No hacer llamadas a Genesys, Salesforce, CallPicker, CRM real, hosts privados de cliente o metadata cloud. Un sandbox externo necesita owner, alcance y hostname/puerto/CIDR autorizados.
- Si no existe mecanismo administrativo seguro para aprovisionar y limpiar fixtures, preparar un diseño de UAT Prep separado y mantener las pruebas autenticadas BLOCKED; no crear un bypass para acelerar pruebas.

## Entregables y salida

UAT auth plan de producción; matriz de roles/tenants; manifiesto y run ID idempotente; paso de provisión/desactivación auditado; DNS/CRM sandbox acordado si se acepta el gate privado; cleanup y verificación; evidencia para los casos referidos; actualización de UAT_ACCESS_REPORT.md, UAT_CASES.md, UAT_REPORT.md y HANDOFF.md. CMT-003C pasa a READY solo cuando la autorización de fixture y el mecanismo administrativo/cleanup están disponibles. Hasta entonces CMT-003A/B pueden recibir cambios de fuente revisables, pero sus gates de producción siguen BLOCKED y CMT-003 no se declara completado.


## Revalidación del camino de provisión — 5.2.6 (2026-10-17)

La inspección de `services/api/scripts/uat-prep-companyco.policy.cjs` confirma que el seeder solo acepta `keledon_phdk_uat` en loopback, con confirmación explícita y env `development`/`test`; rechaza Railway/production. `uat-prep-companyco.ts` define seis cuentas estables, incluido `superadmin`, pero no crea emparejamiento Browser ni CRM/DNS sandbox. Es un mecanismo de UAT local, no la vía productiva autorizada. Se mantiene intacto porque `PHDK_UAT_PREP.md` prohíbe privilegiados de prueba y auth bypass en producción. No se ejecutó ni hubo escrituras. Para avanzar autenticación se necesita ruta segura de sandbox/IdP aprobada no productiva, lo que no satisface la preferencia prod-only, o un cambio explícito y compatible con política; ninguna vía existe hoy.
