# PHDK Check — candidate 5.1.71

Date: 2026-10-15
Branch: `fix/phdk-model-decisions-audit-5-1-71`
Base: verified `origin/main` `baea50570c0ad33a1bac4040b444ceb031ea57f3` / 5.1.70
Candidate: 5.1.71

## Decision and finding

The owner asked whether `FlowRunEvidence` is needed. Source inventory finds its Prisma schema model but no API, Cloud, Web, or Browser runtime reader, writer, route, or UI. Current flow execution uses `FlowRun` and `SubAgentRun`; `FlowRunEvidence` is not required by that path. Keep the schema dormant, classify its 14 role/surface rows as NOT APPLICABLE, and add no endpoint, role grant, retention job, or migration. Reconsider it only with a defined evidence contract and approved migration. Three Session API ownership/lifecycle rows remain DECISION NEEDED.

## Integrated checks

| Gate | Result |
|---|---|
| API full regression | PASS, 39/39 suites |
| Cloud full regression | PASS, 18/18 suites |
| CRUD inventory | PASS, 39 models / 546 model-role-surface rows / 168 core rows; 14 FlowRunEvidence rows N/A |
| Inventory status distribution | PASS, 410 BLOCKED / 132 NOT APPLICABLE / 3 DECISION NEEDED / 1 PASS |
| Five production builds | PASS; existing Web/Landing >500 kB chunk advisory |
| Five lint checks | PASS |
| API/Cloud/Web/Landing typechecks and Browser TypeScript build | PASS |
| Versions | PASS, all five package/lock roots and Browser renderer at 5.1.71 |
| PHDK coherence | PASS, v2.51.2 56/56 |
| `git diff --check` | PASS |

UAT-065 is decision and source-inventory evidence only. No database migration, persisted evidence lifecycle, or retention behavior was exercised. Whole PHDK Auto remains **PARTIALLY DELIVERED**: 63 PASS, 1 BLOCKED (PostgreSQL UAT-060), 1 MANUAL (native device/audio).
