# Cobertura acotada — candidato MVP 5.7.0

Este registro del pedido actual no reemplaza los archivos raíz modificados por
otros trabajos. Fuente publicada por [PR #292](https://github.com/tuyoisaza/keledon/pull/292).
No pruebas nuevas: aceptación aplazada por el propietario.

| Requisito | Fuente / comportamiento | Estado honesto |
|---|---|---|
| R01 Windows/ejecutor intercambiable | Contrato AudioPort y extensión 0.4.0; navegador estándar candidato | Implementado acotado; selección final pendiente de evidencia |
| R02 remoto/STT/TTS sin micrófono físico | AudioPort, meet-brain-link, BrainMeetPanel y rutas del equipo | Fuente integrada; transporte anterior aceptado; conversación actual pendiente |
| R03 alerta y confirmación | Entrada manual explícita Meet prevista por PIA-002 | No detector ACD; exige plataforma/señal real para fase posterior |
| R04 Brain/guion/RAG/observaciones | BrainController administrado, búsqueda filtrada y objetivo de caso | Implementado; calidad/contexto y respuesta observada pendientes |
| R05 interrupción | Generaciones/AbortSignal, cancelar lectura, vaciar audio/cola | Fuente integrada; interrupción nueva pendiente |
| R06 Salesforce ficticio sin escrituras | vendor/origin DB, lista de casos efímera, búsqueda exacta, estado/asunto | Adaptador Lightning acotado; acceso/casos y UAT pendientes |
| R07 cancelar/reconectar/espera | detener/liberar, despedida y reinicio de historia/turnos | Implementado; segunda interacción pendiente |
| R08 variación/adaptación | Resolver semántico acotado, sin comandos arbitrarios; needs_assistance | Límites documentados; matriz de layouts y decisión pendiente |
| R09 equipo/secretos/evidencia | guard específico, rol DB, destinos persistidos y proyección de logs | Revisión de fuente; matriz sintética negativa pendiente |
| Nuevo pedido: botones por capa/log | BrainLayerControls, controles Meet/CRM, log seguro 300 eventos | Publicado en fuente; recarga de extensión y uso real pendientes |
| Recursos Speaches | 10 CPU/10000000000 bytes, sleep false reescrito, mismo proveedor | Escritura/readback documentados; no equivale a STT funcional |

No se declara terminado el agente ACD durmiente ni compatibilidad universal. El
MVP conversacional manual es el candidato integrado para la próxima UAT, conforme
al alcance Meet del plan. No se selecciona otro frente del producto ni una misión
anterior, ni se inicia ejecución programada durante la ausencia del propietario.
