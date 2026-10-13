# SEO checklist —25 controls

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
