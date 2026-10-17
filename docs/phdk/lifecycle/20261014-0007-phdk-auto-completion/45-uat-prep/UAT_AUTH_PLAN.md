# Plan de autenticación UAT — CMT-003C / KELEDON 5.2.10

Fecha de revalidación: 2026-10-17 · PHDK 2.53.1 · estado: **BLOCKED — camino de provisioning/cleanup no disponible**.

## Baseline y alcance

- Producto 5.2.10, source `fd429298a85bdcf3b5c20791f9b1598c132aabcb`; main documental antes de este update `357cc5074da94741b4717404f2b588a6daa8755d`.
- PHDK 2.53.1, upstream `94f583635d295ae0f227726718904d952cadb8ab`; coherencia estática PASS, 64 mappings.
- UAT-140 PASS_SCOPED en producción: 404 anónimo localizado; no acepta autenticación ni runtime.
- Se probarán en producción solo identidades/recursos sintéticos autorizados por la PIA CMT-003C. El alcance es dos tenants temporales, una Brand y un Team estructural por tenant, un usuario `user` y un device sintético por tenant, y un flow inerte asignado a Team A. No se crea el segundo flow sin ampliar aprobación.

## Ruta de acceso permitida

1. Usar exclusivamente el login normal del producto y el flujo first-party de administración ya existente, con actor y tenant derivados por el servidor desde la sesión/BD.
2. El operador de provisioning debe ser un superadmin ya existente y autorizado. No crear un superadmin de prueba, no usar la identidad habitual del owner como persona de prueba, no enviar invitaciones ni correo y no compartir credenciales, cookies o tokens en chat.
3. Antes de escribir, comprobar que la consola puede crear el run aislado y que existe una acción auditada para desactivar/limpiar únicamente los IDs marcados. Si cualquiera de esos pasos no está disponible, detenerse sin crear recursos y mantener BLOCKED.
4. No usar seeder local, auth bypass, token falsificado, escritura directa a PostgreSQL, endpoints públicos de fixture, configuración de IdP ni datos de clientes.

## Secuencia de aceptación cuando haya ruta lista

1. Confirmar el run ID `phdk-auto-uat-20261017`, el owner que opera, producción, IDs previstos, expiración máxima de 24 horas y limpieza inmediata al terminar.
2. Crear Tenant A/B con una Brand/Team mínima cada uno, un usuario regular y un device sintético por tenant, y un único flow sin PII asignado a Team A; sin CRM, email, audio o llamada externa.
3. En el sitio de producción, probar login normal, aislamiento tenant, claims/leases y denegaciones de acceso cruzado contra esos fixtures. Capturar solo estados e IDs anonimizados.
4. Desactivar/limpiar por la misma consola autenticada; verificar que ya no inician sesión ni aceptan comandos. Retener solo la auditoría permitida y evidencia redacted.

## Evidencia requerida

Registrar SHA y deployments exactos, timestamp UTC, operador/rol sintético redacted, IDs anonimizados, caso, estado, attempt/lease/tiempo y resultado de cleanup. Nunca guardar correo completo, token, URL privada, query, body, transcripción ni datos reales.

**Salida actual:** existen rutas CRUD administrativas protegidas por auth/roles, pero no se verificó una ruta que cubra de manera durable y reversible el ciclo completo de identidad-login, tenant, device, flow y cleanup. No se preparó ni se operó una sesión admin. No se hicieron escrituras, no se consultaron datos de clientes y no se ejecutaron pruebas/builds/lint locales de aplicación. La preparación documental no cambia CMT-003C a READY; revisar [PIA-CMT-003C1](../20-plan/pias/PIA-CMT-003C1-PROVISIONING-AUDITADO.md).
