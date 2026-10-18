# Arquitectura experimental — elección abierta
Fecha: 2026-10-18. Decisión ADR-MVP-001. Evidencia actual: inspección de fuente; sin experimento funcional ejecutado.

## Separación propuesta
Brain/guion/RAG decide objetivos de negocio; orquestador mantiene sesión y turnos; AudioPort transporta audio y cancelaciones; InteractionObserver percibe señales; SurfaceExecutor observa/actúa/verifica en superficies autorizadas.
Los adaptadores resuelven diferencias técnicas por cliente. URL + prompt no son una garantía de soporte de toda telefonía/CRM. Las capacidades se descubren/verifican por sesión; una desconocida se registra UNVERIFIED.

## Candidatos
| Candidato | Qué reutilizar | Hipótesis pendiente | Gate duro |
|---|---|---|---|
| Chrome/Edge + host Windows acotado | Navegador instalado; observación DOM/accesibilidad y Cloud existentes | Captura remota y retorno por ruta soportada a Meet; extensión requiere permisos/activación | A01/A02/A06 |
| Electron con renderer de medios dedicado | TabManager, IPC, allowlists y Brain | Corregir separación main/renderer e inyección previa al stream; compatibilidad real Meet | A01/A02/A06 |
| Automatización Windows de UI | Accesibilidad para aplicaciones sin DOM útil | Complementa control, pero no sustituye transporte de audio | No es tercer circuito completo hasta tener AudioPort |

No AppleScript como solución Windows. No ejecutar texto de shell producido por el modelo. Mantener capacidades mínimas y origin/ventana fijados por sesión; no dar al Brain control arbitrario del escritorio.

## Contratos delgados
- AudioPort: prepare, captureRemote, sendSpeech, cancelSpeech, release.
- InteractionObserver: alert_candidate, inspect, confirmed/ambiguous/unsupported.
- SurfaceExecutor: observe, search_case, read_case, cancel; devuelve outcome y observaciones.
- Brain: solicita operación con turn/generation; recibe resultado autorizado y decide siguiente intervención.
- Orchestrator: identidad/tenant persistidos, correlación, timeout, cancelación, control de generaciones y capacidades. El perfil de experimento no es autoridad.

[Perfil de experimento](../../../contracts/mvp/interaction-profile.schema.json) y ejemplo describen configuración; NO están conectados al runtime actual ni crean permisos. La validación JSON no prueba funcionamiento.

## Reglas de decisión
Fallos de audio remoto, retorno de voz, cancelación o tenant son excluyentes. Comparar ambos candidatos con misma reunión, contraparte, guion, proveedor configurado y casos ficticios; registrar versión exacta del ejecutable y si tuvo intervención humana. No elegir por inversión previa.
Criterios secundarios: latencia por tramo, mantenimiento por cliente, sesiones/login, permisos/instalación, recuperación y portabilidad. Windows es el único gate inicial; Mac/Linux no se prometen.
Mantener integraciones oficiales opcionales cuando existan. Meet es canal conversacional de referencia; detección de oferta ACD sigue abierta hasta plataforma que la proporcione.

## Fuentes técnicas consultadas, 2026-10-18
- Chrome tabCapture: https://developer.chrome.com/docs/extensions/reference/api/tabCapture — captura exige invocación; no aporta por sí sola un micrófono saliente.
- Microsoft loopback: https://learn.microsoft.com/en-gb/windows/win32/coreaudio/loopback-recording — captura de salida, distinta de proporcionar entrada a un softphone.
- Captura por proceso: https://learn.microsoft.com/en-us/samples/microsoft/windows-classic-samples/applicationloopbackaudio-sample/ — evaluar disponibilidad Windows real.
- Electron desktopCapturer: https://www.electronjs.org/docs/latest/api/desktop-capturer — capacidades y restricciones dependen de plataforma/versión.
Fuentes documentales justifican experimentos; no son evidencia de compatibilidad de nuestro producto.
