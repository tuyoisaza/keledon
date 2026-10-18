# Baseline de fuente — MVP
Fecha: 2026-10-18. Fuente main 5.2.21, 2decd79b6fd741d1f5838a091b2b1c4436740acf. Revisión estática, sin tests/build/lint de aplicación locales.

| Hallazgo | Fuente | Acción PIA | Límite de la evidencia |
|---|---|---|---|
| runtime:connect pair rechazado en el dump del propietario; código de error genérico oculta causa interna | services/api/src/devices/device.controller.ts, device.service.ts; dump privado no copiado al repo | 001: separar pairing/readiness del proof de audio y trazar fallo antes de reutilizar ruta | No se consultó BD/log privado para aislar la excepción |
| MediaLayer solicita getUserMedia y se invoca mediante manejadores main/IPC | browser/src/media/media-layer.ts; ipc-media-handlers.ts; call-handler.ts | 001: renderer/host de medios dedicado; stream remoto real | No se ejecutó esa ruta en este análisis |
| CallHandler.startCall pasa a listening sin esperar captura | browser/src/call-handler.ts:70–85 | 001/003: estados dependen de capacidades y éxito real | Defecto de control de flujo observable en fuente |
| VoiceWSClient usa AudioContext y salida local; se instancia desde cloud-connection main | browser/src/media/voice-ws-client.ts; cloud-connection.ts | 001/003: único AudioPort en contexto válido | Oír salida local no demuestra que la llamada la envíe |
| voice:audio y brain:audio tienen recorridos diferentes | browser/src/cloud-connection.ts; media/voice-ws-client.ts; services/api/src/voice/voice-brain.processor.ts | 003: unificar salida y generación de turno | No se declara rotas todas las rutas de voz existentes |
| stopAudio está vacío; no detiene fuentes/cola | browser/src/media/voice-ws-client.ts | 003: cancelación efectiva y descarte tardío | Falta evidencia remota de interrupción |
| Injector se arma por executeJavaScript mediante botón; comentario de document_start no lo garantiza; desarme no implementa el mute descrito | browser/src/webrtc-injector.ts; ipc-handlers.ts; renderer/renderer-panels.js | 001: armar antes de que softphone obtenga stream y liberar de verdad | Configuración de página/stream actual no observada |
| Ruta audio:stream solo reconoce recepción; alternativa WebRTC sí conecta transcripción configurada | services/api/src/voice/voice-webrtc.handlers.ts | 001/003: escoger transporte operativo y medir; no asumir todas las alternativas completas | Un ACK no prueba STT |
| Hay call_start consumidor y adaptador Genesys legacy, no detector conectado encontrado en Browser activo | browser/src/cloud-command-polling.ts; agent/extension/rpa/adapters/genesys.adapter.ts | 002: observer independiente de marca y confirmación | Ausencia en rutas revisadas no prueba ausencia de integración externa |
| Web Brain contiene control de audio y barge-in reutilizable, orientado al micrófono de chat | services/web/src/pages/brain-audio-controller.ts; brain-speech-capture.ts | 003: revisar/reutilizar lógica, sustituir entrada por canal remoto | Código existente no demuestra voz en Meet |
| Instalación reportada 5.0.52; package fuente 5.2.21 | dump privado / browser/package.json | 005: identificar build experimental reproducible | La versión del sitio/API no actualiza el instalador |

Los seis archivos Browser modificados antes de este trabajo conservan su estado y quedan fuera del commit del MVP. No atribuirles el incidente sin evidencia ni publicar ese candidato incompleto por accidente.
