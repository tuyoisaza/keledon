# PHDK Check — candidate 5.1.69

Date: 2026-10-15
Branch: `fix/phdk-crud-relations-coverage-5-1-69`
Base: `origin/main` `47787862c768633009470bd41a9b9241b73d111f` / 5.1.68
Candidate: 5.1.69

## Candidate findings

The source matrix previously marked nested `CompanyCountry` and `TeamInterface` relationships as unresolved independent-resource decisions. Source inspection confirms that company countries are edited through the company form and team-interface assignments are exposed under a team-specific API route with tenant guard and atomic replacement tests. Added API/Cloud regression coverage verifies that managers can update their own company's country list, cannot update a foreign company's list, and cannot use direct country add routes. The matrix now classifies these relations as PARTIAL and explicitly retains persistence and the missing Web TeamInterface selector decision.

Provider catalog, tenant provider configuration and voice profiles are now classified PARTIAL: source guards and safe projections are tested, while exhaustive role/surface, database persistence and audit evidence remain open.

## Integrated checks

| Gate | Result |
|---|---|
| API full regression | PASS, 39/39 |
| Cloud full regression | PASS, 18/18 |
| CRUD inventory | PASS, 39 models / 546 model-role-surface rows / 168 core rows |
| Five app/renderer versions | PASS, all at 5.1.69 |
| Five production builds | PASS; Web and Landing report the existing large-chunk advisory |
| Five lint checks | PASS |
| API/Cloud/Web/Landing typechecks and Browser TypeScript build | PASS |
| PHDK coherence | PASS, v2.51.2 56/56 |
| `git diff --check` | PASS |

UAT-063 passes only for source guard and classification evidence. No live database, customer endpoint/data, or deployment was used. UAT-060 remains BLOCKED pending the owner-provided disposable PostgreSQL target; native device/audio remains MANUAL; broad accessibility/localization, deployed SEO/AEO and live per-client call/CRM acceptance remain open. Whole PHDK Auto remains **PARTIALLY DELIVERED**.
