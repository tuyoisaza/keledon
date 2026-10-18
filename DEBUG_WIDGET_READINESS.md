# PHDK Auto Debug Widget Readiness — KELEDON Web 5.2.7 / Landing source (2026-10-17)

## Production revalidation — 5.2.15 / UAT-151 (2026-10-18)

Fresh Chrome production `/login` displays v5.2.15. AX exposes “Copiar diagnóstico completo” and “Limpiar caché”; read-only DOM measurement found 44×44 CSS px targets and no horizontal overflow at the active 1581px viewport. Evidence: `docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/50-uat/evidence/uat-151-production-login-widget-2026-10-18.json`. This is a scoped desktop login sample only; neither action was activated and no claim is made about clipboard payload, cache clearing, mobile, screen reader, authenticated mounts, Landing runtime or native Browser rendering.

Production UAT-150 separately found `/admin/interfaces` missing from Nginx's SPA route allowlist; see `docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/50-uat/evidence/uat-150-admin-interfaces-spa-allowlist-2026-10-18.json` and candidate 5.2.16 review.

## Historical source readiness record — 5.2.7 (2026-10-17)

Web product source/main `a7ca8689265642e6fe1f2f69aa4fa2c90b81867b`; PHDK 2.53.1. Production UAT-130 observed Web copy status “Diagnóstico copiado” without reading clipboard contents. Landing API/OAuth hostname redaction passes source review; the standalone Landing package is not included in Railway's Web deployment, so its runtime remains BLOCKED. No local app tests/builds were run for that historical candidate.

| Superficie/requisito | Evidencia actual | Estado |
|---|---|---|
| Web público y home | `services/web/src/components/common/Navbar.tsx`: marca y `VersionActions` en columna superior izquierda; producción v5.2.7 muestra control nombrado y anuncia el éxito de copia en UAT-130. | PASS para estado de copia Web; contenido clipboard no inspeccionado. |
| Login | `services/web/src/pages/LoginPage.tsx`: marca, luego widget y controles de tema/idioma dentro de header fijo `left-4 top-4`. | PASS para montaje de fuente; runtime ya observado, geometría exacta no medida en esta revalidación. |
| Aplicación y admin Web | `services/web/src/components/layout/Sidebar.tsx`: `VersionActions` en la cabecera y estado responsive del sidebar. Roles/diagnóstico profundo continúan protegidos por API. | PASS para montaje de fuente; autorización autenticada no aceptada. |
| Landing | `landing/src/lib/debug-report.ts` ahora omite hostnames API/OAuth como Web; `landing/test/diagnostics-redaction-contract.test.cjs` registra la regresión. Railway inventory no incluye Landing y el Dockerfile Web construye `services/web`. | FIXED IN SOURCE; runtime BLOCKED por target no identificado. Prueba agregada, no ejecutada localmente. |
| Browser/Electron | `browser/renderer/index.html` coloca marca en la fila superior y la fila de versión/acciones en la barra de navegación; `version-actions.js` nombra botones y gestiona estados; CSS usa targets de 44×44, tile visual de 28×28, icono 14px y versión 12px. | PASS estático para contrato fuente; rendering del paquete Electron no verificado. |
| Formato de versión | Web `VersionActions.tsx` acepta solo `X.Y.Z` numérico y presenta `vX.Y.Z`; Browser también valida semver antes de actualizar la versión de renderer. | PASS de fuente. |
| Copia y diagnóstico real | Web `copyDebugReport()` genera el reporte allowlisted/redacted y espera `navigator.clipboard.writeText`; Browser reúne info de dispositivo/runtime y eventos limitados antes de copiar. UAT-117 confirma feedback y omisión de hostname, sin inspeccionar clipboard. | PASS limitado por fuente/UAT-117; payload completo no inspeccionado en producción. |
| Limpieza | Web limpia solo claves/caches/cookies propias accesibles, cierra la sesión local y verifica errores; Browser desconecta runtime, limpia log local y reload tras confirmación. HTTP cache global y cookies HttpOnly quedan fuera. | PASS estático para límites declarados; ejecución de reset no repetida. |
| Instrumentación y test evidence | La regresión nueva compara los dos campos host withheld en Web y Landing; el contenido del clipboard no se lee en producción. | PARTIAL: contrato revisado estáticamente; prueba no ejecutada localmente según instrucción del owner. |

