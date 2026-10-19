# MVP 5.7.0 — controles y aceptación aplazada

2026-10-19. El propietario autorizó avanzar la implementación sin nuevas pruebas
durante su ausencia. No se transforma esa instrucción en PASS. No tests, builds,
lint, typecheck ni ensayos locales; tampoco nuevas pruebas de producto/proveedor
en producción en este corte. Revisión estática de fuente/diff/metadatos solamente.

## Implementación candidata

| Capa | Control / comportamiento implementado | Aceptación actual |
|---|---|---|
| Sesión/equipo | Validar sesión y equipo; mismo BrainMeetGuard y rol DB | PENDIENTE para el candidato |
| Transporte | Abrir desde Brain, inspeccionar canales, interrumpir cola | Transporte anterior aceptado; nuevo candidato PENDIENTE |
| STT | WAV PCM mono 16 kHz, 0,1–12 s, 384044 bytes; proveedor del equipo | PENDIENTE; último circuito falló antes de transcribir |
| Conocimiento | Consulta filtrada por equipo/marca/empresa; solo número de coincidencias | PENDIENTE; cero no prueba disponibilidad del índice |
| Brain | Mensaje ficticio, voz administrada y límites existentes | PENDIENTE |
| TTS | Generar por `/tts/speak`, reproducir aquí o enviar a Meet autorizado | Muestra/preview anteriores aceptadas; nuevas capas PENDIENTES |
| CRM | Destino activo persistido; dos casos ficticios máximo; búsqueda/lectura exacta Lightning | PENDIENTE; faltan dominio/sesión/casos/resultados esperados |
| Circuito | Número de caso → observación → respuesta citada; despedida → liberar/espera | PENDIENTE |
| Diagnóstico | Copiar log completo, vaciar log local; 300 eventos de metadatos | Implementado; uso real PENDIENTE |

Solo se soporta ingreso manual en Meet. La detección acústica de oferta ACD se
mantiene fuera de esta superficie; no se simula ni se afirma compatibilidad con
Genesys. El ejecutor Chrome/Edge sigue candidato, sin decisión final basada en UAT.

## Orden al regreso del propietario

1. Recargar extensión desde la carpeta principal `experiments/meet-audio` y
   comprobar 0.4.0 en sus paneles. Chrome puede pedir acceso adicional a los dos
   patrones Salesforce; no se eluden permisos. Recargar Brain/Meet antes de abrir
   la reunión desde Brain. Mantener cámara y micrófono físico del agente apagados.
2. Seleccionar equipo; ejecutar **Validar sesión y equipo**. Ejecutar además las
   denegaciones con fixtures sintéticas legítimas: ausente/caducada, equipo
   inexistente, usuario normal de otro equipo, CRM de otro equipo/inactivo/origin
   ajeno. No usar la cuenta habitual como sustituto de esos fixtures.
3. Con frase ficticia, usar **Transcribir archivo con STT**; verificar texto. Usar
   **Consultar conocimiento del equipo** con conocimiento ficticio preparado y
   **Consultar Brain**; verificar guion/contexto, sin confundir HTTP 200 con calidad.
4. Generar TTS con el texto visible, reproducir aquí y confirmar audibilidad.
   Abrir Meet desde Brain, conectar, autorizar e iniciar audio; enviar la muestra
   preparada al canal libre y obtener confirmación remota.
5. Cargar destinos CRM autorizados; el administrador debe tener configurado un
   vendor CRM activo con origin HTTPS Lightning/My Salesforce exacto permitido.
   Aportar dominio, sesión iniciada directamente y dos casos ficticios con estado
   esperado, sin credenciales en chat. Declarar sus números antes de abrir CRM.
   Conectar lectura y usar **Buscar y leer caso exacto**. Verificar coincidencia y
   estado/asunto. Un layout o resultado no verificable debe pedir ayuda.
6. Conversación: saludo; esperar respuesta; decir «Mi caso es el número 123»
   sustituyendo 123 por el caso ficticio autorizado. Confirmar respuesta respaldada
   por el estado/asunto observado. El número se acepta en cifras que STT reconozca;
   ambigüedad o varios casos requieren confirmación, no selección aproximada.
7. Interrumpir realmente mientras Brain habla; confirmar corte y cinco segundos
   sin reanudación. Dar un nuevo turno, confirmar respuesta, decir «Hasta luego»
   y comprobar liberación/espera. Iniciar una segunda interacción sin cola previa.
8. Copiar log seguro y registrar resultado por capa. Los logs no incluyen frases,
   audio, campos CRM, enlaces privados, identificadores de cuentas o secretos.
   Texto reconocido/respuesta/estado/asunto existen solo en memoria/vista.

## Límites conocidos que requieren evidencia

- Adaptador CRM acotado a controles Lightning reconocidos. No es un ejecutor UI
  universal; navegación completa, login u opener aislado pueden exigir reabrir.
- Una lista sin coincidencias no demuestra inexistencia global: `needs_assistance`.
- La observación DOM procede de una superficie no confiable. El servidor revalida
  actor/equipo/vendor/origin y limita los campos; no certifica el contenido del CRM.
  El texto nunca se interpreta como instrucciones ni habilita escrituras.
- Los casos declarados deben ser realmente ficticios: la allowlist efímera evita
  buscar otros desde el puente, pero no prueba por sí misma su carácter sintético.
- Dos minutos/seis turnos; consulta CRM de veinte segundos; STT de cuarenta y cinco;
  turno completo de noventa; sin reintentos automáticos ni grabación persistente.
- Auth y controles de gasto permanecen efectivos; un fallo no autoriza cambiarlos.

Implementación, publicación y aceptación se registran por separado. Este documento
no declara MVP aceptado ni prueba la nueva conversación por la aceptación histórica
del transporte o la muestra española.
