# PIA MVP-004 — Salesforce por objetivo y observación
Estado: preparación READY; Salesforce/casos pendientes. Requisitos MVP-R04/R06/R08/R09.

## Comportamiento
Objetivo del Brain: buscar el número de caso proporcionado por el interlocutor y leer estado/resumen ficticio. CRM es una capacidad configurable; Salesforce es la primera referencia, no dependencia del Brain. El MVP no crea ni edita casos, notas, contactos ni disposición.

## Implementación
1. Vincular la sesión a un origin Salesforce exacto autorizado por tenant; propietario inicia sesión por sí mismo. No enviar cookies/credenciales al modelo. Reutilizar allowlist y autoridad persistida; nunca confiar en IDs de tenant propuestos por el ejecutor.
2. Herramientas: search_case(caseNumber), read_case(surfaceRef), cancel; entradas limitadas al caso ficticio y superficie autorizada. Click/fill/navigate/extract son operaciones internas del ejecutor, no permisos globales.
3. Observar DOM/accesibilidad actual, encontrar controles semánticos, ejecutar acción acotada y volver a observar. Selectores versionados/caché como ayuda, no un flujo entero fijo por cliente. Capturas/visión solo si el DOM no basta y con contexto mínimo.
4. Brain selecciona objetivo y acción autorizada; resolver mecánico traduce a controles sin inventar decisiones de negocio. Texto de páginas es datos no confiables, nunca nuevas instrucciones que habiliten acciones/destinos.
5. Si hay cero, varios o un caso diferente: preguntar/desambiguar; no elegir por aproximación. Extraer solo campos ficticios necesarios; resultado al Brain con caseMatch, campos permitidos, observación y outcome.
6. Registrar acciones sin cuerpos CRM, URLs con query ni screenshots completos en logs. Si un acceso HTTP externo no existe, no prometer que UI genérica descubre permisos o campos de negocio automáticamente.

## Aceptación
- A07: caso ficticio conocido → coincidencia exacta y estado esperado confirmado; caso inexistente → no inventa resultado.
- A08: estado leído vuelve al Brain y su respuesta hablada coincide con el dato del caso.
- A10: variación controlada de navegación/layout permite encontrar el mismo objetivo o declara needs_assistance; registrar intervención y configuración requeridas. Si se necesitan selectores específicos, documentarlo.
- A12: navegación fuera del origin, intento de escritura o texto de página que pide revelar secretos quedan rechazados.
Dos casos y sus resultados esperados los aporta el propietario en privado. No usar clientes reales para desbloquear la prueba.

## Salida/reversión
Reporte de objetivos, observaciones mínimas y aciertos/ambigüedades. Cerrar solo pestañas creadas por la prueba; no cerrar sesión habitual, borrar caché global ni modificar Salesforce. Integración depende del AudioPort/Brain verificados y de la sesión accesible, no de una API Salesforce obligatoria.
