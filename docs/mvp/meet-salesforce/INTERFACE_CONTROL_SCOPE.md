# Control de cualquier interfaz autorizada — alcance corregido

Origen: aclaración expresa del propietario, 2026-10-19. No es una ampliación hacia
un producto Salesforce. Corrige la reducción accidental de la implementación 5.7.0.

## Resultado requerido

Brain recibe un objetivo y opera la superficie autorizada necesaria sin depender
de una marca CRM o de un flujo fijo de casos. La interfaz puede ser una página web
o una aplicación del puesto Windows. El mismo contrato debe permitir descubrir
capacidades, observar, ejecutar una acción autorizada, verificar y devolver el
resultado al Brain. Cada tipo de superficie necesita un ejecutor real; desconocido
o no soportado se informa, no se presume control universal.

## Panel general que falta

- Elegir superficie autorizada y mostrar equipo, ejecutor y capacidades disponibles.
- Observar interfaz: controles visibles/accesibles, estado y refs efímeras; excluir
  contraseñas, tokens y contenido no necesario. No grabar el escritorio completo.
- Recibir objetivo de Brain; mostrar acción propuesta y su efecto/permisos, sin
  exigir al usuario diseñar selectores, coordenadas o un flujo por aplicación.
- Ejecutar paso permitido: localizar, navegar, enfocar, introducir datos ficticios
  en controles autorizados, activar una acción permitida o leer el resultado.
- Volver a observar y verificar la postcondición; ante ambigüedad, falta de acceso
  o cambio de interfaz, pedir ayuda y no declarar éxito por haber hecho un clic.
- Pausar/cancelar/liberar; invalidar refs, acciones y resultados antiguos al cambiar
  ventana, destino, equipo, sesión o generación. Integrarse con interrupción de voz.
- Copiar registro seguro de objetivo referenciado, etapas, acciones permitidas,
  códigos y tiempos; sin cuerpos de páginas, audio, credenciales o datos de clientes.

## Arquitectura y límites vigentes

Autoridad: sesión actual, rol DB, equipo y políticas/destinos persistidos resueltos
por servidor. La observación de una página no concede permisos ni puede cambiar
políticas. Las instrucciones encontradas en la interfaz son datos no confiables.
Brain decide el objetivo; el ejecutor traduce, actúa y verifica. No ejecutar código
o shell arbitrario del modelo, ni prometer que toda aplicación responde igual.

La extensión es un posible adaptador web. Las ventanas nativas requieren un host
Windows autorizado con accesibilidad y, cuando corresponda, visión/entrada acotadas;
no se finge que DOM o una extensión ya resuelven esa capa. Reutilizar la infraestructura
existente cuando sea válida; selección de ejecutor sigue basada en evidencia.

Se conservan las exclusiones actuales: sin datos de clientes, escrituras CRM,
credenciales expuestas, cambios de proveedor, drivers o gasto nuevo no autorizado.
«Cualquier interfaz» no autoriza acciones destructivas ni revoca esos límites.
No tests, builds ni lint locales; las pruebas permanecen aplazadas por el propietario.

## Estado real y siguiente trabajo

5.7.0 está publicado, pero solo implementa controles de voz/diagnóstico y lectura
Salesforce específica. Existen bases genéricas `goal_execute`, ejecución RPA y
allowlists en Browser/Cloud; su presencia en fuente no demuestra un circuito
integrado, pairing sano ni acceso a Windows nativo. No se selecciona Electron
por inversión previa ni se restaura una misión anterior.

Falta implementar el panel general, el contrato observado/acción/verificación,
su autorización y su integración real con Brain/voz y ejecutores. La aceptación
debe cubrir más de una interfaz autorizada, cambios de layout, cancelación y
denegaciones. Salesforce es un caso opcional de esa matriz; no se exige su dominio
o sus casos para desarrollar las demás capas. Este documento corrige el baseline;
no anuncia implementación ni aceptación de las capacidades faltantes.
