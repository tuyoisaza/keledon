# AEO/GEO audit — public answers

Run: `20261012-keledon-four-fronts` · Revalidated: 2026-10-13 · PHDK 2.50.8 · Candidate 5.0.54. Review covers source plus local production-SPA UAT only. No external answer engine, crawler, live deployment, provider, paid model, or database was used.

Public question map supported by current source:
- What is KELEDON? It describes a cloud-governed contact-center runtime for voice assistance and browser workflows.
- Who decides and who executes? The architecture content assigns decisions to Cloud and approved browser actions to the Browser runtime.
- Which call/CRM platforms work? The source says each client configures its own interfaces and validates compatibility; it does not promise a specific live integration.
- How can a user enter or understand the workflow? Login links go to `/login`; the secondary CTA goes to the real `#architecture` section.

Product copy avoids unsupported customer, certification, measured ROI, price, healthcare, insurance, and live integration claims. Public content is mostly English (`lang=en`); UI translations do not establish localized public answers or locale URLs. The page is client-rendered, and no engine citations, referral traffic, external visibility, or crawler rendering were measured. JSON-LD/FAQ/llms.txt are not treated as mandatory without a specific use case.

Local production-SPA UAT passes 10/10. Nginx source marks `/` indexable and other SPA route shells noindex, but the deployed headers remain unverified. Stage outcome: source content is truthful and navigation is actionable; public localization, crawler behavior, live indexation, and external citations remain unmeasured.
