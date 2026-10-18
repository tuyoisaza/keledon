# PIA MVP-001 — audio bidireccional en Windows
Estado: READY para inventario y desarrollo; aceptación real NOT RUN. Responsable: asistente principal con propietario como contraparte UAT.
Valor: demostrar el circuito de audio antes de ampliar automatización. Requisitos MVP-R01/R02/R09.

## Implementación
1. Ejecutar inventario de solo lectura [collect-windows-readiness.ps1](../../../scripts/mvp/collect-windows-readiness.ps1); registrar versiones/cantidad de endpoints, sin IDs, nombres de usuario, rutas privadas ni tokens. No confundir endpoints presentes con permisos/captura probados.
2. Experimento A: navegador Chrome/Edge + componente Windows. Seleccionar/aislar audio remoto de la sesión; investigar loopback por proceso frente a captura de pestaña con sus permisos. Probar un retorno de voz soportado hacia el dispositivo/track que consume Meet. Capturar salida no crea una entrada de micrófono.
3. Experimento B: Electron actual como host experimental, separando main (coordina/IPC) y renderer (WebAudio/streams). No invocar navigator/AudioContext en main. Usar el mismo texto de voz y contraparte, con un build/instalador de fuente conocida generado por la ruta de entrega permitida; no comparar cambios fuente con el instalador antiguo como si fueran equivalentes.
4. Mantener captura entrante, salida TTS y monitor local separados; no mezclar todo el audio del sistema como entrada al Brain. Si se requiere driver/dispositivo virtual nuevo, documentar la necesidad y alternativa; no instalar ni cambiar dispositivos predeterminados silenciosamente.
5. Exponer capacidades reales (available/unavailable/unverified), nivel de canal, permiso, dispositivo elegido y fallo. No declarar LISTENING antes de obtener stream vivo.

## Contrato
Adaptador AudioPort: prepare → captureRemote → sendSpeech(turnId,generation,audio) → cancelSpeech(generation) → release. Decodificador/cola persisten en el contexto que posee AudioContext; la cancelación detiene fuentes y vacía cola. Configuración por sesión, no autoridad aportada por el modelo.

## Aceptación productiva
- A01: contraparte lee frase ficticia; transcripción coincide y no toma el micrófono local como sustituto del interlocutor.
- A02: contraparte oye el saludo TTS desde su propio dispositivo, con micrófono físico del agente silenciado; la prueba no depende de altavoces reentrando por el micrófono.
- A02b: voz TTS y aviso ajeno no reaparecen como nuevos turnos del cliente.
Registrar audio route, versiones, timestamps y confirmación de contraparte. No grabar audio bruto por defecto. Si no hay canal bidireccional comprobado, el candidato falla aunque reproduzca audio local.

## Riesgos, salida y reversión
Echo, captura de otra reunión, Bluetooth/reselección de dispositivos, permisos/autoplay y compatibilidad de softphone. Salida: matriz de A/B con A01/A02 reales. Reversión: liberar tracks y rutas de prueba, restaurar solo cambios explícitos de esta sesión; conservar navegador/perfil del usuario. Sin nueva dependencia productiva hasta decisión MVP-005.
