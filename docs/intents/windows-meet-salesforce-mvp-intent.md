# Intent — agente Windows y control de cualquier interfaz autorizada
Fecha: 2026-10-18 (America/Mexico_City). Originador: propietario de KELEDON, conversación actual.

## Aclaración vinculante del propietario — 2026-10-19

El objetivo es **cualquier interfaz autorizada**, no Salesforce. Meet y Salesforce
son entornos iniciales para contrastar capacidades, nunca dependencias del núcleo,
requisitos de entrada ni la definición de un MVP completo. La extensión controla
superficies web; una aplicación Windows nativa requiere un adaptador de ejecución
del puesto. No se puede llamar universal a un conjunto de selectores de Salesforce.
El núcleo debe observar → decidir por objetivo → actuar dentro de permisos →
volver a observar/verificar → informar al Brain, con cancelación y evidencia.
La falta de un dominio/caso Salesforce no bloquea desarrollar ese núcleo general.
La implementación 5.7.0 es parcial y específica; no satisface todavía este objetivo.

## Problema
Hay componentes de voz, Brain, automatización y administración, pero no evidencia de una atención completa con audio remoto y consulta CRM. El Browser instalado v5.0.52 falla en pairing; ese incidente no explica ni resuelve todas las brechas del circuito. El mecanismo de ejecución se eligió antes de demostrar el circuito.

## Resultado deseado
Un agente Windows preparado, que perciba una interacción, confirme lo que ocurre,
converse siguiendo el guion y conocimiento del Brain, opere la interfaz autorizada
necesaria para el objetivo y responda con información verificada. Debe admitir
interrupciones del interlocutor, terminar y volver a espera. Buscar un caso es un
ejemplo de objetivo, no el único objetivo del sistema. Los clics y particularidades
técnicas pertenecen a adaptadores, no a flujos de negocio fijos por proveedor.

## Decisiones del propietario
- Meet y Salesforce reales son los primeros entornos; no construir un clon de telefonía/CRM.
- Genesys está disponible para una fase posterior; no es proveedor universal.
- La alarma sonora despierta al agente; debe observar la interfaz y confirmar qué interacción existe.
- Windows primero. AppleScript/Mac no son solución para este MVP.
- Evaluar Electron, navegador estándar más componente local y ejecución nativa sin defender de antemano el Browser existente.
- El propietario aportó un enlace Meet dedicado y confirmó interlocutor desde otro equipo/teléfono. El enlace es contexto privado de ejecución, nunca material Git.
- La autorización actual reemplaza la restricción histórica de preservar Electron/no reevaluar arquitectura para esta investigación y MVP; no ordena reescribir toda la plataforma.

## Límites
Conservar autoridad del Brain y políticas de tenant, identidad, secretos y destinos. Sin credenciales en mensajes/Git, datos de clientes, escrituras CRM, cambios de proveedor, gasto nuevo ni instalación de drivers sin una decisión específica. Las pruebas funcionales siguen siendo producción + plataformas reales con datos ficticios; no tests/build/lint locales. El componente Windows se verifica en el puesto real como parte de ese circuito, no contra un servidor local de aplicación. No inferir permisos de grabación/publicación por permiso de participar; evidencia mínima con métricas sin audio bruto por defecto.

## Preguntas materiales pendientes para ejecutar pruebas
Estas necesidades son de la prueba específica de Salesforce, no prerrequisitos
del control general. La prueba de otra interfaz requiere su propia superficie
autorizada, datos ficticios y resultado esperado. Ningún escenario no ejecutado
se marca aprobado.
Salesforce de prueba: URL, dos casos ficticios, resultado esperado y sesión iniciada por el propietario. Confirmar capacidad práctica del host para capturar/inyectar audio; se investiga, no se presume. Preparar sesión tenant/Brain autorizada con proveedores ya configurados. El acceso a Meet por sí solo no satisface esos requisitos.

## Slices vinculados
[Plan y PIAs](../mvp/meet-salesforce/README.md), [TASK](../../TASK.md).

## Voz configurable — decisión del propietario, 2026-10-26
La voz final no depende del catálogo instalado en Windows. Cada cliente/equipo debe poder configurar proveedor TTS, idioma y variante regional, voz, velocidad y estilos que el proveedor realmente soporte (por ejemplo formal, cordial o empático). El Brain determina el contenido; la configuración vocal determina su expresión. No se prometerán estilos inexistentes ni cambios silenciosos de proveedor. La primera aceptación del MVP exige una voz española de proveedor oída desde el interlocutor remoto, interrupción y segunda interacción; un WAV/voz local solo acredita su prueba de transporte cuando se observa, no la capacidad final. La ampliación de catálogo/estilos es requisito retenido, no implementación ya aceptada.
