# Production UAT — static 404 localization / KELEDON 5.2.10

| Case | Action | Expected result | Status |
|---|---|---|---|
| UAT-140 | With Portuguese selected in the visible KELEDON locale selector, GET a synthetic unknown path in an anonymous browser. Do not activate the return link. | HTTP 404, noindex header/meta, no canonical, no redirect; title, heading, description and link render Portuguese. The same script sets document language to Portuguese before updating visible copy. Unsupported saved locale falls back to a supported browser locale, then English. | PASS_SCOPED, production main `fd429298`; Railway Web deploy `15f47990-5368-4462-aeba-0d508c388262` SUCCESS 1/1 and API deploy `1b391751-bfc4-4d88-8131-ae239a3c5a07` SUCCESS 1/1. Evidence `evidence/uat-140-production-localized-404-2026-10-17.json`. The browser AX interface does not expose the HTML `lang` attribute directly; its assignment and execution order are recorded in the evidence file. |

Record candidate SHA, deployment ID, timestamp, status/robots/canonical, document `lang` and visible copy. No credentials, customer data or writes are used.
