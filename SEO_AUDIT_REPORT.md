# SEO source audit — run `20261014-0007-phdk-auto-completion`

Date: 2026-10-14. Candidate base: `6413d8aed295c18af098ca6a58c6dfbb7503930b`, product baseline 5.1.24, active worktree source fingerprint `sha256:aced4dfae723e0c19aa30fee2d2219eda6290007dee9cedf79ec52bd246f1b1b`. UAT was revalidated on this fingerprint and remains **NOT ACCEPTED** for the separate profile-switch requirement. The SEO work is independent: it only adds truthful static fallback copy to the retained `landing/index.html`; current `services/web` user journeys and routes are unchanged.

Applicability: **APPLICABLE**. The public marketing/entry route `/` is intended for discovery. Authenticated SPA routes, API, dashboard, administration and customer CRM destinations remain private/nonindexable and are excluded from the sitemap. Product intent says client call/CRM platforms are individually configured. No target market or public multilingual route decision is established; the public document remains English as currently authored.

Source reviewed: `services/web/index.html`, `services/web/nginx.conf`, `services/web/public/robots.txt`, `services/web/public/sitemap.xml`, `services/web/src/components/common/RouteMetadata.tsx`; retained `landing/index.html`, `landing/nginx.conf`, `landing/public/robots.txt`, `landing/public/sitemap.xml`, `landing/src/pages/LandingPage.tsx`. Both Vite/React shells expose a truthful product title/description, canonical root and home-only index directive. NGINX source makes only `/` indexable; protected SPA fallback routes carry `X-Robots-Tag: noindex, nofollow`. Both sitemaps list only `https://keledon.tuyoisaza.com/`. Landing static HTML now includes an accurate `<noscript>` description. This is source evidence only; no HTTP, crawler, live, or deployment observation was performed.

## 25-control result

See `SEO_CHECKLIST.md` for every control. Source outcomes: SEO-01..04, 06..11, 18..20 are PASS at source level; SEO-12 and 16 are PARTIAL; SEO-21/22 are NOT APPLICABLE based on current public content; SEO-05, 13..15, 17, 23..25 are BLOCKED or NOT MEASURED. No ranking, indexation, HTTP/TLS, CWV, Search Console or backlink claim is made.

## Validation and changes

- `services/web npm run test:seo`: PASS 1/1, NGINX public-root/private-route policy.
- `landing npm run test:seo`: PASS 1/1, metadata/robots/sitemap/NGINX and truthful noscript contract.
- `landing npm run build`, `npm run typecheck`, `npm run lint`: PASS. Vite reports a 580.22 kB minified main chunk; this is a build advisory, not a field performance result.
- Web typecheck/build and local UAT remain as recorded in current run reports; there is no public homepage lab/browser measurement from this stage.
- Source change: `landing/index.html` adds a noninteractive, intent-accurate noscript summary; `landing/test/seo-headers.test.cjs` guards its presence. No URL, redirect, claim, market, or production setting changed.

Conclusion: **SOURCE CHECKS PASS; SEO ACCEPTANCE PARTIAL/BLOCKED**. No critical accidental indexation defect was found in the inspected source. UAT remains NOT ACCEPTED, and external server/crawler/field evidence is unavailable; therefore this stage does not assert a final SEO pass. See `SEO_REMEDIATION_REPORT.md` for the exact remaining actions.



## Historical records from earlier candidates

# SEO audit — source candidate

## Current PHDK Auto run `20261013-1900-phdk-auto` — candidate 5.1.17

Date: 2026-10-14 UTC. Source-only inspection of current `services/web` (active React/Vite app) and retained `landing` alternative, based on dirty branch `fix/phdk-keledon-voice-profile-accessibility` / base `60d7382f0e2003597690673103ace4e785f0c018`. No browser, HTTP, crawler, Search Console, provider or deployed probe was used in this stage.

