# PIA-AUTO-SEO-002 — metadata privada y rutas SPA inexistentes

Estado: IMPLEMENTACIÓN PREPARADA EN CANDIDATO 5.2.9 / ACEPTACIÓN PRODUCTIVA PENDIENTE · Prioridad: SEO-02/04/05, AG-02/13 · Run: `20261014-0007-phdk-auto-completion` · Detectado en 5.2.7 y revalidado en producción 5.2.8 (`main` `9aa0d452684d4bcf1b00bdb3321649ae4675877a`).

## Hallazgo productivo

La raíz pública es 200/indexable y la respuesta `/login` entrega correctamente `X-Robots-Tag: noindex, nofollow`; sin embargo, ambas reciben el mismo HTML estático, que todavía trae meta `index, follow` y canonical `/`. La metadata dinámica de `RouteMetadata` lo corrige después de cargar React. Además, una ruta aleatoria recibe `200` con el shell SPA, el mismo meta/canonical del home y el header noindex, lo que constituye un soft-404. El Router actualmente redirige su ruta comodín a `/` (`services/web/src/AppRouter.tsx`). Confirmado antes y después del despliegue de 5.2.8; revisar GETs redacted en `65-seo/snapshots/candidate-5.2.8/production-seo-before.json` y `production-seo-after.json`.

## Objetivo y contrato

Resolver la diferencia de metadata inicial y los estados HTTP de rutas desconocidas sin romper navegación directa a rutas válidas de React ni su aislamiento noindex. La raíz `/` continúa siendo el único contenido público indexable y canonical del sitemap. Rutas privadas válidas conservan login/app SPA, cabecera noindex y metadata noindex/no-canonical desde la primera respuesta si la arquitectura lo permite. Rutas no reconocidas deben mostrar una página 404 real y no redirigir al home como si fueran contenido público.

Antes de implementar, inventariar las rutas estáticas/dinámicas vigentes de `AppRouter.tsx` y elegir un mecanismo compatible con la imagen NGINX/Vite desplegada (por ejemplo, manifest de rutas generado compartido por servidor y frontend o shell/SSR por ruta). No escribir un allowlist manual incompleto que bloquee deep links legítimos. No ampliar superficies públicas, modificar autorización ni incluir rutas de tenant/registro en sitemap.

## Decisión técnica de esta PIA

La revisión de `services/web/src/AppRouter.tsx` encontró 45 declaraciones: la raíz pública, 41 rutas SPA estáticas, dos parámetros dinámicos (`/sessions/:id` y `/management/vector-store/edit-document/:id`) y un comodín. Se mantiene esa fuente de verdad y se añadió una lista equivalente en NGINX: regex opcionales de barra final para las 41 rutas estáticas y patrones acotados para los dos parámetros. El runtime Vite compila dos shells HTML: `index.html` para `/` con index/follow/canonical público y `app.html` para rutas SPA válidas con título Application, noindex/nofollow y sin canonical. NGINX sirve `app.html` internamente solo cuando la URI está en el mapa; archivos estáticos conservan `try_files`; rutas desconocidas reciben status 404 y un documento estático noindex/sin canonical. El comodín React muestra una pantalla No encontrado localizada, como defensa ante navegación interna o divergencia del mapa. Cualquier cambio de ruta debe actualizar Router y el mapa en el mismo PR.

## Aceptación exclusivamente en producción

- GET anónimo `/`: 200, index/follow, canonical exacto a `/`, home normal.
- GET anónimo `/login`: app/login conserva 200, noindex por header y meta, sin canonical de homepage en respuesta inicial ni tras React.
- GET anónimo de una ruta SPA válida profunda: shell esperado 200, noindex y navegación funcional; no requiere autenticarse ni enviar formularios.
- GET anónimo de una ruta de control sintética inexistente: 404 real, noindex, sin canonical de homepage y UI de no encontrado sin redirección al home.
- `/robots.txt` y `/sitemap.xml` continúan disponibles, y solo `/` permanece en sitemap.
- Probar fuente únicamente con revisión estática/`git diff --check`; no ejecutar suites o builds de aplicación localmente. La aceptación HTTP/navegador se hace en el sitio desplegado.

## Dependencias y salida

Revisar compatibilidad NGINX/Vite y el inventario de rutas antes de tocar servidor o Router. Entregar con versión y PR normales. La PIA cierra cuando cada caso productivo tenga status, robots/canonical y resultado redacted. Mientras tanto mantener SEO-02/04/05 y AG-02/13 como PARTIAL; no afirmar indexación o crawler behavior.
