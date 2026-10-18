# Intent — agente Windows, Meet y Salesforce
Fecha: 2026-10-18 (America/Mexico_City). Originador: propietario de KELEDON, conversación actual.

## Problema
Hay componentes de voz, Brain, automatización y administración, pero no evidencia de una atención completa con audio remoto y consulta CRM. El Browser instalado v5.0.52 falla en pairing; ese incidente no explica ni resuelve todas las brechas del circuito. El mecanismo de ejecución se eligió antes de demostrar el circuito.

## Resultado deseado
Un agente Windows preparado, que perciba una interacción, confirme lo que ocurre, converse siguiendo el guion y conocimiento del Brain, pida un caso, opere Salesforce y responda con información verificada. Debe admitir interrupciones del interlocutor, terminar y volver a espera. El objetivo es expresar qué conseguir y observar el resultado; los clics y particularidades técnicas pertenecen a adaptadores.

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
Salesforce de prueba: URL, dos casos ficticios, resultado esperado y sesión iniciada por el propietario. Confirmar capacidad práctica del host para capturar/inyectar audio; se investiga, no se presume. Preparar sesión tenant/Brain autorizada con proveedores ya configurados. El acceso a Meet por sí solo no satisface esos requisitos.

## Slices vinculados
[Plan y PIAs](../mvp/meet-salesforce/README.md), [TASK](../../TASK.md).
