# MVP 5.7.0 — implementación, publicación y aceptación

## Mandato vigente

2026-10-19: avanzar el resto del MVP sin ejecutar pruebas durante la ausencia del
propietario, añadir botones por capa y log verbose copiable; retomar UAT paso a
paso al regreso. No pruebas, builds, lint ni typecheck locales. La instrucción de
«asumir que funcionaron» se usa solo para avanzar dependencias de implementación,
nunca para inventar resultados. Carpeta principal y cambios ajenos preservados.

## Implementación

- Web: controles aislados para sesión/equipo, WAV STT, un turno remoto solo STT,
  conocimiento filtrado, Brain administrado, TTS por `/tts/speak`, reproducción
  local/Meet, inspección de transporte, interrupción y liberación.
- API: las rutas nuevas permanecen bajo BrainMeetGuard; sesión actual, rol DB y
  resolución canónica de equipo/marca/empresa. No excepción al guard compartido,
  cambios de roles/asignaciones/proveedores ni relajación de CSP.
- STT comparte validación WAV y límite/timeout/cancelación con la conversación.
  Brain y conocimiento conservan límites de solicitudes y apagado de integración;
  TTS conserva su ruta, guard, metadato de equipo y controles de gasto existentes.
- Log por proyección explícita, 300 eventos, sin audio/transcripciones/respuestas,
  campos CRM, URLs, IDs de cuenta ni secretos. HTTP/error seguro y tiempos por tramo;
  inspección de canales, nivel agregado y contadores RTP. Copia y vaciado explícitos.
- Salesforce: destinos CRM activos persistidos por equipo, HTTPS Lightning/My
  Salesforce; servidor revalida cada lectura/respuesta. Sin recuperar columnas de
  credenciales ni enviar cookies al Brain/modelo. Apertura y enlace explícitos,
  origen/ventana/session/request fijados, dos minutos y seis consultas.
- Solo uno o dos números ficticios declarados en memoria; búsqueda semántica de
  lista reconocida y enlaces exactos Case del mismo origin. Lectura de número,
  estado/asunto bounded; ambigüedad/layout/desaparición/expiración requieren ayuda.
  Nunca New/Edit/Save, API CRM, shell, selectores del modelo ni cambios de registros.
- Voz: número de caso inequívoco solicita observación, respuesta cita estado/asunto
  sin interpretar instrucciones de página. Interrupción cancela consulta/cola;
  despedida libera al acabar su TTS; nueva sesión reinicia historia y turnos.
- Extensión 0.4.0: headings/metadatos alineados. Se añaden solo los dos patrones
  Salesforce; la recarga/consentimiento del navegador se hará al regreso. No drivers,
  dependencias, automatizaciones, nuevo gasto contratado o selección final de ejecutor.

## Revisión estática y límites

Revisión del diff de autorización, destinos, límites, proyección de logs,
cancelación/generaciones, limpieza al cambiar contexto y restablecimiento de sesión.
JSON de manifest/versiones/locks inspeccionado; las entradas de dependencias no
cambian. Comprobación de whitespace del diff. Estos controles no ejecutan la app,
no sustituyen compilación ni prueban los tipos o el comportamiento funcional.

El adaptador admite solo controles Lightning reconocidos, no todas las interfaces.
El servidor no certifica la observación DOM; la limita y vuelve a autorizar su
origen/equipo. Un resultado vacío no demuestra inexistencia global. La declaración
de casos evita búsquedas fuera de la allowlist del puente, pero el propietario debe
aportar casos realmente ficticios. Meet manual no prueba alarma/oferta ACD.

## Publicación

Rama `codex/mvp-layer-controls`, [PR #292](https://github.com/tuyoisaza/keledon/pull/292)
MERGED a main `49bb2229760914f42ed3758f87cefbe4c5d3138b`; árbol y versión remotos
verificados. Producto 5.7.0, extensión 0.4.0. Hosting se registra separadamente en
el recibo posterior, sin fabricar autodeploy ni prueba de producto.
Railway reportó API y Web SUCCESS/Online para los autodeploys de este candidato;
no se abrió la aplicación ni se ejercitaron los nuevos controles para verificarlo.
[Cobertura](PHDK_COMMITMENT_COVERAGE.md) y [auditoría](PHDK_COMPLETION_AUDIT.md)
del alcance actual, separadas de los archivos raíz ajenos preservados.

## Aceptación

Nuevas capas y circuito: **PENDIENTE / NOT RUN**, por decisión actual del propietario.
No se generó voz, llamó al STT/Brain, consultó Salesforce ni se abrió otra prueba
de Meet durante este corte. La administración acotada de Speaches se registra
[separadamente](RAILWAY_REPAIR_20261019.md), sin confundir Online con STT funcional.

Se retiene la aceptación histórica de muestra española, vista previa y transporte/
tres interrupciones/recuperación. No acredita la conversación automática nueva.
Faltan el regreso de la contraparte, recarga 0.4.0, origen/sesión/casos ficticios
Salesforce con estados esperados y fixtures de denegación válidas para este guard.
[Runbook exacto](LAYER_ACCEPTANCE_RUNBOOK.md). El MVP no se declara aceptado completo.
