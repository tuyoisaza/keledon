# Sub-PIA CMT-003C — fixtures sintéticos para aceptación productiva

Estado: OWNER AUTHORIZED MINIMAL SYNTHETIC FIXTURE SCOPE / PROVISIONING PATH NOT READY · Prioridad: CMT-003, prerequisito para aceptación productiva de CMT-003A/B · Producto KELEDON 5.2.10, source `fd429298a85bdcf3b5c20791f9b1598c132aabcb`; main documental antes de este update `357cc5074da94741b4717404f2b588a6daa8755d`. El código runtime CMT-003 no cambió desde `e7257a7d0c66c8b34e6bbb7028c30be092f33102` (5.2.6). PHDK 2.53.1, upstream `94f583635d295ae0f227726718904d952cadb8ab`, coherence 64/64. La instrucción del owner autoriza preparar y, cuando haya un canal permitido, provisionar y limpiar solo el fixture sintético mínimo descrito aquí; no autoriza tráfico ni datos de clientes.

## Hallazgo y objetivo

La revisión de fuente puede avanzar sin cuentas, pero la aceptación de cola, aislamiento tenant y egress exige actores, devices y endpoints sintéticos en el sitio productivo. No hay un CRM ni una plataforma universal: cada cliente elige su stack, y no se usará configuración, tráfico o datos de clientes existentes para representar un sandbox. El owner ya autorizó el alcance mínimo de fixtures y las pruebas de aplicación en producción; falta un canal de provisioning/cleanup first-party, autenticado y auditado que respete esa política.

Preparar una ruta de UAT que permita ejecutar Q-LEASE-01..Q-TENANT-06 y NET-DNS-01..NET-PRIVATE-06 sobre el candidato desplegado, con resultados reproducibles, mínimos privilegios, evidencia redacted y cleanup verificable. No convertir esta PIA en un endpoint o seeder público disponible en producción.

## Contrato de preparación

1. Usar un prefijo inequívoco y fecha/run ID para dos tenants sintéticos aislados, un usuario `user` y un Browser device por tenant, una Brand y un Team mínimos por tenant para las relaciones del modelo, y un solo flow inerte sin PII asignado al Team A. La Team B existe para asignación/aislamiento, pero no se crea un segundo flow. No asociar identidades reales, tokens, tenants activos, CRM ni endpoints externos. CRM/DNS sandbox requiere un alcance y destino sintético aprobados por separado.
2. Aprovisionar con una vía administrativa existente, autenticada y auditada; no añadir ruta bypass, secreto de seed permanente, fixture por defecto ni escritura directa a la BD productiva. Registrar quién autorizó, qué IDs sintéticos se crearon, alcance y vencimiento; secretos quedan en el store seguro y nunca aparecen en evidencia.
3. Para NET-DNS-01..06, el owner aporta y aprueba hostname, puerto, esquema y CIDR exactos de un DNS/CRM sandbox controlado por KELEDON o por un entorno autorizado. El sandbox debe proveer respuestas estables/cambiantes y redirects sintéticos sin llamar hosts metadata ni redes de clientes. Si el punto real de salida no puede fijarse, ejecutar solo negativos seguros y mantener privados bloqueados.
4. Limitar los tests de cola a comandos y efectos sin datos reales; controlar concurrencia/clock mediante el harness de producción autorizado, no falsificar actor/tenant en cabeceras públicas. Las acciones CRM no idempotentes no se disparan; se valida el estado `reconciliation_required`.
5. Guardar evidencia con run ID, SHA/deployment exactos, estado/attempt/tiempo, identificadores sintéticos anonimizados, clase de IP redacted, redirects/hops y resultado. No incluir correo completo, token, URL privada, query, body, transcripción ni datos de cliente.
6. Ejecutar cleanup por el mismo límite autenticado y dejar evidencia de que tenants/devices/flows/sandbox fueron desactivados o retirados. Verificar que las identidades sintéticas ya no pueden iniciar sesión ni ejecutar comandos; conservar solo evidencia anonimizada de auditoría conforme a retención aprobada.

## Autorización del owner — 2026-10-17

