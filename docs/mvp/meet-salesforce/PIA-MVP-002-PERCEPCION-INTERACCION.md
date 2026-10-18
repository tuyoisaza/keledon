# PIA MVP-002 — despertar acústico y confirmación de interfaz
Estado: diseño READY; detector sin implementar. Requisitos MVP-R03/R07/R09.

## Implementación
1. Adaptador AlertObserver sobre la fuente aprobada: detectar firma acústica/configuración de alerta, no cualquier volumen. Calibrar con señal real y negativos; no grabar el escritorio completo.
2. Emitir alert_candidate con reloj monotónico, superficie y confianza; debounce y cooldown configurables. No atribuir una conversación por sonido solamente.
3. InteractionObserver inspecciona la ventana/pestaña autorizada mediante DOM/accesibilidad; visión solo como fallback acotado. Confirmar interacción ofrecida, control de aceptar y contexto; ambigüedad → needs_assistance.
4. Contexto por interacción: evidencia, surfaceRef, interactionRef, generación y estado. Unir alerta y observación dentro de ventana temporal; invalidar al cerrar/cambiar sesión.
5. En Meet identificar los eventos que realmente ofrece (p. ej. solicitud de ingreso si la reunión la produce); si no existe señal acústica natural, registrar UNSUPPORTED_FOR_ALERT_CASE, sin fabricar un ring ni anunciar aceptación ACD. Admitir ingreso manual explícito al circuito de voz mientras A03 queda pendiente para Genesys u otra plataforma real.
6. Evitar auto-answer por notificación genérica, mensaje no asignado, pestaña fuera de allowlist o sesión ya activa.

## Aceptación
- A03: alerta real produce candidato y una observación de UI confirmada antes de aceptar; registrar si el sistema real no ofrece esa señal.
- A04: alarma ajena, repetición de alerta y pantalla sin interacción no contestan ni crean llamadas duplicadas.
- A04b: tras reconexión, reconciliar estado actual; no reproducir alertas antiguas como llamadas nuevas.
Meet no cierra la detección ACD. El propietario ya indicó disponibilidad de Genesys para la fase siguiente; no exige adoptarlo como proveedor universal.

## Dependencias y reversión
Audio observador de 001 para la señal; UI observer reutilizable con 004. Parar observadores y cancelar candidatos al desarmar. Riesgo principal: falso positivo con respuesta externa; por eso solo confirmar interacción reconocida y autorizada. Resultado: matriz de señales soportadas por plataforma y evidencia de falsos positivos.
