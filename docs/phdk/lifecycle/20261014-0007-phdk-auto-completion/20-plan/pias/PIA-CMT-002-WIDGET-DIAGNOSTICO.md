# PIA CMT-002 — widget, UX y diagnóstico seguro

## Candidate privacy regression — v5.2.7 (2026-10-17)

Static review of v5.2.6 found that Landing diagnostics reconstructed and copied the configured API hostname and OAuth redirect hostname, while Web withheld both. That contradicted the shared privacy contract and the earlier v5.2.3 fix. Candidate v5.2.7 removes hostname derivation from Landing and uses the same withheld fields as Web. A source regression contract was added but not run locally under the owner's production-only test instruction. After PR #247 merged as `a7ca8689265642e6fe1f2f69aa4fa2c90b81867b`, production Web v5.2.7's public copy action announced “Diagnóstico copiado”; clipboard contents were never read. This passes Web copy status plus Landing's source privacy contract only. Railway has no Landing service, and Web's Dockerfile builds `services/web` only, so Landing runtime remains BLOCKED until its authoritative deployment target is known.

Estado: ACTIVE / PARTIAL · Prioridad: 2 · Baseline productivo Web: KELEDON 5.2.7, source `a7ca8689265642e6fe1f2f69aa4fa2c90b81867b`; Landing runtime no disponible/verificado. UAT-112–130 cubren muestras públicas limitadas: CTA/disclosure, responsive, copia, teclado/foco, tamaños táctiles, árbol accesible y locale. UAT-130 pasa copy-status Web y redacción de Landing en fuente; Landing runtime está bloqueado por falta de target de despliegue verificado. UAT-129 es solo orden/foco pt/dark, no lector de pantalla ni WCAG integral. Diagnóstico protegido/RBAC, persistencia, otras rutas/temas/locales y audio siguen abiertos.

El detalle 5.2.4 de la sección siguiente es el baseline histórico de esta PIA; las revalidaciones vigentes se agregan al final.

## Resultado esperado

El widget público debe dejar claro cuándo muestra una demo y cuándo información real, exponer acciones útiles con teclado/lector de pantalla, mantener controles legibles en temas e idiomas admitidos y generar un diagnóstico copiable con redacción segura. Los detalles de salud/sondeos protegidos solo se ven para roles autorizados por la API; la interfaz no se usa para autorizar por sí misma.

## Cobertura a cerrar

1. Continuar en producción los recorridos públicos de `/` y `/login`: texto de demo, orden/etiquetas accesibles, foco/teclado y botones. Corregir el metadato `lang` observado en UAT-119 y validar idiomas ES/EN/PT, temas oscuro/claro/corporativo, desktop y móvil.
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
- UAT-113 pasa una muestra pública limitada de `/login` en 5.2.2/pt/1280×720: el árbol nombra email, contraseña y acciones; Tab alcanza correo/contraseña en orden y el foco visible muestra anillo teal. Los pares muestreados de texto/acción pasan en oscuro, claro y corporativo. No se ingresaron credenciales ni se activó login/OAuth/registro; comportamiento de autenticación, placeholders, lector de pantalla, combinaciones restantes y RBAC siguen pendientes. Evidencia: `50-uat/evidence/uat-113-production-login-public-accessibility-2026-10-17.json`.
- UAT-114 pasa presencia/disclosure limitados en el árbol accesible de la portada 5.2.2: versión, landmark, controles públicos nombrados y aviso explícito de que la interfaz es ilustrativa y no tiene sesiones/métricas en vivo. No midió viewport, captura visual, contraste del aviso ni lector de pantalla; no se activaron controles. Evidencia: `50-uat/evidence/uat-114-production-landing-demo-disclosure-2026-10-17.json`.
- UAT-115 pasa una muestra responsive de `/` en 320×720, 375×812 y 768×1024 en producción 5.2.2: sin overflow horizontal, disclosure/título dentro del viewport y menú de 44×44 px. Solo se inspeccionó visualmente 320 px; las otras dos medidas son DOM. No sustituye UAT desktop ni aceptación integral de accesibilidad. Evidencia: `50-uat/evidence/uat-115-production-responsive-layout-2026-10-17.json`.
- UAT-116 pasa el caso móvil `/` de producción 5.2.2 en español/corporativo a 375×812: aviso, título, acciones y menú nombrado se mantienen dentro del viewport; sin overflow y con objetivo 44×44. Se inspeccionó la captura. No se midió contraste; preferencias/viewport se restauraron. Evidencia: `50-uat/evidence/uat-116-production-spanish-corporate-mobile-2026-10-17.json`.
- UAT-117 observa en producción 5.2.3 el éxito accesible “Diagnóstico copiado” para visitante anónimo. La fuente fusionada omite los hostnames configurados de API y OAuth, reemplazándolos con texto fijo. No se leyó el portapapeles ni se probó el contenido íntegro; usuarios autenticados, fallo de portapapeles y diagnóstico profundo/RBAC continúan pendientes. Evidencia: `50-uat/evidence/uat-117-production-copy-status-2026-10-17.json`.
- UAT-118 pasa un muestreo público de teclado en producción 5.2.3: orden marca→copiar→limpiar→Recursos; los botones copiar/limpiar miden 44×44 px y muestran outline teal sólido de 2px. No se activaron controles ni se usó lector; resto del teclado y screen reader siguen pendientes. Evidencia: `50-uat/evidence/uat-118-production-diagnostics-keyboard-2026-10-17.json`.
- UAT-119 pasa el orden público de teclado en `/login` de producción 5.2.3, con Shift+Tab de Crear cuenta a Google; la página mantuvo `document.documentElement.lang=en` mientras mostraba portugués, y el estilo del foco en Crear cuenta calculó `outline:auto` 0.666667px. La sugerencia de autofill no se eligió ni se capturaron valores. Evidencia: `50-uat/evidence/uat-119-production-login-keyboard-2026-10-17.json`.
- 5.2.4 synchronizes `document.documentElement.lang` to the selected `es`, `en` or `pt` locale in both Web and Landing. UAT-120 confirms each value on production `/login`; Landing-specific runtime and other routes remain unverified.

