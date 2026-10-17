# PIA CMT-001 — baseline, versiones y entrega

Estado: COMPLETED FOR THE 5.2.10 CUT · Prioridad: 1 · Owner: mantenimiento KELEDON/PHDK.

## Revalidación más reciente — 5.2.10

PR #255 merged as main `fd429298a85bdcf3b5c20791f9b1598c132aabcb`; five package/lock roots and Browser renderer align at 5.2.10; PHDK v2.53.1 coherence passes 64/64. Railway Web/API deployments `15f47990-5368-4462-aeba-0d508c388262` / `1b391751-bfc4-4d88-8131-ae239a3c5a07` are SUCCESS, 1/1. Anonymous production UAT-140 closes the active localized 404 gap. This closes CMT-001 for the 5.2.10 delivery cut only, not the remaining three commitments or whole Auto acceptance.

## Resultado esperado

Conservar una base reproducible entre paquetes del producto, el renderer y los estándares PHDK, y enlazar cada cambio aprobado con su PR, SHA de `main`, despliegue y aceptación correspondiente. KELEDON 5.2.3 se fusionó por PR #229 en `3cccb4b2f88828fa5d273b682925d3a106dd3b9`; cinco roots de paquete/lock, Browser renderer y PHDK v2.53.1 64/64 se verificaron. Railway Web `3e168f0c-50b9-4ebb-b3c1-0cd5bd81b2a7` informa `SUCCESS`; API `6467f5d6-d99b-41ed-9af8-2f3176d505b7` seguía `BUILDING` al último readback. UAT-117 verificó versión 5.2.3 y copia anónima en Web. CMT-001 queda cerrado para este corte; esto no cierra los otros compromisos ni equivale a aceptación funcional integral.

## Trabajo

1. En cada cambio de producto, revisar los package/lock roots de API, Cloud, Web, Landing y Browser renderer; mantenerlos alineados en la versión propuesta. No hacer un version bump solo por ejecutar el PIA.
2. Antes de PR: comprobar diff y manifiesto PHDK. Los checks estáticos documentales no se presentarán como test de aplicación. No ejecutar localmente suites, builds de app ni crear fixture local.
3. Usar una rama/PR limpia por cambio, enlazar el PIA y las decisiones tenant existentes, y preservar el target configurado de autodeploy de Railway. No cambiar configuración de GitHub/Railway desde este paquete.
4. Tras merge, leer `main` desde remoto, comparar SHA/tree/versions, identificar despliegues API/Web del SHA y visitar las rutas productivas necesarias. Documentar si el provider no atribuye el SHA o si checks de hosting no existen.

## Aceptación

- Los cinco roots/renderer del candidato concuerdan y las reglas PHDK instaladas pasan coherencia estática.
- PR mergeado; `git ls-remote origin refs/heads/main` coincide con readback; evidencia identifica SHA, tree, versión y deployments sin declararlos equivalentes a aceptación funcional.
- Los fallos P0/P1 o diferencias de versión se reparan con un PR posterior; no se proclama completa la meta mientras otros CMT estén abiertos.

## Evidencia / límites

UAT-112 (`50-uat/evidence/uat-112-production-cta-theme-contrast-2026-10-17.json`) observa el source de producto `818ac9c8f1043cfc04768c30770f505b48d5087c`, assets v5.2.2 y despliegue Web `a1f52f34-3844-423a-98b5-92336e80500b` en `SUCCESS`; UAT-113 registra el despliegue Web `af21cae1-4cdb-47f7-83b9-b7556903f523` sobre el tip documental `2a0719660edf57d092a4acc9dfa79e233deafaa0` y el mismo bundle 5.2.2 en la ruta pública `/login`. Después de esos UAT, PR #223 disparó el despliegue Web/API `48f57f7b-618f-41e1-9a26-89e799cd0de9` / `67b39cdc-8ff6-4763-a412-04c334a879e0`, ambos `SUCCESS`. El tip documental exacto de `main` es `73e1ac91e274997cffe14743d11c2b50df86ea9d`, confirmado independientemente por `git ls-remote`. El checker PHDK estático pasa 64/64 mappings. Railway status confirma Web/API Online, sin pending work; hay cinco fallos históricos anteriores en la ventana de Web, sin alertas activas. GitHub no reportó checks requeridos ni review decision en los PR #219–#223; no se alteró esa configuración. Ninguno de estos datos representa pruebas de base de datos, autenticación o integraciones externas.

Actualización UAT-117 / PR #229: main `3cccb4b2f88828fa5d273b682925d3a106dd3b9`; producto 5.2.3; cinco raíces package/lock y Browser renderer alineados; PHDK estático 64/64. Web `3e168f0c-50b9-4ebb-b3c1-0cd5bd81b2a7` `SUCCESS`; API `6467f5d6-d99b-41ed-9af8-2f3176d505b7` `BUILDING` al último readback. UAT-117 cubre solo el UI público Web: v5.2.3 y estado accesible “Diagnóstico copiado”; hostnames API/OAuth retirados en la fuente. Portapapeles no leído. No hubo test ni build local de aplicación.
