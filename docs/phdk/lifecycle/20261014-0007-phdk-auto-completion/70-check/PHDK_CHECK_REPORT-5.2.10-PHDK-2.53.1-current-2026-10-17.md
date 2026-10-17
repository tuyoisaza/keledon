# Revalidación PHDK Check — KELEDON 5.2.10 / PHDK 2.53.1

Fecha: 2026-10-17. Revalidación del `main` remoto `edd18be5dd8fd2c49c866f9006ee0f408642e9b4`, producción Railway y PIAs abiertos. Es un delta de gobierno/coherencia al corte 5.2.10; no acredita la meta completa ni una aceptación autenticada.

## Baseline y evidencia

- `origin/main`: `edd18be5dd8fd2c49c866f9006ee0f408642e9b4`; la fuente de producto continúa en 5.2.10, con PHDK 2.53.1 y 64/64 mappings estáticos.
- Railway producción usa `main` y no tiene cambios staged. API `02ce9322-a9eb-4bb5-9935-e041b767c18a` y Web `cb925cdb-413b-420d-95c2-2cdf6047ffc5` reportan `SUCCESS`, 1/1, ambos desde `edd18be5`. PostgreSQL, Qdrant y Speaches reportan `SLEEPING`; no se despertaron ni se modificaron servicios.
- GitHub reporta cero workflows visibles habilitados y el repo no contiene `.github/workflows`. La última ejecución histórica consultada es `Version Bump`, fallida el 2026-09-29: https://github.com/tuyoisaza/keledon/actions/runs/36600654277. `main` no tiene branch protection. No se cambiaron workflows ni controles.
- Auditoría local de higiene automática: `findings: []`, pero `remote_state: UNVERIFIED` por separado. Auditoría de tema: `STATIC_PASS`, sin hallazgos, con `runtime_verified: false`.
- El inventario físico de esta rama incluye 1,230 archivos de aplicación/pruebas TS/TSX/JS/JSX/HTML/CSS/MJS/CJS/Vue; cero llegan al límite PHDK de 600 líneas. Se excluyeron dependencias, builds, documentación/snapshots y estándares vendorizados.
- PR #258 y #259 siguen abiertos, mergeables y sin decisión de review ni checks reportados. #258 contiene PIAs/documentación de fixture; #259 propone remediación de targets de login para 5.2.11. Ninguno está desplegado ni se afirma aceptado.
- `PHDK_DELIVERY_EVIDENCE.json` se reconcilió al baseline 5.2.10/2.53.1, SHA/tree remoto y deployments actuales. Conserva `whole_auto_acceptance: PARTIAL` y casos no aceptados como `PARTIAL`; no se ejecutó ni se pretende pasar el completion gate.
- No se ejecutaron pruebas, build ni lint locales de la aplicación. La aceptación funcional continúa siendo en producción, según instrucción del owner.

## Resultado y alcance

**PHDK estático: PASS; Gobierno remoto: GAP/UNVERIFIED; meta PHDK Auto: PARTIAL.** La inspección estática no demuestra salud de UI, accesibilidad, facturación, restart history, despliegue Landing, CI protegido ni operaciones de tenant. La falta de workflows y protección de `main` queda documentada como hallazgo, no se “corrige” con automatización nueva sin una PIA y review separados.

## Automation and Cost Hygiene

