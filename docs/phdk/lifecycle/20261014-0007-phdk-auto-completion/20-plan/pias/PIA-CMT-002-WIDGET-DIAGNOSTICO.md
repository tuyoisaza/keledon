# PIA CMT-002 — widget, UX y diagnóstico seguro

Estado: ACTIVE / PARTIAL · Prioridad: 2 · Producción observada: KELEDON 5.2.2 (source `818ac9c8f1043cfc04768c30770f505b48d5087c`). UAT-112 pasa las muestras planas del CTA; la aceptación integral continúa abierta.

## Resultado esperado

El widget público debe dejar claro cuándo muestra una demo y cuándo información real, exponer acciones útiles con teclado/lector de pantalla, mantener controles legibles en temas e idiomas admitidos y generar un diagnóstico copiable con redacción segura. Los detalles de salud/sondeos protegidos solo se ven para roles autorizados por la API; la interfaz no se usa para autorizar por sí misma.

## Cobertura a cerrar

1. Repetir en producción 5.2.1 los recorridos públicos de `/` y `/login`: versión desplegada, texto de demo, orden/etiquetas accesibles, foco/teclado y botones. Capturar los casos en ES/EN/PT y oscuro/claro/corporativo, desktop y móvil, mediante sesión de navegador de UAT.
2. Verificar la acción “Copiar diagnóstico” solo hasta el estado visible de éxito/error; no exportar ni adjuntar portapapeles. Revisar el reporte por allowlist/redacción en source antes de autorizar un diagnóstico real.
3. Verificar “Limpiar caché” únicamente en un perfil de navegador de UAT desechable; registrar recarga y estado final. No borrar almacenamiento del perfil personal/productivo compartido.
4. En sesión sintética, probar visibilidad de diagnóstico: user/coordinator no obtienen diagnóstico profundo; admin/superadmin reciben solo los detalles permitidos por contrato y autorización servidor. Incluir denegación 401/403 y API no disponible. No fabricar resultados de health.
5. Hacer UAT de micrófono/audio/dispositivos solo en hardware de prueba autorizado con permiso de micrófono visible y datos sintéticos. No grabar ni almacenar voz. Medir compatibilidad por navegador/OS, estados de permiso, desconexión y recuperación.

### Progreso en producción — 2026-10-17

- UAT-108 cierra el hallazgo responsive específico después del despliegue de PR #213: 320/375/768/1440 CSS px pasan sin overflow y con aviso/CTA dentro de viewport.
- UAT-109 pasa solo las muestras documentadas de contraste de tokens, texto principal/aviso y CTA en temas oscuro/claro/corporativo; no equivale a conformidad WCAG completa.
- UAT-110 pasa una muestra limitada de árbol accesible y orden/foco de teclado en `/`, portugués, oscuro, 1280×720. Se observan landmark principal, encabezados, controles con nombre, foco visible y ausencia de trampa en el ciclo de la cabecera. No se usó lector de pantalla ni se activaron controles.
- UAT-108/109/110 prueban comportamiento público en la producción 5.2.1 del commit `5884b80ba4318b2c4beed3e50d94945028b9a311`. La aceptación completa por lector de pantalla, idioma/tema/viewport, diagnóstico autenticado/RBAC y audio/dispositivo siguen abiertas.
- UAT-111 amplió el muestreo al CTA inferior y encontró un fallo real no cubierto por UAT-109: el título del CTA mide 2.38:1 en tema oscuro y 1.49:1 en corporativo; el botón blanco “Começar” mide 2.49:1 en oscuro. Se corrigió la fuente candidata en Web y Landing con tokens semánticos; la validación de aceptación queda pendiente en el despliegue 5.2.2. Ver `50-uat/evidence/uat-111-production-cta-theme-contrast-2026-10-17.json`.
- UAT-112 revalidó en producción 5.2.2 el título/descripción del CTA a 7.84:1 oscuro, 5.47:1 claro y 9.83:1 corporativo; la etiqueta principal quedó a 18.68:1, 17.06:1 y 13.53:1. Pasa solo estos pares de color plano; faltan contraste integral, lector de pantalla, diagnóstico autenticado/RBAC y audio/dispositivo. Evidencia: `50-uat/evidence/uat-112-production-cta-theme-contrast-2026-10-17.json`.

## Casos y aceptación

| Caso | Criterio de aceptación | Evidencia requerida |
|---|---|---|
| WDG-PUB | Ruta y versión 5.2.1; la demo se identifica como ilustrativa; sin telemetría falsa | Captura/tree de accesibilidad, URL y SHA desplegado |
| WDG-A11Y | Foco visible, navegación teclado, nombres de acción, estado anunciado y targets/tamaño sin solapamiento en responsive | Resultado por locale/tema/viewports; hallazgos WCAG con severidad |
| WDG-DIAG | Copia informa éxito/fallo; reporte no contiene tokens, secretos, cuerpos, query privada, PII ni hostname/URL privada | Inspección del contrato y evidencia redacted del estado, nunca clipboard completo |
| WDG-CACHE | Solo perfil desechable; limpieza no rompe sesión de otros perfiles ni persiste datos sensibles | Registro antes/después del perfil UAT |
| WDG-RBAC | Datos profundos se solicitan y muestran solo con rol autorizado; API deniega a no autorizados | Rol sintético, status HTTP y comportamiento de UI |
| WDG-AUDIO | Permiso y stream obedecen gesto explícito; error/stop liberan dispositivo; no hay grabación | Hardware/navegador de prueba, permiso y comprobación de stream detenido |

## Dependencias y bloqueo actual

La página pública de producción abierta en UAT reportó 5.2.1 en portugués, “interface ilustrativa; sem sessões ou métricas de serviço em tempo real”, y dos acciones de diagnóstico. UAT-106 amplía la aceptación pública: ES/EN, tema claro/corporativo, botones de 44×44 CSS px con foco visible, mensaje de copia sin leer el portapapeles y limpieza de estado local en una sesión anónima desechable con retorno a `/`. UAT-107 registró antes de corregir el recorte móvil, el solapamiento del aviso y el menú de 24×24px. PR #213 quedó fusionado en `5884b80ba4318b2c4beed3e50d94945028b9a311`; Railway confirmó el despliegue y UAT-108 **pasa el layout responsive** en 320/375/768px y desktop. UAT-109 encuentra que las muestras token/componentes para tema oscuro, claro y corporativo superan 4.5:1, pero no prueba fondos con gradientes, estados ni todos los elementos; no equivale a auditoría WCAG completa. Ver `50-uat/evidence/uat-108-production-mobile-layout-2026-10-17.json` y `50-uat/evidence/uat-109-production-theme-contrast-samples-2026-10-17.json`. Siguen pendientes contraste integral, lector de pantalla, diagnóstico autenticado/RBAC, audio y combinaciones completas de locale/tema. No existe identidad sintética productiva ni hardware de prueba autorizado; casos autenticados/audio siguen BLOCKED. Evidencias: `50-uat/evidence/uat-106-production-widget-actions-and-keyboard-2026-10-17.json`, `50-uat/evidence/uat-107-production-mobile-layout-2026-10-17.json`, `50-uat/evidence/uat-108-production-mobile-layout-2026-10-17.json` y `50-uat/evidence/uat-109-production-theme-contrast-samples-2026-10-17.json`.

## Reglas de privacidad

No guardar transcripción, grabación, IDs de clientes, token/cookie, campos de formulario, URL privada, cuerpo de request, portapapeles completo ni salida de diagnóstico profundo. Redactar screenshot/AX trace cuando aparezcan nombres/correos. La evidencia distingue observación pública, sintética, autenticada y manual.
