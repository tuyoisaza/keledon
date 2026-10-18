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
