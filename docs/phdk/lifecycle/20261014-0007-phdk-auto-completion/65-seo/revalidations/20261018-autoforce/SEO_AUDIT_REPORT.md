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
