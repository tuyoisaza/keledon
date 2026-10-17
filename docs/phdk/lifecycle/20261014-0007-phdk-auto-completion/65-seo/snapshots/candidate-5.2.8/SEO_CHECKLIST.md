# SEO checklist — run `20261014-0007-phdk-auto-completion`

## Candidate 5.2.8 — Web production audit delta (2026-10-17)

| ID | Candidate status | Evidence / remaining limit |
|---|---|---|
| SEO-01 robots.txt | PASS (production response) | `/robots.txt` returned 200 and references sitemap; crawler fetch/indexing is unmeasured. |
| SEO-02 Indexability | PARTIAL | `/` responds index/follow; `/login` response header is noindex/nofollow, but static meta still says index/follow until React route metadata runs. |
| SEO-03 XML sitemap | PASS (production response) | `/sitemap.xml` returned 200 and lists only canonical `/`; search engine acceptance is unmeasured. |
| SEO-04 Canonical | PARTIAL | Homepage canonical is correct; raw SPA shell exposes homepage canonical on `/login` until JS removes it. |
| SEO-05 HTTP/redirects | PARTIAL | `/` 200 and private SPA routes 200 observed; an invented path also returns 200 (soft-404). Redirect chain and TLS remain unmeasured. |
| SEO-06 Search intent | PASS (source) | Existing truthful product purpose and client-configured integrations retained. |
| SEO-07 Query terminology | PASS (source) | Natural product vocabulary retained; keyword volume/rank not measured. |
| SEO-08 Title | PASS (source/production response) | Current product title present on `/`; snippet presentation not measured. |
| SEO-09 Description | PASS (source/production response) | Existing factual description present; snippet selection not measured. |
| SEO-10 Headings | PASS (production) | Anonymous deployed `/` response includes the existing semantic H1 and overview before JavaScript; production browser confirms one H1 after React startup. |
| SEO-11 Original useful content | PASS (source) | Overview uses existing qualified product language; no performance claims added. |
| SEO-12 Trust/authors/sources | PARTIAL | No verified author/contact/certification source supplied; none invented. |
| SEO-13 LCP | NOT MEASURED | No production field p75 or comparable lab metric. |
| SEO-14 INP | NOT MEASURED | No production field p75 or comparable lab metric. |
| SEO-15 CLS | NOT MEASURED | No production field p75 or comparable lab metric. |
| SEO-16 Mobile | PARTIAL | Prior production UI samples exist; this SEO stage has no physical-device or field performance measure. |
| SEO-17 HTTPS | NOT MEASURED | HTTPS source URL only; certificate/redirect/mixed-content checks not done. |
| SEO-18 Interstitials | PASS (source) | No public entry interstitial added. |
| SEO-19 Internal links | PASS (source) | Existing public login/architecture links retained. |
| SEO-20 Information architecture | PARTIAL | Root is the sole sitemap route; the server currently returns noindex 200 for unknown SPA paths. |
| SEO-21 Images | NOT_APPLICABLE | No content image change. |
| SEO-22 Structured data | NOT_APPLICABLE | No eligible rich-result content established. |
| SEO-23 Rendering | PASS (production) | Initial response carries the overview; production browser confirms React removes the fallback (`no-js=false`, zero fallback nodes, one H1). |
| SEO-24 Search Console | NOT MEASURED | No connected authorized Search Console evidence. |
| SEO-25 Links/reputation | NOT MEASURED | No backlink/mention source data. |

Production GET and browser acceptance run after successful Web deployment `4134bb32` of main `9aa0d452`; detailed before/after evidence and the PIA are in `snapshots/candidate-5.2.8/`. No local application tests/builds run. Overall SEO remains PARTIAL pending route/meta correction and external measures.

---

## Candidate 5.1.39 revalidation

Candidate `a8a89f928312db2fef5142a0e07ac18a197b6c19`; public source is unchanged. Reuse the 25 evidenced source controls below; Web/Landing SEO tests pass 1/1 each. No live HTTP, crawler, Search Console, TLS or Core Web Vitals measurement was made. External controls remain BLOCKED/NOT MEASURED as listed.

Candidate: 5.1.24 base `6413d8aed295c18af098ca6a58c6dfbb7503930b`; source fingerprint `sha256:aced4dfae723e0c19aa30fee2d2219eda6290007dee9cedf79ec52bd246f1b1b`. Method: source inspection and local static tests/build only. Candidate UAT remains NOT ACCEPTED. The 25 controls are engineering checks, not a ranking formula.

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
