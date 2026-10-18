# SEO audit — Auto Force re-entry (2026-10-18)

**Applicability:** APPLICABLE to public `/`. Authenticated application, API, tenant, and client CRM routes remain private.
**Candidate:** PR #259 / 5.2.11 head `293532e3404f84a08725a0662acd56bf42543184`; PR #258 head `a8c6ddf26e8bfe91b2c52959cf4328f7c5203c11`; both open against main `edd18be5dd8fd2c49c866f9006ee0f408642e9b4`.
**Observed production:** v5.2.10. UAT-141 through UAT-144 are recorded separately.
**Method:** static source + already obtained production UAT evidence. No browser, live HTTP, crawler, Search Console, provider, Lighthouse or field-metric probe was run in SEO stage.

## Candidate delta and evidence reuse

The reviewed 5.2.11 candidate changes login touch targets, package/version metadata, changelog and lifecycle evidence. It does not change public homepage copy, public route mapping, robots, sitemap, canonical, page title/description, or indexing intent. Reuse the current public-source review and the production route evidence for 5.2.10, while keeping candidate production behavior unverified until deployed.

Already recorded production evidence: UAT-133/134 and UAT-135–140 for public root metadata/content, private-route noindex/no-canonical, unknown-route 404 behavior and localized 404; latest anonymous UAT re-entry loaded production v5.2.10 home and observed its semantic content/disclosure. This is sampled route evidence, not a crawler/indexation/ranking result. UAT-141 exposes a separate login mobile target defect; it does not change public indexation.

Source reviewed: `services/web/index.html`, `services/web/src/components/common/RouteMetadata.tsx`, `services/web/public/robots.txt`, `services/web/public/sitemap.xml`, `services/web/nginx.conf`, and retained `landing/index.html`, `landing/public/robots.txt`, `landing/public/sitemap.xml`, `landing/nginx.conf`.

## Outcome

**SOURCE PASS / SAMPLED PRODUCTION ROUTE PASS / EXTERNAL MEASUREMENTS PARTIAL OR UNMEASURED.** No SEO source repair is indicated for PR #259. Do not claim 5.2.11 was accepted, search indexing, rankings, Search Console coverage, Core Web Vitals or backlink results. Full classifications are in `SEO_CHECKLIST.md`; no-change rationale is in `SEO_REMEDIATION_REPORT.md`.

---

## Candidate 5.2.10 — production route acceptance closed (2026-10-17)

PR #255 merged at `fd429298a85bdcf3b5c20791f9b1598c132aabcb`; Web/API deployments `15f47990-5368-4462-aeba-0d508c388262` / `1b391751-bfc4-4d88-8131-ae239a3c5a07` are SUCCESS. UAT-135/136/137/139 and follow-up UAT-140 confirm root index/follow/canonical, private app route noindex/no-canonical, a real unknown-route 404 with noindex/no canonical/no redirect, and Portuguese 404 title/copy. `/robots.txt` and `/sitemap.xml` remain available with only `/` in the sitemap. PIA-AUTO-SEO-002 is accepted for these explicit route/metadata contracts. Evidence: `../50-uat/evidence/uat-135-139-production-routes-2026-10-17.json` and `../50-uat/evidence/uat-140-production-localized-404-2026-10-17.json`.

This does not measure crawler/indexation, search ranking, TLS redirect chains, CWV field data or the standalone `landing/` runtime; these remain out of this PIA's production acceptance.

## Candidate 5.2.9 — production route metadata revalidation (2026-10-17)

PR #254 merged as `1a7216dfd5431c712b3968bce93099b2196da93e`; Railway Web/API deployments `8c7ab848-a86c-4ba2-bb67-641512055856` / `554fa13f-65a6-44f8-a71c-8ed58691db75` are SUCCESS. Anonymous production responses show: `/` 200 index/follow with the root canonical; `/login` and the valid `/sessions/phdk-uat-137` deep link 200 noindex/no-canonical; an unknown path 404 noindex/no-canonical without redirect; `/robots.txt` and `/sitemap.xml` 200 with only `/` listed. The private SPA metadata and real HTTP 404 portion of PIA-AUTO-SEO-002 passes. UAT-138 found the static 404 page was English while Portuguese was saved; patch 5.2.10 addresses that language issue and UAT-140 is pending. No crawler/indexing/ranking/Search Console result was observed. Evidence: `../50-uat/evidence/uat-135-139-production-routes-2026-10-17.json`.

## Candidate 5.2.8 — production response audit and source repair (2026-10-17)

**Pre-fix production observation:** anonymous GET `/` returned 200 with the expected title, description, canonical and `X-Robots-Tag: index, follow`, but `#root` was empty and the response contained no H1 or substantive overview. `/robots.txt` and `/sitemap.xml` returned 200 and the sitemap contains only `/`. `/login` returned the SPA shell with `X-Robots-Tag: noindex, nofollow`, while its raw shell still carries the homepage's `index, follow` meta and canonical; JavaScript route metadata corrects this after startup. An invented path also returned 200 with the private-route noindex header, so the server currently exposes a soft-404. Detailed response observations are recorded in `snapshots/candidate-5.2.8/production-seo-before.json`.

**Source repair:** the canonical Railway runtime is `services/web`, not standalone `landing/`. It now serves the existing accurate H1, product explanation, client-configured interface description and illustrative-only disclaimer in initial HTML. The Web entrypoint removes `no-js` before React replaces the fallback. No URL, product claim, route, metadata or NGINX index policy changed.

**Production acceptance:** PR #253 merged to `main` as `9aa0d452684d4bcf1b00bdb3321649ae4675877a`; Railway Web deploy `4134bb32-8bbf-4401-b86f-c7bb72e26ea8` is SUCCESS. Anonymous GET `/` returned 200, `X-Robots-Tag: index, follow`, the intended title and a nonempty root containing the H1, overview, all three pillars and illustrative disclaimer. Browser on the production homepage reports one H1, version `v5.2.8`, no `.seo-fallback` after React startup, and `no-js=false`. Before/after records: `snapshots/candidate-5.2.8/production-seo-before.json` and `production-seo-after.json`.

**Current result:** SEO-10/SEO-23 PASS in production. SEO-05 remains PARTIAL because the unknown-path 200 is a soft-404 and redirect/TLS chain remains unmeasured. SEO-02/SEO-04 remain PARTIAL for static private-route meta/canonical mismatch despite the deployed noindex response header. Do not run app tests/builds locally; acceptance is production-only per owner instruction.

---

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
