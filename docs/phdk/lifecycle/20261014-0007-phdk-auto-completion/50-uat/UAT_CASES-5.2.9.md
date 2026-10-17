# Production UAT — PIA-AUTO-SEO-002 / KELEDON 5.2.9

All application acceptance is performed on the deployed production site. Use anonymous GETs and an isolated browser tab only. Do not enter credentials, activate OAuth/signup, read clipboard data, access customer records, or submit changes.

| Case | Action | Expected result | Status |
|---|---|---|---|
| UAT-135 | GET `/` and inspect the initial response and rendered homepage. | HTTP 200; index/follow header and meta; canonical points to `/`; approved overview appears once; React removes the fallback after startup. | Pending deployment |
| UAT-136 | GET `/login`, then inspect after React startup without entering data. | Initial HTML has application title, meta noindex/nofollow and no canonical; header remains noindex; form renders without public overview. | Pending deployment |
| UAT-137 | GET `/sessions/phdk-uat-137` anonymously, then inspect browser handoff. | Valid SPA route gets 200 and private noindex shell; React routes the anonymous visitor to login without loading customer data. | Pending deployment |
| UAT-138 | GET `/phdk-uat-unknown-138`. | HTTP 404, noindex header/meta, no homepage canonical, static not-found page and no redirect to `/`. | Pending deployment |
| UAT-139 | GET `/robots.txt` and `/sitemap.xml`; inspect sitemap URLs. | Both remain available; sitemap continues to list only `/`. | Pending deployment |

Evidence must record candidate SHA/version, deployment ID, UTC timestamp, response status/robots/canonical and redacted browser outcome. Passing these cases closes only this PIA's anonymous route/metadata slice; it does not prove crawler indexing or the four-front Auto goal.
