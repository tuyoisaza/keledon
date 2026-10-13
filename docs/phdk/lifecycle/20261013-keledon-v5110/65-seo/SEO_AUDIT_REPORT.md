# SEO audit — source candidate

Run: 20261012-keledon-four-fronts. Date: 2026-10-12 America/Mexico_City. PHDK2.50.8. Baseline52537140e67d0d6c05486fa13837df3eb5316fb3; local dirty candidate. Source fingerprint SHA256 `5ee8649bbab265db46f14d4ba1a83399b9fb268f04ecfde24ede6f2cd85e0dba` (ordered files below), not a commit or deployment SHA. Method: source-only inspection; no browser, HTTP/probe, Search Console, provider, paid model, crawler or database access. Latest integrated UAT not present at snapshot, so this is a prepared audit, not final accepted stage or runtime/indexation proof.

Applicability: APPLICABLE to public `/` marketing/entry page. Login, test-browser and all protected application/admin routes are intentionally outside search discovery; private content optimization is NOT_APPLICABLE. Canonical candidate URL is https://keledon.tuyoisaza.com/ from source, not a verified live target. Vite/React SPA uses empty root plus noscript summary in server HTML; home content depends on client rendering/auth readiness. No locale-specific public URLs/hreflang currently established.

Implemented source baseline: meaningful title/description, viewport/lang, home canonical, home-only sitemap/robots reference, client route metadata preserving public index and noindexing other routes, honest illustrative-UI label and controlled-pilot CTA description. No JSON-LD/OG metadata found; JSON-LD is conditional, not a universal SEO blocker.

Current source findings (revalidation supersedes initial copy scan):
- SEO-F01: client-only private noindex is not robust server-delivered exclusion. Every SPA fallback initially receives index/follow and home canonical; nginx source has no route-specific X-Robots-Tag. robots-disallowed paths may prevent crawling the client noindex. Add truthful nonindexable server headers for private shells, retaining public home discovery; never treat robots as authorization.
- SEO-F02 CLOSED IN SOURCE: root qualified Features as client-configured cloud/browser capability requiring platform validation and UseCases as examples; named/regulatory/PII-out-of-box/local-optional-cloud guarantees removed. Source claims now align with client-configured intent; no live integration proof asserted.
- SEO-F03 PARTIAL: root removed Footer placeholder legal/social anchors and preserved real architecture link. CTA Get Started/Contact Sales remain inert buttons; use real in-product entry or omit unsupported destinations, never invent contact details.
- SEO-F04: public important content is client-rendered, only a short noscript answer appears initially. Record architecture limitation; do not invent SSR/SSG readiness or require a framework rewrite solely for crawler assumptions. Render/indexing behavior is unmeasured.

Measurement limits: LCP/INP/CLS/mobile real interaction/HTTPS/status/redirects/Search Console/backlinks are NOT MEASURED or externally unavailable. No ranking, Lighthouse score, rich-result, indexation or traffic claims. Existing package build/typecheck evidence must be tied to final candidate by root after source repairs.

Stage outcome: PARTIAL / BLOCKED dependency on current integrated UAT and open source findings. Reporting complete checklist is not a SEO PASS. See SEO_CHECKLIST.md for25 controls; SEO_REMEDIATION.md distinguishes implemented root code from recommendations. Source changes were not made by this documentation task.

Inspected source fingerprint inputs:
- services/web/index.html
- services/web/public/robots.txt
- services/web/public/sitemap.xml
- services/web/src/components/common/RouteMetadata.tsx
- services/web/src/pages/LandingPage.tsx
- services/web/src/components/landing/HeroSection.tsx
- services/web/src/components/landing/FeaturesSection.tsx
- services/web/src/components/landing/UseCasesSection.tsx
- services/web/src/components/common/Footer.tsx
- services/web/src/components/landing/CTASection.tsx
- services/web/nginx.conf

## Source revalidation after root public-copy repair

Root's current Features text now states client compatibility validation, configured cloud models/managed prompts/validated outputs and approved-origin actions; PII-out-of-box/local-optional-cloud/named vendor guarantees removed. UseCases are explicitly example configured workflows, without healthcare/insurance/EMR/Jira/SAP claims. Footer `#` legal/social links removed; real architecture anchor preserved. **SEO-F02 CLOSED in source; SEO-F03 footer portion CLOSED, CTA buttons remain inert at this snapshot.** No live workflow proof inferred. Private client-only noindex limitation F01 remains, and nginx/provider changes are explicitly outside this documentation task. Final source fingerprint above updated; initial historical snapshots retained unchanged, with this revalidation recorded separately.

## Revalidación integrada — candidato 5.1.10 (2026-10-13)

Esta sección supersede el estado de la auditoría fuente anterior para el candidato actual. Rama `v5.1.10-browser-permission-consent`, basada en `origin/main` `f5b9e43bd272408b3b5493c6eddfd24fc2095c75`; aún no publicada al momento de esta revalidación. PHDK v2.50.10.

La fuente NGINX ahora sirve `index,follow` en `/` y `noindex,nofollow` en shells SPA privados. La CTA principal y las anclas de navegación llevan a destinos existentes. El test SEO local pasa 1/1; la UAT del SPA local pasa 1/1. Estos resultados validan código y comportamiento local con datos sintéticos; no prueban respuesta desplegada, indexación ni posiciones.

Estado actual: SEO-02 y SEO-19 PASS en fuente/local. SEO-01/03/04/06–12/18/20 son PASS de fuente con límites previos. SEO-05/13–17/23–25 siguen BLOCKED o NOT MEASURED por falta de observación del despliegue, Search Console, métricas de campo y rastreo externo. SEO-16 no afirma aceptación completa de dispositivos/zoom.

**Resultado: SOURCE PASS; FIELD ACCEPTANCE BLOCKED.** No se accedió a Search Console, no se sondeó un sitio en producción y no se afirmó despliegue. Evidencia ejecutada: `services/web npm run test:seo` (1/1) y `services/web npm run test:uat` (1/1, SPA local de 5.1.10).
