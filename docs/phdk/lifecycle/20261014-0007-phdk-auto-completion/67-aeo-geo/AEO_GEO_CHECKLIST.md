# AEO/GEO checklist — Auto Force re-entry (2026-10-18)

Scope: public `/`; candidate 5.2.11 is not deployed. Public text and route contract are unchanged from the reviewed 5.2.10 deployment. Prior UAT/SEO evidence is sampled and explicitly version-scoped.

| ID | Status | Evidence / limitation |
|---|---|---|
| AG-01 Public answer intent | PASS (source) | Four grounded questions in the audit map; no demand/volume claim. |
| AG-02 Canonical/indexable source | PASS (5.2.10 sampled routes); candidate pending | SEO/UAT-135–140 record canonical root and noindex private/unknown route behavior; no crawler indexing proof. |
| AG-03 Direct answers/context | PASS (source + sampled production) | Initial homepage explains Cloud decisions, Browser execution, client-configured call/CRM and illustrative scope. Candidate unchanged. |
| AG-04 Verifiable entity | PASS (source + sampled production) | KELEDON identity and component names appear in public source and observed homepage. |
| AG-05 Provenance/authorship | PARTIAL | No owner-verified author/contact/certification provenance available; not invented. |
| AG-06 Claim accuracy | PASS (source) | Client-selected interfaces and illustrative/no-live-metrics qualification constrain claims. |
| AG-07 Semantic hierarchy | PASS (source + sampled production) | Public initial HTML provides H1/H2 answer hierarchy; candidate unchanged. Full external crawler rendering unmeasured. |
| AG-08 Natural language/FAQs | PASS (source) | Explanatory language is direct; no unsupported FAQ or search-demand assumption. |
| AG-09 Contextual paths | PASS (source) | Existing in-product/public paths retained; no new navigation claim. |
| AG-10 Eligible structured data | NOT_APPLICABLE | No rich-result content type is established by the available content; none added. |
| AG-11 Localization/market | BLOCKED / DECISION NEEDED | Public market, marketing language and locale URL policy are not owner-defined; interface locale catalogs are insufficient evidence. |
| AG-12 Accessible answer availability | PASS (5.2.10 sampled production) | Overview was observed without interaction on anonymous homepage; not a full accessibility audit. Candidate retest awaits deploy. |
| AG-13 Privacy/crawler policy | PASS (5.2.10 sampled route contract) | Root intended public; private/unknown pages noindex. No crawler policy widened. Candidate route behavior unchanged in source. |
| AG-14 Answer/citation observation | NOT_MEASURED | No search engine, answer engine, citation, or referral observation was made. |
| AG-15 Revalidation/regression | PARTIAL | Candidate source diff is unchanged for public content; deployed candidate rendering and post-delivery regression remain pending. No local app test/build/lint run. |

Overall: **PARTIAL**. Evidence establishes source consistency and prior 5.2.10 route samples only. It does not establish crawler indexing, citations, generative recommendations, traffic, or candidate 5.2.11 production behavior.

---

# AEO/GEO checklist — run `20261014-0007-phdk-auto-completion`

## Candidate 5.2.8 — production Web answer revalidation (2026-10-17)

| ID | Status | Evidence / limitation |
|---|---|---|
| AG-01 Public answer intent | PASS | Existing four factual questions remain tied to the approved product scope. |
| AG-02 Canonical/indexable source | PARTIAL | Production root is indexable and in the sitemap; raw `/login` HTML still contains the homepage canonical/robots metadata while its response header is noindex. |
| AG-03 Direct answers/context | PASS (production) | Initial Web HTML answers what KELEDON does and separates Cloud policy decisions from Browser execution. |
| AG-04 Verifiable entity | PASS (production) | KELEDON name and the Cloud/Browser roles appear in delivered HTML. |
| AG-05 Provenance/authorship | PARTIAL | No verified author/contact/source provenance was supplied; none was invented. |
| AG-06 Claim accuracy | PASS (production) | Copy states call/CRM interfaces are client-configured and labels the page illustrative with no live metrics. |
| AG-07 Semantic hierarchy | PASS (production) | Raw response includes semantic H1/H2; post-React browser has one H1. |
| AG-08 Natural language/FAQs | PASS | Direct explanatory prose; no fabricated FAQ or search demand. |
| AG-09 Contextual links | PASS (source) | Existing login and architecture paths remain intact. |
| AG-10 Eligible structured data | NOT_APPLICABLE | No supported rich-result type; none added. |
| AG-11 Localization/market | BLOCKED / DECISION NEEDED | Public marketing market/language and locale URL policy are not defined; UI catalogs do not establish them. |
| AG-12 Accessible answer availability | PASS (production) | Overview appears in initial HTML without interaction; React cleanly replaces it after startup. This is not a full accessibility audit. |
| AG-13 Privacy/crawler policy | PARTIAL | Homepage response is index/follow and protected SPA fallback header is noindex; raw shell metadata briefly disagrees on private paths. |
| AG-14 Answer/citation observation | NOT_MEASURED | No answer engine, crawler citation result, or paid query was observed. |
| AG-15 Revalidation/regression | PASS (production smoke) | GET and production browser confirm the initial overview and React handoff; no local application tests/builds run. |

Overall: PARTIAL. This production sample demonstrates HTML delivery and UI handoff only; it does not establish crawling, indexing, citation, ranking, or recommendation. Evidence: `../65-seo/snapshots/candidate-5.2.8/production-seo-after.json`.

---

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
