# SEO checklist — run `20261014-0007-phdk-auto-completion`

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
