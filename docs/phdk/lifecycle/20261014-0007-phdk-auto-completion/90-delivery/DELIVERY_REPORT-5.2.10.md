# Production-scoped delivery — KELEDON 5.2.10 localized 404

PR [#255](https://github.com/tuyoisaza/keledon/pull/255) merged to `main` as `fd429298a85bdcf3b5c20791f9b1598c132aabcb`. Product package/lock roots and Browser renderer align at 5.2.10. PHDK v2.53.1 coherence is 64/64.

## Change and acceptance

The static 404 page now localizes its title, heading, description and return link from the saved KELEDON locale (`en`, `es`, `pt`), falling back to a supported browser locale and then English. It updates the document language and uses text content rather than interpreting user data as markup. NGINX CSP permits only same-origin script on the page. The 5.2.9 route-aware shell/404 work is unchanged.

UAT-135/136/137/139 passed on production v5.2.9. UAT-138 documented a real 404/noindex/no-canonical/no-redirect but exposed English copy with Portuguese selected. UAT-140 retested the gap on v5.2.10: anonymous HTTP returned 404 with `X-Robots-Tag: noindex, nofollow`, robots meta and no canonical; `/404.js` returned 200; production browser showed localized title, heading, description and return link after Portuguese was selected from the visible control. Railway Web/API both report SUCCESS and 1/1 replicas. Evidence: `../50-uat/evidence/uat-135-139-production-routes-2026-10-17.json` and `../50-uat/evidence/uat-140-production-localized-404-2026-10-17.json`.

## Validation and limits

- PHDK coherence: PASS, 64/64; all five package/lock roots: 5.2.10; `git diff --check`: PASS.
- No local application tests, builds or lint were run. Production Web build completed in Railway; a >500 kB chunk advisory remains. API started and confirmed PostgreSQL connectivity.
- No credentials, customer data, private endpoint, CRM write, application form submission, clipboard read, provider configuration change or new spend.
- PIA-AUTO-SEO-002 is accepted for the explicit route/metadata/localization contract. Crawler indexing, ranking, external citations, field performance and standalone Landing runtime were not measured.
- Whole PHDK Auto remains PARTIALLY DELIVERED; CMT-002–004 and full commitment acceptance remain open.
