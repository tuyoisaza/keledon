# MVP Windows — Meet + Salesforce
Estado 2026-10-18: PLAN PREPARADO; implementación del circuito y UAT pendientes.
Actualización de aceptación 2026-10-18: transporte de audio en Meet verificado con muestra española de producción, recepción remota, tres interrupciones por voz y reproducción completa tras liberar/rearmar. [Evidencia actual](../../meet-audio-20261018/UAT_REPORT.md). Esto sustituye los NOT RUN históricos solo para esas pruebas acotadas; STT→Brain, transcripción, CRM, cola futura de red, inmunidad general a eco y circuito automático siguen pendientes. Adaptador experimental v0.2.1 local/no publicado; producto web TTS/vista previa 5.5.2 publicado. Los estados originales del plan se conservan a continuación como baseline histórico.
PHDK instalado/canónico 2.56.0 verificado; baseline fuente main 5.2.21, 2decd79b6fd741d1f5838a091b2b1c4436740acf.
Compromiso padre CMT-003. Este corte prioriza por instrucción actual el experimento MVP sin cancelar CMT-001/002/004.

## Objetivo y recorrido
Meet real → audio del interlocutor → STT → Brain/guion/RAG → voz dentro de Meet → solicitar número → Salesforce real con casos ficticios → lectura de estado → respuesta sustentada → cierre → espera.
La observación de una alerta acústica abre una investigación; no autoriza contestar sin confirmar interfaz, contexto y tenant. Meet valida conversación/audio; no equivale a la oferta de una llamada ACD de Genesys ni demuestra compatibilidad universal.

## PIA y orden de dependencias
| PIA | Resultado | Dependencias | Estado |
|---|---|---|---|
| [MVP-001](PIA-MVP-001-AUDIO-WINDOWS.md) | El interlocutor oye TTS y KELEDON oye solo el canal remoto correcto | Puesto Windows, Meet y contraparte | READY para inventario; audio real NOT RUN |
| [MVP-002](PIA-MVP-002-PERCEPCION-INTERACCION.md) | Alerta → observación → confirmación, sin falsos auto-answer | 001 para audio; observador UI | Diseño READY; detector sin implementar |
| [MVP-003](PIA-MVP-003-CONVERSACION-BRAIN.md) | Conversación gobernada, interrupción real y sesión recuperable | 001, identidad/tenant y proveedores vigentes | Implementación pendiente |
| [MVP-004](PIA-MVP-004-SALESFORCE-POR-OBJETIVO.md) | Buscar/leer caso por objetivo y devolver observaciones al Brain | 003, Salesforce/casos ficticios | Preparación READY; acceso pendiente |
| [MVP-005](PIA-MVP-005-CIRCUITO-Y-DECISION.md) | Circuito integrado y elección de ejecutor basada en evidencia | 001–004 | NOT RUN |

[Arquitectura experimental](ARCHITECTURE_EXPERIMENTS.md) · [Runbook y necesidades del propietario](TEST_RUNBOOK.md) · [Hallazgos de fuente](SOURCE_BASELINE.md) · [Hitos](MILESTONE_PLAN.md) · [Plantilla de evidencia](evidence-template.json).

## Requisitos y trazabilidad
| ID | Requisito | PIA / aceptación |
|---|---|---|
| MVP-R01 | Windows, ejecutor intercambiable y capacidades verificadas por sesión | 001/005, A01/A10 |
| MVP-R02 | Capturar al interlocutor, emitir TTS al canal de llamada y evitar autorreconocimiento | 001, A01/A02 |
| MVP-R03 | Despertar por sonido y confirmar visualmente antes de actuar | 002, A03/A04 |
| MVP-R04 | Brain decide con guion/RAG y ejecutor devuelve observaciones verificables | 003/004, A05/A08 |
| MVP-R05 | Interrupción corta audio activo, cola y respuestas antiguas | 003, A06 |
| MVP-R06 | Salesforce: búsqueda/lectura de casos ficticios sin cambios de registros | 004, A07/A08 |
| MVP-R07 | Cancelación, reconexión y retorno a espera sin efectos duplicados | 003/005, A09 |
| MVP-R08 | Cambio de layout/plataforma no obliga a rehacer el Brain; medir límites | 004/005, A10/A11 |
| MVP-R09 | Permisos por tenant, secretos protegidos y evidencia mínima | Todos, A12 |

## Alcance de esta entrega
Intent/plan/PIAs, contratos de perfil no activados en producción y herramienta de inventario Windows de solo lectura. No modifica rutas ni el audio de la aplicación; no es un MVP operativo ni evidencia de llamadas completadas. Los seis archivos Browser preexistentes modificados quedan fuera de esta entrega.

## Publicación y continuidad
Versión producto permanece 5.2.21: este corte no entrega una capacidad funcional nueva. Se publica con prefijo de versión y PR normal. La selección del ejecutor sigue OPEN hasta A01/A02/A06/A09; una tabla de diseño no la cierra. No hay ejecución programada ni agentes en segundo plano.
