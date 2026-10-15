# SEO checklist — run `20261014-0007-phdk-auto-completion`

## Candidate 5.1.53 delta — 2026-10-14

| Control | Current candidate status | Evidence / limitation |
|---|---|---|
| SEO-10 Headings | PASS (source/build) | Initial HTML includes one meaningful public H1 and a hierarchy of architecture H2s; `landing/test/seo-headers.test.cjs` and built `landing/dist/index.html` verify the contract. No crawler rendering claim. |
| SEO-23 Rendering | PASS (source/build); deployed rendering BLOCKED | Static initial HTML now carries an accurate substantive overview without JS; app removes the fallback class on boot. Local test/build only; deployed HTTP and crawler observation remain unavailable in this stage. |
| All other controls | REUSED FROM PRIOR SOURCE AUDIT | Public route policy/metadata remains unchanged. Field CWV, live headers/TLS/redirects, Search Console, backlinks, broad mobile measurement and verified authorship remain blocked, partial or not measured as recorded below. |

---

Candidate: 5.1.39, `fix/phdk-mvp-store-write-contracts-5-1-39`, source `a8a89f928312db2fef5142a0e07ac18a197b6c19`, based on verified `main` `b5efc9c0e1d0ab4ecc76c13ec92005aad68b9844`. The public source is unchanged; the 25 controls below are reused and revalidated with Web/Landing `npm run test:seo` 1/1 each and both builds/typechecks. Method remains source review/local tests only. UAT is ACCEPTANCE INCOMPLETE; no deployed search or field metric is claimed. The 25 controls are engineering checks, not a ranking formula.

| ID | Status | Evidence, action, retest |
|---|---|---|
| SEO-01 robots.txt | PASS (source) | Web/Landing `robots.txt` allow root, disallow `/api/`, reference canonical sitemap. Retest `npm run test:seo`; deployed status not observed. |
| SEO-02 Indexability | PASS (source) | Exact `/` NGINX location is index/follow; SPA fallback is noindex/nofollow in both configs. Header behavior on deployment unverified. |
| SEO-03 XML sitemap | PASS (source) | Both XML sitemaps list only absolute canonical homepage; URL status/indexation unknown. |
| SEO-04 Canonical | PASS (source) | Both static documents and sitemap agree on `https://keledon.tuyoisaza.com/`; route metadata removes canonical on private routes. |
| SEO-05 HTTP/redirects | BLOCKED | No HTTP status, redirect-chain, 4xx/5xx or TLS probe. Requires authorized read-only deployed target after release. |
| SEO-06 Search intent | PASS (source) | Title/copy describes cloud-governed voice/browser workflow and client-selected integrations consistent with Capture. |
| SEO-07 Query terminology | PASS (source) | Natural product vocabulary; no guessed keyword volume/density or stuffing. |
| SEO-08 Title | PASS (source) | Both shells identify KELEDON and contact-center runtime; test checks title. |
| SEO-09 Description | PASS (source) | Both shells have truthful client-configured description; snippet selection unmeasured. |
| SEO-10 Headings | PASS (source) | Public React sections provide semantic headings in source; rendered H-level order not crawled. |
| SEO-11 Original/useful content | PASS (source) | Product and example workflow copy qualified by client configuration; no unsubstantiated vendor or outcome claim found in inspected public components. |
| SEO-12 Trust/authors/sources | PARTIAL | Brand identity present; no verified author/contact/certification source supplied. Do not invent one. |
| SEO-13 LCP | BLOCKED / NOT MEASURED | No field p75 or comparable lab baseline. Local bundle size advisory only. |
| SEO-14 INP | BLOCKED / NOT MEASURED | No field p75 or authorized lab data. |
| SEO-15 CLS | BLOCKED / NOT MEASURED | No field p75 or comparable lab data. |
| SEO-16 Mobile | PARTIAL | Local UI UAT checks 390px login and simulated zoom; public hero/mobile parity not separately measured and no physical device test. |
| SEO-17 HTTPS | BLOCKED | Source canonical is HTTPS; certificate, redirect and mixed content were not probed. |
| SEO-18 Interstitials | PASS (source) | No public entry interstitial found in inspected route/source components; runtime display not observed. |
| SEO-19 Internal links | PASS (source) | Public navigation links to login/architecture sections; no invented contact destination added. |
| SEO-20 Information architecture | PASS (source) | Public `/` plus protected app routes; existing paths retained, private routes removed from canonical/sitemap. |
| SEO-21 Images | NOT_APPLICABLE | Public imagery is icon/illustration/CSS rather than content image; meaningful accessible names remain in UX/UI scope. |
| SEO-22 Structured data | NOT_APPLICABLE | No eligible public rich-result content established; no artificial JSON-LD added. |
| SEO-23 Rendering | PARTIAL / BLOCKED | Vite/React page content is client-rendered. Truthful noscript summary now exists in both static shells; crawler-rendered output unverified. |
| SEO-24 Search Console | BLOCKED | No authorized connected coverage/query data. |
| SEO-25 Links/reputation | BLOCKED | No measured backlink/mention evidence. |

