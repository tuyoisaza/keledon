# Production UAT — PIA-AUTO-SEO-002 / KELEDON 5.2.9

All application acceptance is performed on the deployed production site. Use anonymous GETs and an isolated browser tab only. Do not enter credentials, activate OAuth/signup, read clipboard data, access customer records, or submit changes.

| Case | Action | Expected result | Status |
|---|---|---|---|
| UAT-135 | GET `/` and inspect the initial response and rendered homepage. | HTTP 200; index/follow header and meta; canonical points to `/`; approved overview appears once; React removes the fallback after startup. | PASS on 5.2.9 production deploy `8c7ab848`; one H1 and overview in the React tree. |
| UAT-136 | GET `/login`, then inspect after React startup without entering data. | Initial HTML has application title, meta noindex/nofollow and no canonical; header remains noindex; form renders without public overview. | PASS; initial shell and rendered application are private/noindex; login form appears; no credential action. |
| UAT-137 | GET `/sessions/phdk-uat-137` anonymously, then inspect browser handoff. | Valid SPA route gets 200 and private noindex shell; React routes the anonymous visitor to login without loading customer data. | PASS; browser redirects to `/login`; no credentials or customer records. |
| UAT-138 | GET `/phdk-uat-unknown-138`. | HTTP 404, noindex header/meta, no homepage canonical, localized not-found page and no redirect to `/`. | PARTIAL; HTTP/status/metadata/UI pass, but text remained English with Portuguese saved. Localization retest is UAT-140 on 5.2.10. |
| UAT-139 | GET `/robots.txt` and `/sitemap.xml`; inspect sitemap URLs. | Both remain available; sitemap continues to list only `/`. | PASS; both return 200 and the sitemap contains only the canonical root. |

Evidence: `evidence/uat-135-139-production-routes-2026-10-17.json`. Candidate main SHA `1a7216dfd5431c712b3968bce93099b2196da93e`; Web deploy `8c7ab848-a86c-4ba2-bb67-641512055856`; API deploy `554fa13f-65a6-44f8-a71c-8ed58691db75`. These cases close the route metadata/status contract except the PHDK localization criterion for UAT-138. They do not prove crawler indexing or the four-front Auto goal.
