# Preparación MVP — evidencia y límites
Fecha: 2026-10-18 (America/Mexico_City).
Baseline fuente main 2decd79b6fd741d1f5838a091b2b1c4436740acf, producto 5.2.21.
PHDK canónico/instalado 2.56.0, updater CURRENT, SHA 12bfc70134fca8b5350fde84c01e3110f6d54544; coherencia estática 69/69.

## Entrega concreta
Intent actualizado y decisión ADR-MVP-001 abren el ejecutor. Cinco PIAs y MS-MVP-000..003 cubren audio, percepción, conversación, Salesforce y circuito/elección. Contrato experimental no integrado en runtime. Inventario Windows solo lectura ejecutado y documentado. Ninguna ruta de aplicación ni seis archivos Browser previos se incluyen en esta entrega.

## Comprobaciones realizadas
- Sintaxis PowerShell: Parser.ParseFile, cero errores; comprobación estática.
- Herramienta de inventario: Windows AMD64 build 26300, Chrome 152.0.7977.76, Edge 155.0.4283.62; 2 endpoints capture activos y 2 render activos. [Resultado](HOST_INVENTORY.json). No cambia dispositivo predeterminado, permisos, registro ni archivos del usuario; no captura sonido.
- 17 archivos de preparación inspeccionados: JSON sintácticamente válido, enlaces Markdown locales existentes, ningún enlace privado Meet, ejemplo cotejado con campos obligatorios/origin/read_only. Cotejo estático, no validador completo JSON Schema.
- Diff revisado: alcance documental + contrato + inventario; sin credenciales/enlaces Meet ni cambios productivos de aplicación. Whitespace revisado antes del commit.

## No probado
A01..A12: NOT RUN. No reunión iniciada, audio capturado/enviado, llamada atendida, Salesforce consultado ni proveedores cambiados. Inventario no prueba permisos, routing, loopback, micrófono virtual, interrupción o compatibilidad. No tests/build/lint de aplicación locales. No nuevo instalador ni release de aplicación; versión producto sigue 5.2.21.

## Entradas del propietario
Meet privado y participación desde segundo dispositivo recibidos. Pendientes: Salesforce de prueba con sesión iniciada por propietario, dos casos ficticios y sus estados esperados, y selección/verificación del equipo Brain con proveedores existentes. Sin contraseñas/tokens por mensajes.
Siguiente implementación: AudioPort y prueba A01/A02/A06 con extremo remoto, siguiendo MVP-001 y MVP-003. Salesforce no bloquea ese desarrollo ni el audio; sí bloquea su prueba CRM.

## Publicación
El commit/PR y main se verifican después de publicar; evidencia final en DELIVERY_EVIDENCE.local.json (artefacto local post-merge). Esta preparación no es el MVP funcional ni la finalización de los cuatro compromisos.