Commands: Web and Landing `npm run test:seo` PASS 1/1 each. Landing `npm run build`, `typecheck`, and `lint` PASS. No browser, HTTP, crawler, Search Console, deployment or provider access.



## Historical records from earlier candidates

# SEO checklist —25 controls

## Current candidate 5.1.17 — run `20261013-1900-phdk-auto`

| ID | Status | Evidence |
|---|---|---|
| SEO-01 | PASS (source) | `services/web/public/robots.txt`, `landing/public/robots.txt`; HTTP status unknown. |
| SEO-02 | PASS (source) | Both NGINX configs keep home indexable and SPA fallback noindex; deployed headers unknown. |
| SEO-03 | PASS (source) | Both source sitemaps list the absolute canonical root only. |
| SEO-04 | PASS (source) | Both static shells and sitemaps agree on `https://keledon.tuyoisaza.com/`. |
| SEO-05 | BLOCKED | No HTTP/redirect probe permitted or executed. |
| SEO-06 | PASS (source) | Matches Capture intent and client-specific configuration constraint. |
| SEO-07 | PASS (source) | Natural, substantiated wording; no keyword-volume claims. |
| SEO-08 | PASS (source) | Both shells identify KELEDON and purpose; generic landing title corrected. |
| SEO-09 | PASS (source) | Both shells have truthful description; search snippet unmeasured. |
| SEO-10 | PASS (source) | Semantic heading hierarchy present in React public-page source. |
| SEO-11 | PASS (source) | Useful product/architecture copy and qualified example workflows. |
| SEO-12 | PARTIAL | Brand is stated; verified contact/authorship sources were not provided. |
| SEO-13 | BLOCKED / NOT MEASURED | No LCP field or lab data. |
| SEO-14 | BLOCKED / NOT MEASURED | No INP field data. |
| SEO-15 | BLOCKED / NOT MEASURED | No CLS field data. |
| SEO-16 | PARTIAL | Existing UI UAT samples login at 390px and simulated zoom; public home/real devices are untested. |
| SEO-17 | BLOCKED | TLS/certificate/mixed-content not probed. |
| SEO-18 | PASS (source) | No public interstitial source identified. |
| SEO-19 | PASS (source) | CTA links point to login and architecture section; source tests/build pass. |
| SEO-20 | PASS (source) | Public root and private SPA route structure retained. |
| SEO-21 | NOT_APPLICABLE | No public photographic asset SEO scope in inspected page. |
| SEO-22 | NOT_APPLICABLE | No confirmed eligible structured-data type. |
| SEO-23 | BLOCKED / PARTIAL | SPA content is JavaScript rendered; no crawler/rendered HTML validation. |
| SEO-24 | BLOCKED | No authorized Search Console evidence. |
| SEO-25 | BLOCKED | No measured reputation/backlink evidence. |

Checks: `services/web npm run test:seo` PASS 1/1; `landing npm run test:seo` PASS 1/1; web/landing source builds PASS (web main-chunk advisory). No deployment or field measurements.

Run: 20261012-keledon-four-fronts. Date: 2026-10-12 America/Mexico_City. PHDK2.50.8. Baseline52537140e67d0d6c05486fa13837df3eb5316fb3; local dirty candidate. Source fingerprint SHA256 `5ee8649bbab265db46f14d4ba1a83399b9fb268f04ecfde24ede6f2cd85e0dba` (ordered files below), not a commit or deployment SHA. Method: source-only inspection; no browser, HTTP/probe, Search Console, provider, paid model, crawler or database access. Latest integrated UAT not present at snapshot, so this is a prepared audit, not final accepted stage or runtime/indexation proof.

PASS means the named source contract only; it never asserts served200, crawler execution or field measurements. Every retest is source review unless explicitly noted; no scans executed. Open FAIL actions are in SEO_REMEDIATION.md. BLOCKED measurements remain unmeasured, not failed product metrics.

