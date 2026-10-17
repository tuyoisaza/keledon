# AEO/GEO checklist — run `20261014-0007-phdk-auto-completion`

## Candidate 5.2.7 revalidation

PR #247 changes version and diagnostics redaction only; all 15 controls below are reused for the unchanged public answer content. Citation/retrieval and external visibility remain NOT MEASURED; standalone Landing deployment is not verified. No new user-facing claims or FAQs were added.

## Candidate 5.1.39 revalidation

Candidate `a8a89f928312db2fef5142a0e07ac18a197b6c19`; public source unchanged. The 15 controls below are reused. Web/Landing SEO source tests pass 1/1; no answer engine, crawler, live target or paid query was contacted. External citations remain NOT MEASURED.

Candidate 5.1.24 / base `6413d8aed295c18af098ca6a58c6dfbb7503930b`; worktree source fingerprint `sha256:aced4dfae723e0c19aa30fee2d2219eda6290007dee9cedf79ec52bd246f1b1b`. Method is source review and local SEO regression/build evidence. No answer engines were queried; no claim of ranking/citation is made.

| ID | Status | Evidence / retest |
|---|---|---|
| AG-01 Public answer intent | PASS (source) | Four factual user questions mapped to Capture intent, no fabricated demand. |
| AG-02 Canonical/indexable source | PASS (source) | SEO handoff confirms public root canonical and home-only index policy; no live crawl. |
| AG-03 Direct answers/context | PASS (source) | Title, description, noscript and hero/architecture explain what the product does, Cloud/Browser split and client setup conditions. |
| AG-04 Verifiable entity | PASS (source) | KELEDON brand and Cloud/Browser roles are explicit in current public content. |
| AG-05 Provenance/authorship | PARTIAL | No verified author/contact/certification/sourcing statement was supplied; none was fabricated. |
| AG-06 Claim accuracy | PASS (source) | Each client configures its own call/CRM interfaces and must validate compatibility; no universal vendor/vertical guarantee. |
| AG-07 Semantic content | PASS (source) | React landing sections use semantic H1/section headings in source; rendered crawler DOM not observed. |
| AG-08 Natural language/FAQs | PASS (source) | Direct explanatory prose; no fabricated FAQ questions or demand research. |
| AG-09 Contextual links | PASS (source) | Existing login CTA and architecture navigation target current routes/sections. |
| AG-10 Eligible structured data | NOT_APPLICABLE | No supported eligible rich-result type; no artificial JSON-LD. |
| AG-11 Localization/market | BLOCKED / DECISION NEEDED | Public HTML is English; Capture does not select public target language/market or locale URLs. Do not promote UI locale catalogs into public SEO automatically. |
| AG-12 Accessible answer availability | PARTIAL | Noscript summary is source-present; complete React content is client-rendered; no crawler/no-JS/screen-reader observation. |
| AG-13 Privacy/crawler policy | PASS (source) | Public root only; private SPA surfaces excluded in NGINX source and sitemap. Deployed headers not measured. |
| AG-14 Answer/citation observation | NOT MEASURED | No authorized AI/search engine query. No citations, recommendations or percentages asserted. |
| AG-15 Revalidation/regression | PASS (source/local) | Web/Landing SEO tests 1/1 each; Landing build/typecheck/lint and same-candidate UAT revalidation passed. Overall UAT remains NOT ACCEPTED for profile-switch policy. |