UAT-129 en producción solo observó foco visible en un enlace y el CTA; UAT-130 prueba el estado de copia en Web y redacción Landing en fuente, no runtime de Landing. Ninguno prueba todas las rutas, lector de pantalla o autorización. No se afirma aceptación integral del widget.

---

# PHDK Auto Debug Widget Readiness — 2026-10-17

Run: `20261014-0007-phdk-auto-completion`
Repository: `tuyoisaza/keledon`
Installed PHDK: v2.52.2; coherence 63/63.

| Surface/requirement | Evidence | Status |
|---|---|---|
| Web and Landing public/login/app/admin mounts | `services/web/test/diagnostics.test.cjs` covers the shared test suite and source parity; current diagnostics suite passes 19/19 | PASS for mount contract |
| Version → copy → clear compact row, anonymous and debug OFF | Shared `components/common/VersionActions.tsx`; current diagnostic tests verify anonymous/debug-off state; Browser focused tests independently cover the native row | PASS for source and focused tests |
| Accessible names and visible status feedback | `VersionActions.tsx` uses localized labels, independent copy/clear status, and success only after successful operation | PASS for source/tested contract |
| Sanitized diagnostic capture | focused diagnostics tests cover credentials, URL, email, bearer/JWT and cyclic-data redaction | PASS, diagnostics 19/19 |
| Cache clearing boundary | focused tests assert owned storage/cache only, truthful failures, and no broad user-data deletion | PASS, diagnostics 19/19 |
| Placement below brand at top-left; exact 28×28 visible controls, 14px glyphs, 12px version, 4px gap | Previously recorded measurement in UAT-067/UAT-056; current source was not changed by candidate 5.1.85 | REUSED evidence; no new geometry claim |
| Public candidate browser reachability | local 5.1.85 Web build loaded at `http://127.0.0.1:4173/` | AVAILABLE_VERIFIED |

This readiness report covers the shared diagnostics widget only. UAT-095 separately records the new agent-selection control and the fact that authenticated dashboard interaction remains MANUAL.

# Debug widget readiness — 2026-10-17 current candidate revalidation

Current candidate: product 5.1.78, source commit `ad127fe02525754b781dfc1d2a1df09ced571989` on `fix/phdk-auto-continuation-5-1-78`. PHDK v2.52.2 is current. Web diagnostics pass 19/19; Browser widget and renderer-boundary tests pass 5/5. Full production-built Web UAT passes 8/8 journeys plus standalone admin-settings, theme-template, and AI-admin UAT. Evidence is in `docs/phdk/evidence/uat-local-web.json`, `docs/phdk/evidence/uat-landing-5.1.78-navbar.json`, the versioned UAT records, and the paired screenshots.

The current production-built Landing UAT measures both visible 28×28 tiles with 14×14 icons, 4px separation, distinct 44×44 pointer targets, no hit-target overlap, and the widget below the brand without hero overlap at 1280px; its 390px mobile check retains the controls. Shared Web component tests cover public, login, authenticated shell and admin mounts, sanitized copy, honest copy/reset outcomes, owned-state clearing, session invalidation, localized accessible labels and live feedback. The source geometry is shared with Landing and mirrored by Browser. Packaged Electron visual rendering remains unverified.

This is local synthetic-API evidence; it does not establish deployed behavior or server/database authorization. Native OS/device/audio, full screen-reader coverage, broader route/localization accessibility, database-backed CRUD, customer-selected live voice/CRM integration, and deployment gates remain open. Whole PHDK Auto is PARTIALLY DELIVERED.

---

## Previous candidate revalidation — 5.1.77

The 5.1.77 geometry correction aligned the copy tile right and trash tile left inside separate 44×44 hit areas, preserving 28×28 visible tiles and their 4px gap. Its source evidence is retained in the following historical lifecycle entries.

---

## 2026-10-15 current source revalidation — 5.1.66 candidate

The shared Web `VersionActions` remains mounted on public, login, shell and admin routes; Landing mirrors that contract. API diagnostics require debug enabled and an authenticated admin/developer/superadmin, and the report projection redacts credentials, private URLs, user content and unbounded event details. Reset clears only KELEDON-owned browser state, confirms errors honestly, and routes an authenticated session back through login. Browser renderer continues to mirror version/copy/reset source behavior and is synchronized by its prebuild script.

