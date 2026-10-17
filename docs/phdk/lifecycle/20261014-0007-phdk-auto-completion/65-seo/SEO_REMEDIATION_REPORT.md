## Candidate 5.2.8 — Web initial HTML fallback

Production GET proved the deployed Web response had an empty React root. `services/web/index.html` now contains the same previously approved semantic overview as the standalone Landing shell, with CSS limited to the `no-js` state. `services/web/src/main.tsx` removes that state before mounting React, so the live app replaces the static overview. Package/lock metadata and the Browser diagnostic renderer are coordinated at v5.2.8. No application test/build was run locally. Acceptance is **PENDING production deployment**: verify the anonymous homepage response contains the H1/copy and the production UI replaces the fallback cleanly. No crawling/indexation/ranking claim is made.

Separate findings retained: unknown SPA paths return 200 with noindex (soft-404); raw private-route HTML contains root index/canonical metadata until client route metadata runs, while deployed response header is noindex. Those require route-aware server HTML behavior and a distinct follow-up, not scope expansion in this repair.

---

# SEO remediation report — run 20261014-0007-phdk-auto-completion

## Candidate 5.2.7 — no SEO remediation required (2026-10-17)

PR #247 changes diagnostic hostname redaction and version metadata only; no public SEO source, URL, robots, sitemap or structured-data contract changed. No SEO fix was indicated. Existing findings about external provenance, deployed crawl/indexation and CWV remain open/unmeasured. The standalone Landing package has no verified production target. No local application tests/builds were run.

## Candidate 5.1.39 — no public-source repair

No SEO source change was necessary for this API/Cloud-only candidate. Web/Landing metadata, public `/`, sitemap, robots and route policy remain unchanged. Local SEO tests pass 1/1 per frontend and both builds/typechecks pass. Deployed HTTP/TLS/crawl, CWV, Search Console, backlinks and snippet behavior remain NOT MEASURED/BLOCKED; no deployment or external probe occurred.

**Implemented:** `landing/index.html` now has a short, truthful noscript description that matches the active Web shell and the client-specific integration intent. `landing/test/seo-headers.test.cjs` asserts that description so the retained public shell does not lose its crawler/user-without-JavaScript fallback silently.

**Retested:** Landing SEO source test 1/1, build/typecheck/lint pass. Web SEO test 1/1 and current-candidate local UAT revalidation pass. No public URL or metadata claim changed.

**Pending / non-removable in this source-only stage:** deployed HTTP statuses/redirects/TLS/indexation, rendered crawler output, Core Web Vitals, Search Console and reputation evidence. These need an authorized read-only deployed measurement context after delivery. Owner/editor must supply verified public contact/authorship provenance before SEO copy may add it. No market/language change was inferred. No additional source-only code finding remains in the checked 25 controls. UAT acceptance remains NOT ACCEPTED for the independent profile-switch requirement; it is not converted by SEO work.