## Casos y aceptación

| Caso | Criterio de aceptación | Evidencia requerida |
|---|---|---|
| WDG-PUB | Ruta y versión 5.2.2; la demo se identifica como ilustrativa; sin telemetría falsa | Captura/tree de accesibilidad, URL y SHA desplegado; UAT-112 registra versión y SHA actuales |
| WDG-A11Y | Foco visible, navegación teclado, nombres de acción, estado anunciado y targets/tamaño sin solapamiento en responsive | Resultado por locale/tema/viewports; hallazgos WCAG con severidad |
| WDG-DIAG | Copia informa éxito/fallo; el reporte no expone hostnames API/OAuth; tokens, secretos, cuerpos, query privada y PII siguen excluidos por el contrato seguro | UAT-117 verifica el estado visible y el source SHA; no leer ni adjuntar el portapapeles. Inspección integral del contenido queda pendiente |
| WDG-CACHE | Solo perfil desechable; limpieza no rompe sesión de otros perfiles ni persiste datos sensibles | Registro antes/después del perfil UAT |
| WDG-RBAC | Datos profundos se solicitan y muestran solo con rol autorizado; API deniega a no autorizados | Rol sintético, status HTTP y comportamiento de UI |
| WDG-AUDIO | Permiso y stream obedecen gesto explícito; error/stop liberan dispositivo; no hay grabación | Hardware/navegador de prueba, permiso y comprobación de stream detenido |

## Dependencias y bloqueo actual

La página pública de producción abierta en UAT reportó 5.2.1 en portugués, “interface ilustrativa; sem sessões ou métricas de serviço em tempo real”, y dos acciones de diagnóstico. UAT-106 amplía la aceptación pública: ES/EN, tema claro/corporativo, botones de 44×44 CSS px con foco visible, mensaje de copia sin leer el portapapeles y limpieza de estado local en una sesión anónima desechable con retorno a `/`. UAT-107 registró antes de corregir el recorte móvil, el solapamiento del aviso y el menú de 24×24px. PR #213 quedó fusionado en `5884b80ba4318b2c4beed3e50d94945028b9a311`; Railway confirmó el despliegue y UAT-108 **pasa el layout responsive** en 320/375/768px y desktop. UAT-109 encuentra que las muestras token/componentes para tema oscuro, claro y corporativo superan 4.5:1, pero no prueba fondos con gradientes, estados ni todos los elementos; no equivale a auditoría WCAG completa. Ver `50-uat/evidence/uat-108-production-mobile-layout-2026-10-17.json` y `50-uat/evidence/uat-109-production-theme-contrast-samples-2026-10-17.json`. Siguen pendientes contraste integral, lector de pantalla, diagnóstico autenticado/RBAC, audio y combinaciones completas de locale/tema. No existe identidad sintética productiva ni hardware de prueba autorizado; casos autenticados/audio siguen BLOCKED. Evidencias: `50-uat/evidence/uat-106-production-widget-actions-and-keyboard-2026-10-17.json`, `50-uat/evidence/uat-107-production-mobile-layout-2026-10-17.json`, `50-uat/evidence/uat-108-production-mobile-layout-2026-10-17.json` y `50-uat/evidence/uat-109-production-theme-contrast-samples-2026-10-17.json`.

## Reglas de privacidad

No guardar transcripción, grabación, IDs de clientes, token/cookie, campos de formulario, URL privada, cuerpo de request, portapapeles completo ni salida de diagnóstico profundo. Redactar screenshot/AX trace cuando aparezcan nombres/correos. La evidencia distingue observación pública, sintética, autenticada y manual.

## Production readback — 2026-10-17

UAT-122 confirms with fresh HTTPS requests that `/` and `/login` serve the same current 5.2.4 content-hashed bundle, matching Railway SUCCESS for current main. The older `v5.2.3` visible in an already-open browser page was stale page state, not the current served asset. This closes only a CMT-001/002 route-version reconciliation check. It does not add browser interaction, accessibility, diagnostic-RBAC, authenticated, or audio acceptance. See `50-uat/evidence/uat-122-production-served-asset-version-2026-10-17.json`.

