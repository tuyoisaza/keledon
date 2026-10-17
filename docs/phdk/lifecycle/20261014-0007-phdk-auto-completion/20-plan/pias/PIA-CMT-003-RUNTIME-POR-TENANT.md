# PIA CMT-003 — voz → Cloud → Browser → CRM por tenant

Estado: ACTIVE / PARTIAL · Prioridad: 3 · No existe una plataforma universal impuesta.

## Resultado esperado

Un contrato de runtime auditable y configurable por tenant: cada cliente decide proveedor de llamadas, CRM, endpoints y flujo. KELEDON valida la configuración sin depender de credenciales globales, mantiene la decisión Cloud separada de la ejecución Browser y aplica límites de origen a cada acción.

## Trabajo

1. Reconstruir el contrato real desde los entrypoints y callsites: sesión/evento de llamada, proveedor de voz, contexto, decisión Cloud validada, comando Browser permitido, resultado y salida CRM. Mapear timeout, cancelación, reintento, idempotencia, correlación y terminación. **Mapeado parcialmente en revisión de fuente 2026-10-17:** ver `40-integration/revalidations/20261017-runtime-contract/RUNTIME_CONTRACT_MAP.md`; se registró claim permanente sin lease y ausencia de idempotency-key de efecto externo.
2. Mapear adaptadores soportados sin asumir que existe cliente configurado. Cada adaptador declara capacidades, autenticación, campos secretos, límites de petición y error sanitizado. Los flujos se configuran dentro del tenant y se versionan; no se copian secretos al browser.
3. Para CRM local o privado: registrar hostname/puerto/esquema permitidos por tenant; validar DNS/resolución y revalidar cada redirect/resolución para bloquear loopback/link-local/metadata salvo las redes privadas expresamente permitidas por ese tenant. Bloquear credenciales embebidas, esquemas no HTTP(S), hosts públicos fuera de allowlist, rebinding y redirecciones fuera de política. El cliente que habilita red privada debe aprobar el CIDR/host exacto. **Gap de fuente observado en 5.2.1:** API/Cloud normalizan URLs y orígenes HTTP(S) exactos por tenant y Browser limita navegación/recursos a dichos orígenes, pero no se encontró validación de IP resuelta ni defensa DNS-rebinding. No usar todavía estos controles como garantía contra cambios de resolución; cerrar con un diseño que preserve CRM privados aprobados y aceptación del candidato desplegado.
4. Separar políticas Cloud de acciones deterministas Browser. Validar esquema y tamaño de salida del modelo; no permitir que el modelo origine URL, selector o acción fuera del flujo permitido. Registrar solo ID de paso, resultado, duración, estado HTTP y correlation ID sanitizado.
5. Proveer suite de conformance como guion reproducible de UAT productivo contra tenant sintético y endpoints de sandbox controlados. No contactar Genesys, Salesforce, CallPicker ni CRM real hasta que el propietario de ese cliente elija su sandbox y autorice la prueba.

## Aceptación

- Trazabilidad bidireccional entre evento de voz, política, decisión, comando Browser y resultado CRM, con cancelación y tope de duración.
- Negativas para tenant cruzado, host no allowlisted, redirect a host no permitido, DNS rebinding/resolución cambiante, esquema inválido, payload oversized y comando fuera de contrato.
- Positiva de CRM privado solo dentro de un allowlist tenant aprobado, con servidor de prueba sintético y sin usar datos de cliente.
- Reintentos son idempotentes o explícitamente no reintentables; no se duplican acciones CRM en desconexión.
- Evidencia contiene configuración sanitizada y entorno exacto; credenciales aparecen como configured/not configured, nunca enumeradas o expuestas.

## Entradas necesarias y límites

Las decisiones actuales especifican que el stack depende del cliente y que se permiten destinos privados configurados con allowlist/validación por tenant. La fuente actual prueba el origen exacto configurado, no su IP de destino en cada conexión ni la defensa DNS-rebinding; ese control de red queda como trabajo de seguridad previo a aceptar CRM privado. El Browser command queue también registra claims que nunca expiran; después de una caída puede dejar un comando sin recuperación y el registro de resultado no hace idempotente un efecto de negocio ya ejecutado. Diseñar lease/recovery e idempotencia antes de habilitar reintentos. No se identifica proveedor elegido ni sandbox/contrato de un cliente. La implementación general puede avanzar y usarse para revisión de fuente; la aceptación end-to-end real de un adaptador queda BLOCKED hasta recibir la selección y un sandbox del cliente. Nunca usar enlaces ni datos tomados de navegador/productivo de clientes existentes.