Candidate checks: Web diagnostics/version actions 19/19; Browser offline suite 43/43 including icon geometry and owned-cache/reset policies; full production-built Web UAT 6/6 plus AI-admin journey, including anonymous/debug-off copy/reset and 390px UAT; Landing route metadata/indexability 1/1. Accessibility review found the fixed desktop sidebar squeezed the editor on mobile; the responsive shell now preserves the widget in a compact mobile header. No native packaged Electron/device/audio or screen-reader acceptance is claimed. See exact candidate screenshots/JSON in `docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/50-uat/evidence/uat-web-5.1.66/`.

| Surface/control | Evidence | Result |
|---|---|---|
| Public and login | Shared route/widget regressions; Web UAT exercises anonymous debug-off behavior. | PASS source/component and local UAT |
| Authenticated shell and admin | Sidebar and mobile shell retain the shared widget; diagnostics role gating stays server-derived. | PASS source; persisted auth acceptance remains open |
| Compact widget | 12px version, 28×28 visual tiles, 14px icons and 4px gap; 44×44 pointer boxes verified in UAT-056 on Landing. | PASS for Web/Landing tested geometry |
| Copy/reset/redaction | Web 19-test diagnostics suite and Browser owned-state test suite. | PASS for tested source/component behavior |
| Native Electron | Renderer source and 43 offline tests; no packaged application run. | PARTIAL; visual/media runtime unverified |
| Broad assistive technology | Keyboard operation covers the flow editor; full-screen-reader and all-route audit is not available. | PARTIAL / MANUAL |

---

## 2026-10-15 current source revalidation — 5.1.64 candidate

CHK-AUTO-024 resolves the 44×44px target gap for Web/Landing diagnostics. Each button measures 44×44px, with a centered 28×28px visual tile and 4px separation. UAT-056 passes on production-built Landing at 1280×900 and 390×844; evidence with candidate fingerprint and screenshots is `docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/50-uat/evidence/uat-056/`. Web diagnostics pass 19/19, Browser offline source suite 28/28, five app builds, Web/Landing lint/typecheck and PHDK coherence 52/52. The native Browser/Electron implementation has a matching source contract but no packaged runtime measurement.

---

## Previous source revalidation — 5.1.60 candidate

Candidate: `fix/phdk-landing-widget-mount-5-1-60`, based on verified `main` `e41f1530a5ec4b56fdccc5d2ca12eb88bc589cd5`. The mandatory PHDK widget is present in the current app sources. The focused recheck found one test gap: Landing route mounts were not independently asserted. UAT-051 extends the Web test to assert Landing's own public `LandingPage`→`Navbar`, login, `AppLayout`→`Sidebar`, and superadmin admin route, as well as existing Web mounts.

Current verification: Web diagnostics/version-actions 19/19, Browser version-actions/security-policy 15/15, Landing SEO source test 1/1, API/Cloud regressions 37/37 and 17/17, all five application builds, applicable lint/typechecks and PHDK coherence 52/52 pass. Browser `index.html` renderer version synchronizes to 5.1.60. This is source/component testing only; no browser session, screen reader, native Electron visual run, physical device/audio, database, customer endpoint or deployment was exercised.

The visible controls remain 12px version, 28×28 buttons, 14×14 icons and 4px gap. A non-overlapping effective 44×44 hit target is not currently evidenced under the mandated compact row geometry, so it remains **UNVERIFIED / geometry-limited**. Broad route/locale/screen-reader accessibility and native rendering remain open. No new runtime defect was found in this scoped review.

---

# Debug widget readiness — current source revalidation

Run: `20261012-keledon-four-fronts`, revalidated 2026-10-13. Product source: merged KELEDON `main` 5.1.2 at `e305d3d817ff20ed52ed889315e2d618127d7d9f`. Current Check is source/test based; browser UAT evidence below is from the previously recorded isolated local UAT, not a new runtime claim.

