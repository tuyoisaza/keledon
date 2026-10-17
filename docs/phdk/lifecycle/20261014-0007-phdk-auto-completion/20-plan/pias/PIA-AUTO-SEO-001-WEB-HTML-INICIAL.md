# PIA-AUTO-SEO-001 — contenido público en HTML inicial de Web

Estado: IMPLEMENTADO EN FUENTE / ACEPTACIÓN PRODUCTIVA PENDIENTE · Prioridad: requisito SEO-10/SEO-23 · Run: `20261014-0007-phdk-auto-completion` · Baseline: KELEDON Web 5.2.7, PHDK 2.53.1.

## Hallazgo

La lectura anónima del HTML de `https://keledon.tuyoisaza.com/` en producción devolvió título, descripción, canonical y directiva indexable, pero el elemento `#root` estaba vacío. El H1 y el contenido útil solo aparecían después de ejecutar JavaScript. La copia veraz ya está presente en `landing/index.html`, pero ese paquete no es el runtime desplegado de Railway.

## Objetivo y alcance

Exponer en el HTML inicial del runtime `services/web` el resumen público ya aprobado: función de Cloud, ejecución de Browser, interfaces de llamada/CRM configuradas por cliente y nota de que la página no muestra sesiones ni métricas reales. React reemplaza el resumen al arrancar. No se agregan afirmaciones, proveedores, rutas indexables, datos de clientes, telemetría ni dependencia de JavaScript para leer la descripción.

## Contrato de implementación

1. El documento principal conserva title, description, robots, canonical, idioma y URL actuales.
2. `#root` lleva un `main` con un H1, una explicación breve, tres pilares y la nota ilustrativa existente en Landing.
3. Los estilos de fallback se aplican solo mientras `<html>` conserva `no-js`; `services/web/src/main.tsx` quita la clase antes de montar React.
4. El cambio se entrega con patch bump coordinado de los cinco componentes versionados y renderer a 5.2.8.

## Aceptación y privacidad

La aceptación funcional se ejecuta únicamente en el sitio productivo, anónima y sin datos: comprobar respuesta 200 de `/`, H1 y texto del resumen en el HTML de respuesta, y después confirmar en navegador que Web reemplaza el fallback con la aplicación sin contenido duplicado ni error visible. No visitar login ni ejecutar acciones autenticadas como parte de esta PIA. No correr pruebas, builds o suites locales de aplicación. Revisiones de diff, formato y coherencia estática sí están permitidas.

La aceptación no afirma indexación de buscadores, rendering de crawlers, ranking, tráfico, Core Web Vitals, Search Console ni disponibilidad de la aplicación más allá de la respuesta y observación descritas. Mantener sin medir SEO-05/TLS, SEO-13–17 y SEO-24–25 según evidencia disponible.

## Evidencia actual y salida

- Antes del cambio, GET anónimo de producción: `/` 200, index/follow, title/description/canonical presentes; `#root` vacío y ningún H1 en el cuerpo inicial.
- Fuente propuesta en `services/web/index.html` y `services/web/src/main.tsx`; la observación de aceptación en producción se agrega después del despliegue y se registra bajo `65-seo/snapshots/candidate-5.2.8/`.
- Salida: SEO-10 y SEO-23 aceptados en el documento desplegado; crawler/descubrimiento externo sigue parcial y el handoff permite continuar con AEO/GEO sin inventar métricas.
