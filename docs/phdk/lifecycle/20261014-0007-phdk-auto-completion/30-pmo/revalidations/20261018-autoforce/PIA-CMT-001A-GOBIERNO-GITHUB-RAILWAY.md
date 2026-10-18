# Sub-PIA CMT-001A — gobierno de entrega GitHub/Railway

Estado: PREPARADA / OWNER DECISION REQUIRED BEFORE PROVIDER WRITES · Prioridad: CMT-001 · PHDK 2.53.1 · corte KELEDON 5.2.10 (2026-10-17).

## Hallazgo y objetivo

El PHDK Check actual de KELEDON (PHDK_CHECK_REPORT-5.2.10-PHDK-2.53.1-current-2026-10-17.md) detecta un plano de entrega sin protección observable: el endpoint de branch protection de main devuelve 404, no hay rulesets, workflows, hooks ni checks de PR; GitHub Actions está habilitado para todas las acciones y no exige pinning por SHA. Hay un fallo histórico de Version Bump del 2026-09-29. Railway tiene Web/API conectados a main, deployments SUCCESS, autodeploy activo, checkSuites=false y sleep habilitado; producción no tiene cambios staged ni servicios cron.

La lectura disponible no confirma si Railway Wait for CI está configurado, ni da facturación, presupuesto, política/historial de reinicios o alertas. Estos puntos son UNVERIFIED. La auditoría estática no prueba ausencia de configuración remota.

Esta PIA define controles mínimos para que cada entrega mantenga revisión, trazabilidad y costo observable sin interrumpir el autodeploy ni inventar CI incompatible con la política del owner. No crea workflows, no activa ni desactiva Actions y no cambia settings de GitHub/Railway.

## Contrato propuesto

1. Proteger main con PR requerido, bloqueo de force-push y borrado, conversación resuelta y revisión de otra persona. No habilitar bypass de administrador para cambios rutinarios. El owner decide si hace falta un ruleset equivalente cuando branch protection no esté disponible.
2. Mantener Actions deshabilitado para workflows no aprobados. Si se autoriza CI después, usar allowlist de acciones fijadas por SHA y permisos mínimos; crear primero un inventario con dueño, función y validación. Ningún workflow puede ejecutar pruebas de aplicación fuera del sitio productivo bajo la instrucción vigente.
3. Preservar Railway GitHub autodeploy de main. Mantener checkSuites=false mientras no existan checks requeridos compatibles y verificados; no activar Wait for CI sin confirmar el enlace entre check suites y workflows operativos.
4. Consultar con un administrador de Railway si se dispone de historial de reinicio, uso facturado, presupuestos y alertas. No leer ni registrar valores de variables, credenciales, tokens o connection strings.
5. No crear cron, watcher, bot, polling, redeploy loop ni agente persistente de PHDK. No cambiar sleep, retries, CPU/memoria, regiones ni política de reinicio como parte de esta PIA.
6. Registrar antes/después, actor, IDs de configuración no sensibles y UTC. La evidencia debe distinguir metadata observada de setting aplicado y mantener UNVERIFIED ante una API sin cobertura.

## Matriz de controles

| Caso | Resultado requerido | Evidencia |
|---|---|---|
| GOV-01 | Todo cambio a main llega por PR, sin force-push/delete accidental. | Lectura del ruleset/branch protection después de aprobación y un PR de verificación sin merge. |
| GOV-02 | Actions no ejecuta código externo sin autorización; permisos y SHA pinning son restrictivos. | Lectura de settings y workflow inventory; no se ejecutan jobs durante la configuración. |
| GOV-03 | Autodeploy GitHub→Railway continúa en main y no espera un check inexistente. | Describe-service + deployment readback en un cambio documental autorizado; verificar branch y pending work. |
| GOV-04 | Costo/restarts tienen una fuente de lectura identificada o se registran como no disponibles. | Evidencia de superficie/fecha/alcance; sin copiar datos secretos o afirmar gasto no medido. |
| GOV-05 | No existen automatizaciones PHDK recurrentes sin owner/propósito. | Auditoría estática sin hallazgos + workflows/hooks/webhooks/cron remotos consultados. |

## Decisiones y límites

- El owner autorizó PHDK Auto y fixes de repositorio; eso no se interpreta como autorización de cambios de configuración externa. La norma PHDK_AUTOMATION_HYGIENE.md clasifica settings de proveedor, Wait for CI, reinicios y controles de facturación como EXTERNAL/MANUAL.
- Antes de escribir settings, el owner/administrador define quién mantendrá reviews, qué check(s) son compatibles con aceptación productiva y dónde consultar billing/restarts. No degradar una protección existente ni cambiar el target de autodeploy.
- Esta PIA no crea CI de aplicaciones: el owner requiere aceptación funcional en producción y excluye pruebas/build/lint locales. Un workflow estático opcional necesita decisión de owner y revisión propia.
- No se usan claves, cuentas de cliente, base de datos ni endpoints privados en su aceptación.

## Siguiente paso y salida

Solicitar la decisión del owner para branch rules, acciones permitidas y fuente de costos; el agente no aplica esos cambios por su cuenta. Después, un administrador realiza solo los cambios aprobados y se verifica GOV-01..05 con lectura de APIs, sin ejecutar jobs o desplegar como parte del control. CMT-001A cierra cuando los controles acordados tienen evidencia; de otro modo permanece OWNER DECISION REQUIRED / UNVERIFIED y la meta PHDK Auto sigue PARTIAL.