| Surface/control | Source/test evidence | Result |
|---|---|---|
| Public web/landing | Shared `VersionActions` mounted by `services/web/src/components/common/Navbar.tsx:56`; `LandingPage` uses the Navbar. `version-actions.test.cjs` asserts the public mount. | PASS source/test |
| Login | `services/web/src/pages/LoginPage.tsx:63` mounts the same widget; anonymous/debug-off component test verifies exact row and no visible labels/status text. | PASS source/test |
| App/admin | `services/web/src/components/layout/Sidebar.tsx:92` mounts it in the shared app shell; `AppLayout`/`ManagementLayout` route tests cover admin. | PASS source/test |
| Legacy landing source | `landing/src` mirrors the shared diagnostics/component files; diagnostics contract test asserts byte-normalized equality with web sources. | PASS source/test |
| Native Browser/Electron | `browser/renderer/index.html:27` has version → clipboard → trash; `browser/renderer/version-actions.js:15-64` allowlists report fields, uses localized accessible labels/status, confirms copy/reset before check, restores icons and cleans timers on unload. `diagnostics.test.cjs` exercises sanitization and reset IPC outcomes. | PASS source/test; Electron visual runtime UNVERIFIED |
| Compact geometry and controls | Web CSS uses 12px version, 28×28 buttons, 14px icons and 4px gap. Component tests assert order, icon-only controls, hidden live regions and copy/clear independence. | PASS source/test |
| Copy success/failure | `VersionActions.tsx` awaits the clipboard helper; only successful copy shows check, timers restore the icon, failures retain clipboard and announce hidden status. Tests cover both. | PASS source/test |
| Reset boundaries | `diagnostics-core.ts` removes KELEDON-owned storage/cache/cookies, verifies reset and propagates partial failures; authenticated session is cleared and login navigation waits through the success indicator. Tests preserve foreign state and reject false success. Native Browser checks owned keys/caches and IPC acknowledgements. | PASS source/test |
| Redaction/bounds | `diagnostics-core.ts` allowlists event fields and sanitizes keys, paths, IDs and strings; buffers are capped at 100 events and string lengths at 2,000. `diagnostics.test.cjs` verifies secrets, identities, URLs and raw messages are excluded. | PASS source/test |
| Effective 44px pointer target | Visible controls are exactly 28px with 4px visual gap. Expanding both adjacent hit areas to 44px would overlap; no distinct non-overlapping implementation is evidenced. | UNVERIFIED / geometry-limited; visible dimensions remain compliant |
| Local browser UAT | `50-uat/UAT_REPORT.md` and `60-uat-fix/UAT_RETEST_REPORT.md` record synthetic local production-SPA checks for placement, dimensions, copy success/failure, reset boundaries, responsive reflow and theme switching on 5.1.2. | PASS for recorded cases only |

No current widget source failure was found. Browser/Electron visual rendering, microphone/device/audio, additional route/locale/screen-reader coverage remain outside the recorded evidence and stay open in Check.

## 2026-10-14 candidate revalidation — 5.1.22

The native Browser row was rechecked against the installed PHDK contract rather than relying on the 5.1.2 record above. `browser/renderer/version-actions.js` now reads the installed Electron version, builds a structured report from an allowlisted event projection, excludes raw event payloads, waits for clipboard/reset acknowledgements before the checkmark, and reloads only after the success interval. `browser/scripts/sync-renderer-version.js` synchronizes `renderer/index.html` from the package version on `prebuild`, `prestart`, and `premake`; module-boundary tests reject drift. The widget tests inspect the copied report and assert only KELEDON-owned state is cleared. Debug mode defaults on for unpackaged builds and off for packaged builds, with tested explicit overrides; the console button starts hidden until the main process confirms debug mode. The Browser preload no longer exposes device identifiers or local log paths through `device:getInfo`.

Verification: Browser renderer/runtime tests 5/5 and TypeScript build pass; web widget/diagnostics tests 17/17 and Landing build pass. API regression 18/18, Cloud regression 9/9 and configured API/Cloud builds pass. This evidence is source/test evidence; the native Electron rendering, OS permission prompts, device/audio journey and deployed runtime remain UNVERIFIED. The public, login, authenticated shell and admin mounts and shared Web/Landing sources remain in place.
## 2026-10-15 candidate revalidation — 5.1.63

CHK-AUTO-023 fixed the public navigation placement in both `services/web/src/components/common/Navbar.tsx` and `landing/src/components/common/Navbar.tsx`: the mandatory widget is now stacked directly below the KELEDON name and aligned to its left edge. Full Web diagnostics/debug-mode/version-actions suite passes 19/19. UAT-055 passes in production-built Landing with outbound traffic blocked: at 1280×900 the brand bounds are (32,16–48) and widget bounds (32,52–80), with no hero overlap; at 390×844 the widget remains visible and the mobile theme/language controls work. Exact browser evidence is in `docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/50-uat/evidence/uat-055/`.

These results establish source and local browser behavior for the public Web/Landing surface. The native packaged Browser UI, screen reader, broad route/locale coverage, and physical device/audio remain unverified. The visible controls remain 28×28 with 4px gap; a compliant non-overlapping effective 44×44 pointer target remains **UNVERIFIED / geometry-limited**.

---