- **Responsable/procedencia:** settings leídos del repositorio GitHub `tuyoisaza/keledon` y del proyecto Railway KELEDON producción mediante APIs de solo lectura; ningún cambio de proveedor.
- **GitHub:** Actions está habilitado y permite todas las acciones; SHA pinning requerido es `false`. No hay workflows, webhooks de repo ni rulesets; el endpoint de protección de `main` devuelve 404. No hay checks para los PR #258/#259. La última ejecución histórica consultada, `Version Bump` (`36600654277`), falló el 2026-09-29.
- **Railway:** API y Web siguen conectados a `main`, sin staged changes; ambos desplegaron `edd18be5` con `SUCCESS` y una réplica. `checkSuites=false`, sleep habilitado y no se observan servicios cron. El auto-deploy desde GitHub está activo, demostrado por el deployment del nuevo commit. La política de espera por CI, historial de reinicios, coste facturado, presupuesto/límites de gasto no quedan expuestos por la lectura disponible.
- **Riesgo/severidad:** MEDIUM para cambios sin branch protection/review/check obligatorio; MEDIUM y UNVERIFIED para gasto y restart, porque no hay lectura de facturación/historial. La ejecución fallida de Version Bump es histórica y no hay bot/workflow activo actualmente.
- **Remediación/tipo:** action de owner/administrador de proveedores para decidir ruleset/review requerida, allowlist/SHA pinning de Actions, Wait-for-CI y límites de gasto/restart. El agente no cambia settings externos. No se propone crear pipelines nuevos sin acordar runtime/checks compatibles con la regla de pruebas productivas.

## Tema y editor de templates

La configuración fuente `phdk-theme.config.json` declara `shared/theme-tokens.css`, los selectores `:root[data-keledon-theme="light|dark|corporate"]`, la ruta `/admin/settings/templates`, `services/web/src/pages/AdminThemeTemplatesPage.tsx`, runtime `shared/theme-runtime.js` y setting `theme.templates.corporateEnabled`. Los paths de switching/persistence/visibility/auth declarados existen; la auditoría estática pasa y los tokens semánticos de los tres presets se leen del CSS canónico. La ruta está protegida por `minRole="superadmin"`; la fuente del API valida y persiste revisión/configuración.

El estado sigue **PARTIAL**: no se ejecutaron las pruebas declaradas ni se verificó en producción el editor, persistencia tras recarga, fallback de corporate o autorización con actor persistido. Esta continuación no ejecuta tests ni builds locales de aplicación; aceptación de runtime requiere personas autorizadas y producción.

CMT-001 está actualizado al SHA y deployments actuales para este corte. CMT-002 mantiene el hallazgo de UAT-141 en producción 5.2.10: cuatro targets bajo 44 px (marca 40 px, email 41 px, password 41 px y toggle de registro 20 px); PR #259 prepara la corrección, pendiente de revisión, despliegue y UAT-142 en producción. CMT-003A/B y CMT-004 conservan sus bloqueos autenticados: el fixture CMT-003C autorizado se limita a dos tenants temporales, dos usuarios `user`, dos Browser devices, scaffold Brand/Team mínimo y un único flow inerte asignado a Team A, TTL máximo 24h y cleanup inmediato. C1 todavía necesita una vía segura, first-party, autenticada y durable para provisionar y limpiar; no se hicieron escrituras productivas.

La PIA `FlowRunEvidence` permanece dormida: solo existe en el esquema, sin escritor, lector, ruta, UI o necesidad del runtime actual. No se añade retención ni procesamiento hasta aprobar un contrato específico. No se hicieron llamadas CRM/voz, egress privado, cambios de proveedor, ni se leyeron secretos.

## Gates siguientes

1. Entregar las PIAs de CMT-003C/C1 por el flujo normal de revisión y cerrar diseño de auditoría durable, run idempotente, TTL y cleanup reversible antes de cualquier provisión productiva.
2. Llevar #259 a revisión; después del despliegue real, ejecutar UAT-142 en producción y actualizar su PIA con resultados medidos.
3. Con identidad sintética autorizada disponible, aceptar CMT-003A y luego CMT-003B. Egress positivo queda bloqueado hasta una allowlist por tenant y destinos exactos de un sandbox controlado.
4. Continuar CMT-004 con las identidades/roles que el alcance permita. El fixture `user` actual no demuestra permisos de Admin/Coordinator, por lo que ADM-IF-01..06 siguen pendientes.

No correr el gate de completitud del portafolio: quedan gaps de severidad alta y aceptación funcional pendiente.