- Aprobado para esta meta: dos tenants temporales aislados con prefijo/run ID `phdk-auto-uat-20261017`, un usuario sin privilegios y un device sintético por tenant, un flujo sin PII y cleanup inmediato al terminar la aceptación (límite máximo propuesto: 24 horas). La lectura actual del esquema precisa solo las dependencias estructurales mínimas: una Brand y un Team por tenant; el único flow se asigna a Team A. No se amplía la cantidad de flows aprobada ni se incluye CRM/DNS sandbox, host o egress en este run.
- No incluidos: identidades de prueba `admin`, `coordinator` o `superadmin`; elevación de cuentas; envío de invitaciones/email; acceso a tenant real; datos/secretos de clientes; llamada a proveedor real, red privada externa o metadata cloud.
- Hay CRUD administrativo normal en fuente, pero no se preparó sesión en este run y no se verificó un ciclo completo de identidad/login, device/flow, auditoría durable y cleanup reversible. Por eso la autorización de alcance **no** se convierte en escritura: CMT-003C permanece BLOCKED hasta cerrar PIA-CMT-003C1. No crear bypass, fixture endpoint público ni escritura directa a la base productiva.
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


## Revalidación del camino de provisión — 5.2.6 (histórico, 2026-10-17)

La inspección de `services/api/scripts/uat-prep-companyco.policy.cjs` confirma que el seeder solo acepta `keledon_phdk_uat` en loopback, con confirmación explícita y env `development`/`test`; rechaza Railway/production. `uat-prep-companyco.ts` define seis cuentas estables, incluido `superadmin`, pero no crea emparejamiento Browser ni CRM/DNS sandbox. Es un mecanismo de UAT local, no la vía productiva autorizada. Se mantiene intacto porque `PHDK_UAT_PREP.md` prohíbe privilegiados de prueba y auth bypass en producción. No se ejecutó ni hubo escrituras. Para avanzar autenticación se necesita ruta segura de sandbox/IdP aprobada no productiva, lo que no satisface la preferencia prod-only, o un cambio explícito y compatible con política; ninguna vía existe hoy.

## Revalidación vigente — KELEDON 5.2.10 / PHDK 2.53.1 (2026-10-17)

El baseline productivo ahora es 5.2.10 y UAT-140 ya aceptó de forma acotada la localización del 404 en producción anónima. El despliegue documental posterior al PR #256 quedó SUCCESS en Web `7724c95e-84e8-4923-8f76-6c0a0151ff49` y API `abb17a83-2de2-470b-86da-3bf3397ca5f9`; esto no acepta sesiones autenticadas, cola, devices ni egress.

La autorización vigente cubre dos tenants sintéticos temporales, un usuario sin privilegios y un device por tenant, un flujo inerte sin side effects externos y cleanup inmediato (límite máximo 24 horas). El esquema exige una Brand y un Team por tenant para anclar usuarios/flows; se mantienen como scaffolding sintético. El único flow aprobado se vincula a Team A. Aceptar en ambos sentidos una pareja de flows requeriría autorizar un segundo flow; no se presume esa autorización. Se excluyen cuentas de prueba admin/coordinator/superadmin, elevación, invitaciones/email, clientes activos, credenciales de clientes, llamadas reales y redes privadas externas.

La revisión estática encontró pantallas CRUD normales de empresas/usuarios y rutas bajo el AuthGuard global más `CrudAccessGuard`, que resuelve el actor/rol desde la BD. No constituye aún un ciclo de fixtures aceptable: el `AuditInterceptor` intenta persistir el evento de CRUD en forma asíncrona después de responder y no hace fallar la mutación si falla la escritura de auditoría; `deleteCompany` borra directamente el registro; el usuario creado por CRUD no configura por sí solo una identidad autenticable; y el test-as UAT está limitado a development/staging y excluye production. Detalle y alcance de remedio: [PIA-CMT-003C1](PIA-CMT-003C1-PROVISIONING-AUDITADO.md). La PIA sigue BLOCKED hasta que exista una vía first-party autenticada, con auditoría durable y cleanup reversible/idempotente.

El siguiente paso es resolver PIA-CMT-003C1 mediante revisión de fuente/seguridad y definir una ruta aceptable de identidad regular con login normal. Hasta entonces, no ejecutar UAT autenticado; CMT-003A/B pueden avanzar en revisión de fuente, con aceptación productiva bloqueada. Las pruebas de aplicación continúan exclusivamente en producción; no se ejecutan tests/builds/lint locales.
