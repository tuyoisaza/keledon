# PIA MVP-003 — conversación gobernada e interrupciones
Estado: implementación pendiente. Requisitos MVP-R04/R05/R07/R09. Depende de MVP-001 y sesión tenant/Brain autorizada.

## Implementación
1. Una sesión/interacción correlacionada, derivada de identidad persistida. Estados: unprepared → preparing → standby → candidate → confirming → connected → listening/speaking/acting → finalizing → standby; failed y needs_assistance explícitos. Una conversación tiene voz y herramientas concurrentes acotadas, no un único flag que bloquee el escucha durante toda consulta.
2. Unificar entrada de transcripciones, contexto RAG/guion, respuesta y tool requests del Brain. Los canales actuales voice:audio y brain:audio deben terminar en el mismo AudioPort autorizado; no generar una segunda voz al recibir el texto de una respuesta ya sintetizada.
3. Adaptar componentes existentes de services/web/src/pages/brain-audio-controller.ts y brain-speech-capture.ts solo tras revisar permisos/canales. Su captura del micrófono de chat no prueba audio remoto de Meet.
4. Interrupción remota: VAD/turno del interlocutor → cancelar generación TTS, detener fuentes activas y cola del AudioPort, descartar chunks/resultados tardíos. Mantener generación por interacción/turno; abort del servidor y corte local son ambos necesarios.
5. El Brain solicita operaciones tipadas y recibe observaciones; no declara un caso encontrado a partir de un clic. Consultas de lectura pueden reintentarse de forma acotada; efectos ambiguos no se repiten.
6. Timeouts y fallos de STT/LLM/TTS notifican incapacidad, no inventan respuesta. Usar proveedores ya configurados; sin cambios de claves/modelos ni gasto nuevo asumido.

## Aceptación
- A05: saludo y petición de caso siguen el guion; una respuesta se basa en resultado CRM correlacionado.
- A06: contraparte interrumpe durante TTS; fuentes y cola dejan de sonar y la conversación continúa sin respuesta antigua. Objetivo inicial propuesto: <=500ms desde detección local a corte de salida; medir también interrupción→silencio en extremo remoto, reportando valor real, nunca asumirlo.
- A09: pérdida de red, hangup o cancelación invalidan turno/herramienta, liberan audio y permiten una segunda interacción sin duplicados.
Preservar separación tenant/contexto y no escribir transcripciones en logs generales.

## Salida y reversión
Evidencia de 3 turnos completos, una interrupción y recuperación, con tiempos STT/Brain/TTS y confirmación remota. No declarar PASS por mocks o contadores UI. Detener sesión de prueba y liberar recursos ante fallo; mantener flujo actual fuera del experimento hasta integrar una ruta verificada.