|ID|Control|Status|Evidence/action/retest|
|---|---|---|---|
|SEO-01|robots.txt|PASS|Source syntax, Allow home, private disallows and absolute sitemap reference exist; served status unverified.|
|SEO-02|Indexability|PASS (source/local)|Home index/follow and private SPA noindex/nofollow are served by NGINX source; deployed header unverified.|
|SEO-03|XML sitemap|PASS|Source XML has only absolute canonical home and robots reference;200/indexation unverified.|
|SEO-04|Canonical|PASS|Absolute home canonical matches sitemap; RouteMetadata removes nonhome canonical after JS; initial private shell issue F01.|
|SEO-05|HTTP/redirects|BLOCKED|No HTTP/crawl execution; protected redirects source inspected, no live status inferred.|
|SEO-06|Search intent|PASS|Client-configured purpose and controlled validation; unverified promises removed in current source readback.|
|SEO-07|Query terminology|PASS|Natural cloud/contact-center/browser terminology; no fabricated query volume/density.|
|SEO-08|Title|PASS|Static meaningful home title; generic nonindexable app title by route source.|
|SEO-09|Description|PASS|Useful client-configured purpose in index.html; snippet selection unverified.|
|SEO-10|Headings|PASS|Hero H1, feature/architecture/use-case H2 and item H3 in React source; rendered hierarchy unverified.|
|SEO-11|Original useful content|PASS|Current useful product explanation and explicitly illustrative configured workflows; F02 source repaired.|
|SEO-12|Trust/authors/sources|PASS|Real product identity; fabricated policy/social destinations removed; no invented author/certification facts.|
|SEO-13|LCP|BLOCKED|Field p75 and lab performance NOT MEASURED.|
|SEO-14|INP|BLOCKED|Field p75 and interaction timing NOT MEASURED.|
|SEO-15|CLS|BLOCKED|Field p75 and layout shifts NOT MEASURED.|
|SEO-16|Mobile|BLOCKED|Viewport/responsive classes present; no actual device/zoom/navigation evidence.|
|SEO-17|HTTPS|BLOCKED|Canonical uses HTTPS; certificate/headers/mixed content unverified.|
|SEO-18|Interstitials|PASS|No public marketing interstitial in inspected source; rendered visibility unverified.|
|SEO-19|Internal links|PASS (source/local)|Primary CTA and navigation target existing login/architecture paths; local SEO and SPA UAT pass.|
|SEO-20|Information architecture|PASS|One indexable public home and protected app routes preserve existing URL structure; no fake doorway pages.|
|SEO-21|Images|NOT_APPLICABLE|Inspected hero uses CSS/vector/icon illustrative UI, no photographic image SEO scope; icon a11y separate.|
|SEO-22|Structured data|NOT_APPLICABLE|No required eligible rich-result type established; no fabricated JSON-LD/reviews.|
|SEO-23|Rendering|BLOCKED|SPA root/short noscript known; full content crawler rendering/indexation not executed F04.|
|SEO-24|Search Console|BLOCKED|No authorized real connected coverage/query evidence.|
|SEO-25|Links/reputation|BLOCKED|No measured backlink/mention profile; source social placeholders are not reputation evidence.|

## Source revalidation after root public-copy repair

Root's current Features text now states client compatibility validation, configured cloud models/managed prompts/validated outputs and approved-origin actions; PII-out-of-box/local-optional-cloud/named vendor guarantees removed. UseCases are explicitly example configured workflows, without healthcare/insurance/EMR/Jira/SAP claims. Footer `#` legal/social links removed; real architecture anchor preserved. **SEO-F02 CLOSED in source; SEO-F03 footer portion CLOSED, CTA buttons remain inert at this snapshot.** No live workflow proof inferred. Private client-only noindex limitation F01 remains, and nginx/provider changes are explicitly outside this documentation task. Final source fingerprint above updated; initial historical snapshots retained unchanged, with this revalidation recorded separately.

## Revalidación integrada — candidato 5.1.10 (2026-10-13)

Esta sección supersede el estado de la auditoría fuente anterior para el candidato actual. Rama `v5.1.10-browser-permission-consent`, basada en `origin/main` `f5b9e43bd272408b3b5493c6eddfd24fc2095c75`; aún no publicada al momento de esta revalidación. PHDK v2.50.10.

La fuente NGINX ahora sirve `index,follow` en `/` y `noindex,nofollow` en shells SPA privados. La CTA principal y las anclas de navegación llevan a destinos existentes. El test SEO local pasa 1/1; la UAT del SPA local pasa 1/1. Estos resultados validan código y comportamiento local con datos sintéticos; no prueban respuesta desplegada, indexación ni posiciones.

Estado actual: SEO-02 y SEO-19 PASS en fuente/local. SEO-01/03/04/06–12/18/20 son PASS de fuente con límites previos. SEO-05/13–17/23–25 siguen BLOCKED o NOT MEASURED por falta de observación del despliegue, Search Console, métricas de campo y rastreo externo. SEO-16 no afirma aceptación completa de dispositivos/zoom.

**Resultado: SOURCE PASS; FIELD ACCEPTANCE BLOCKED.** No se accedió a Search Console, no se sondeó un sitio en producción y no se afirmó despliegue. Evidencia ejecutada: `services/web npm run test:seo` (1/1) y `services/web npm run test:uat` (1/1, SPA local de 5.1.10).
