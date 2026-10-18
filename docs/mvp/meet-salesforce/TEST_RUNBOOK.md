# Pruebas reales — preparación y ejecución
Estado: NOT RUN. Fecha: 2026-10-18. Sitio KELEDON de producción y Meet/Salesforce reales con datos ficticios; no levantar aplicaciones ni ejecutar tests/build/lint locales.

## Lo recibido y lo que falta
| Recurso | Estado | Acción |
|---|---|---|
| Enlace Meet dedicado | Aportado en conversación privada | Abrir solo para sesión coordinada; no guardar enlace/código en Git |
| Interlocutor en segundo equipo/teléfono | Propietario confirmó disponible | Auriculares; confirmar qué escucha desde ese extremo |
| Puesto Windows del agente | Inventario de solo lectura preparado | Revisar informe; permisos, dispositivos y rutas siguen UNVERIFIED hasta prueba |
| Salesforce de prueba | Falta URL y sesión | Propietario inicia sesión directamente; no enviar contraseña/token |
| Casos ficticios | Faltan dos números/estado esperado | Proporcionar privadamente; no buscar casos reales para sustituirlos |
| Brain/tenant/proveedores configurados | No verificado para MVP | Elegir equipo autorizado existente en KELEDON; confirmar STT/TTS/LLM listos sin cambiar claves/proveedores |
| Consentimiento/evidencia | No se presupone grabación | Métricas y confirmación remota sin audio bruto; si se desea grabación acordar alcance/retención antes |

No pedir acceso privilegiado adicional para una lectura CRM. Si solo existe Salesforce productivo, usar exclusivamente los registros ficticios identificados y evitar listados/capturas amplios. No iniciar consumo de proveedor que requiera gasto nuevo sin decisión del propietario.

## Preflight del puesto
Ejecutar scripts/mvp/collect-windows-readiness.ps1: lee versión OS/browser y cuenta endpoints de audio; no cambia configuración, captura sonido, abre reunión ni inspecciona credenciales. Es inventario, no aceptación funcional.
Revisar permisos reales de micrófono/captura y rutas solo cuando exista ejecutor preparado. No instalar un cable/driver virtual por defecto. Un inventario PASS no se registra como prueba A01.

## Sesión 1 — circuito de audio
1. Propietario inicia sesión y entra a Meet desde ambos extremos; autoriza la participación de prueba. No enviar mensajes/invitaciones a terceros ni encender cámara por defecto.
2. Seleccionar instancia/pestaña y canales; interlocutor dice frase ficticia variable. Comprobar que llega desde canal remoto, no captación ambiental.
3. Emitir saludo TTS con micrófono físico agente silenciado; contraparte confirma texto oído. Anotar A01/A02 y rutas exactas en evidencia privada de sesión.
4. Interrumpir con otra frase mientras suena TTS; verificar silencio real, sin cola residual ni chunks tardíos. Repetir 3 veces, anotar fallos y latencia; no inventar precisión si cronometraje manual.
5. Fin de sesión → liberar tracks. Volver a entrar y repetir un turno. Si falla canal saliente, detener circuito, registrar fallo y reparar antes de Salesforce.

## Sesión 2 — conversación y Salesforce
1. Propietario abre Salesforce y proporciona casos ficticios; preparar estado esperado sin exponer datos reales.
2. Brain saluda/pide número; interlocutor dicta caso; KELEDON busca/observa/lee y responde con el dato, sin escribir.
3. Repetir segundo caso y uno inexistente. Alterar de forma reversible navegación/layout, sin cambiar datos; medir necesidad de instrucciones específicas.
4. Intentar objetivo de escritura no permitido y navegación fuera de superficie: denegación. No enviar una mutación real para comprobar el bloqueo.
5. Cancelar durante búsqueda, reconectar, cerrar y atender una segunda interacción: ningún resultado de la anterior se habla/aplica.

## Sesión 3 — despertar y confirmación
Observar qué señal real ofrece Meet. Si una solicitud de entrada/evento no produce alerta acústica comparable a telefonía, A03 queda UNSUPPORTED_FOR_ALERT_CASE y se programa dentro de la conversación una prueba con Genesys real cuando esté preparado. No construir clon ni reproducir un ring falso como proof ACD. Alertas ajenas no autorizan aceptar.

## Evidencia, salida y limpieza
Usar plantilla sin enlaces Meet, dominios privados, casos reales, cookies ni transcripción. Datos ficticios necesarios para comparación se mantienen en notas de sesión autorizadas, nunca logs generales. Estado por caso: NOT_RUN/PASS/FAIL/BLOCKED/UNSUPPORTED, con tipo de medición manual/instrumentada y valor nullable.
Cerrar solo recursos creados para la sesión; no borrar caché global, cerrar cuentas habituales ni cambiar defaults Windows. No mutaciones Salesforce que limpiar. Reportar lo probado y dejar el resto NOT RUN.