Public discovery applies to `/` only. The product page accurately states cloud-governed voice and deterministic browser workflows and that each client configures its call/CRM interfaces. Authenticated and application routes must remain private. Current source fixes align both app shells: landing title/description/canonical/robots/favicon, public-only `X-Robots-Tag` policy, a canonical-root sitemap and robots file. Existing `services/web` homepage metadata, NGINX home/private-route policy and public sitemap/robots were rechecked. `services/web npm run test:seo` passes 1/1; landing `npm run test:seo` passes 1/1; web/landing builds pass (web build warns that the main chunk is >500 KB). Source tests do not establish deployed HTTP behavior.

### 25-control status

| ID | Status | Evidence / limit |
|---|---|---|
| SEO-01 robots.txt | PASS (source) | Both public directories expose syntactically simple allow-root, disallow-API and canonical sitemap directives. Served response unverified. |
| SEO-02 indexability | PASS (source) | NGINX config identifies `/` as index/follow and SPA fallback as noindex/nofollow in both shells. Deployment header unverified. |
| SEO-03 sitemap | PASS (source) | Absolute canonical homepage only; source XML checked. Status/indexation unverified. |
| SEO-04 canonical | PASS (source) | Static HTML and sitemap use `https://keledon.tuyoisaza.com/`; app RouteMetadata keeps only the home canonical. Host configuration unverified. |
| SEO-05 HTTP/redirects | BLOCKED | No HTTP/crawl status, redirect or TLS probe was run. |
| SEO-06 search intent | PASS (source) | Intent and app copy describe configurable contact-center voice/browser tasks. |
| SEO-07 terminology | PASS (source) | Natural product terminology; no fabricated query volumes or density. |
| SEO-08 title | PASS (source) | Active shell and retained landing shell have distinct meaningful product title; `landing` no longer says “landing”. |
| SEO-09 description | PASS (source) | Both static HTML shells have truthful client-configured description; snippet selection unverified. |
| SEO-10 headings | PASS (source) | Public page React sources supply semantic hero and section headings; rendered hierarchy not crawled here. |
| SEO-11 helpful content | PASS (source) | Source describes product and qualifies client-configured workflows; no unsupported vertical/vendor claims. |
| SEO-12 trust/provenance | PARTIAL | Product identity and scope are clear; no owner-supplied authorship/contact/certification provenance exists to publish. |
| SEO-13 LCP | BLOCKED / NOT MEASURED | No field p75 or lab metric. |
| SEO-14 INP | BLOCKED / NOT MEASURED | No field p75. |
| SEO-15 CLS | BLOCKED / NOT MEASURED | No field p75. |
| SEO-16 mobile | PARTIAL | Existing local SPA UAT checks login 390px and viewport zoom; public homepage and real devices are not tested. |
| SEO-17 HTTPS | BLOCKED | Canonical is HTTPS; certificate and mixed content not probed. |
| SEO-18 interstitials | PASS (source) | No public entry interstitial found in route source; runtime not observed. |
| SEO-19 internal links | PASS (source) | Login and architecture links target existing routes/sections; source/SEO test covers current paths. |
| SEO-20 information architecture | PASS (source) | Public root plus protected SPA; existing route names preserved. |
| SEO-21 images | NOT APPLICABLE | Public visuals are CSS/icon/vector elements; no content-photo SEO asset requirement identified. Meaningful accessible names are a separate UX gate. |
| SEO-22 structured data | NOT APPLICABLE | No confirmed eligible rich-result content; no artificial JSON-LD. |
| SEO-23 rendering | BLOCKED / PARTIAL | React home is client-rendered and has concise noscript text. Search crawler rendered output is not observed. |
| SEO-24 Search Console | BLOCKED | No authorized connected coverage/query data. |
| SEO-25 links/reputation | BLOCKED | No measured link/backlink evidence. |

**Outcome: SOURCE PASS WITH EXTERNAL MEASUREMENTS BLOCKED.** No deployment, indexation, ranking, field metric, crawler behavior or SEO score is claimed. See `SEO_CHECKLIST.md` and `SEO_REMEDIATION_REPORT.md`.

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
