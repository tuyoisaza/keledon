# SEO source audit — run `20261014-0007-phdk-auto-completion`

## Candidate 5.2.7 revalidation — public SEO sources unchanged (2026-10-17)

PR #247 delivered KELEDON 5.2.7 at main `a7ca8689265642e6fe1f2f69aa4fa2c90b81867b`. The change only withholds API/OAuth hostnames in the standalone Landing diagnostic report and aligns application version metadata; no title, public description, canonical, route, robots, sitemap, crawl rule or structured data changed. Existing 25-control source review remains applicable for the source surfaces. No SEO app tests/builds were run locally per owner instruction; no crawler, Search Console, TLS check, external probe or field CWV measurement was performed. Railway does not deploy the `landing/` package; deployed discovery for that package is unavailable. Overall SEO remains PARTIAL / source review reused, external/deployed measurement unverified.

## Candidate 5.1.39 revalidation — 2026-10-14

Source `a8a89f928312db2fef5142a0e07ac18a197b6c19`, based on `b5efc9c0e1d0ab4ecc76c13ec92005aad68b9844`. Public Web/Landing source, URLs, metadata and indexation policy are unchanged; only API/Cloud write contracts and API module organization changed. The 25-control checklist remains applicable and is revalidated by Web/Landing SEO tests 1/1 each, builds and typechecks. No HTTP/crawler/field/Search Console/deployed measurement was performed. Source check passes; external SEO acceptance remains partial/unmeasured.

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
