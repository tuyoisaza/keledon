# Production UAT — static 404 localization / KELEDON 5.2.10

| Case | Action | Expected result | Status |
|---|---|---|---|
| UAT-140 | With Portuguese saved as `keledon-locale`, GET a synthetic unknown path in an anonymous browser. Do not activate the return link. | HTTP 404, noindex header/meta, no canonical, no redirect; title, heading, description, link and document language render Portuguese. If no supported saved locale exists, the browser locale is used; otherwise English. | Pending production deployment |

Record candidate SHA, deployment ID, timestamp, status/robots/canonical, document `lang` and visible copy. No credentials, customer data or writes are used.