UAT-123 on the current production homepage confirms basic accessibility-tree presence at v5.2.4: demo disclosure, named public actions/selectors, main landmark, headings and navigation. This adds no keyboard, screen-reader, contrast, diagnostic-RBAC or audio acceptance. See `50-uat/evidence/uat-123-production-public-accessibility-tree-2026-10-17.json`.

UAT-124 adds a production keyboard/focus sample in pt/dark/1280×720. Header Tab order proceeds through all sampled controls to the hero CTA; Shift+Tab returns correctly. Focus remains visible, with custom 2px teal rings on diagnostic/cache buttons and theme/language selectors. Some anchors compute a sub-1px `outline:auto`, but the observed screenshot shows the system ring; this sample is not recorded as a defect. Other browsers/OS, zoom, high-contrast, screen reader and complete locale/theme/route matrices remain open. Evidence: `50-uat/evidence/uat-124-production-keyboard-focus-2026-10-17.json`.

UAT-125 on production v5.2.4 (`0aaabaf3530cf9dba6316ae75ddc9cc8763dbd78`, Web deployment `c45e4603-5f0d-4052-8704-4370da4bffa7`) found a PHDK target-size gap in the open mobile navigation at 320×720: the three navigation links measured 40px high; theme and language selects measured 23px and 32px. PR #240 raised the menu links/actions and shared Web/Landing preference controls to 44px minimum. Production v5.2.5 (`fb2e4b4c5c4c869ae2962c2eadb49a4673fffdbe`, Web deployment `fd191399-f4bf-4da5-ba4c-e4f3d9f65ac3`, `SUCCESS`) now measures all eight menu controls at 44px at both 320×720 and 375×812, with no overflow: UAT-125 passes its scoped target-size case. See `50-uat/evidence/uat-125-production-mobile-menu-targets-retest-2026-10-17.json`.

The same v5.2.5 retest found the adjacent header's KELEDON home link at 113×32px. UAT-126 records this PHDK target-size baseline failure; `50-uat/evidence/uat-126-production-mobile-brand-target-baseline-2026-10-17.json` preserves it. PR #241 sets a 44px minimum in Web and Landing, and the v5.2.6 production retest passes at 320×720 and 375×812: the logo/home link and all measured public header/menu controls meet 44px with no overflow. See `50-uat/evidence/uat-126-production-mobile-brand-target-retest-2026-10-17.json`. Full accessibility, screen-reader, zoom, authenticated RBAC and audio gates remain open.

PR #241 merged as `e7257a7d0c66c8b34e6bbb7028c30be092f33102`; Railway Web `874b29df-7c7d-4e3b-a41d-8ec7339bfde8` and API `da84fde5-06fd-4bc8-be2f-2cafe409d979` report `SUCCESS`. UAT-126 retest on the deployed Web v5.2.6 measures the home link and all visible mobile header/menu controls at 44px minimum at 320×720 and 375×812, with no horizontal overflow. This closes only the sampled target-size finding; broader accessibility remains partial. Evidence: `50-uat/evidence/uat-126-production-mobile-brand-target-retest-2026-10-17.json`.


## Revalidación UAT-127 — producción 5.2.6 (2026-10-17)

UAT-127 confirma presencia de los elementos semánticos públicos en el árbol accesible de la portada desplegada: versión, landmark principal, aviso de demo, acciones públicas nombradas, selectores, navegación, encabezados y enlaces. Es una muestra de árbol, sin lector de pantalla/voz. Se registró una primera navegación con Cloudflare 502 y una segunda carga exitosa; el estado Railway mostró Web/API Online, despliegues SUCCESS y sin fallas recientes, pero no se determinó la causa del primer 502. Evidencia: `50-uat/evidence/uat-127-production-public-ax-presence-2026-10-17.json`. No cierra accesibilidad integral, autenticación, RBAC ni audio.


## Revalidación UAT-128 — post-merge producción 5.2.6 (2026-10-17)

Tras el merge documental #244 y despliegues Web/API SUCCESS, una sesión anónima nueva volvió a exponer versión, landmark principal, aviso ilustrativo y controles/enlaces nombrados. La primera navegación cargó correctamente. Esto confirma presencia AX únicamente; no cubre voz de lector, interacción, WCAG completa ni rutas autenticadas. Evidencia: `50-uat/evidence/uat-128-production-postmerge-public-ax-2026-10-17.json`.


## Revalidación UAT-129 — teclado/foco público en producción (2026-10-17)

El recorrido anónimo de 11 Tab atravesó controles del encabezado y llegó al CTA principal sin activar elementos. Foco visible confirmado en “Casos de uso” y CTA; sin trampa de header observada. UAT-129 pasa únicamente orden/foco de esta secuencia pt/dark; no cubre lector de pantalla ni conformance WCAG integral. Evidence: `50-uat/evidence/uat-129-production-public-keyboard-focus-2026-10-17.json`.
