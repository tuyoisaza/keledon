# PHDK Auto status — 5.1.71 candidate

Candidate 5.1.71 preserves `FlowRunEvidence` in the Prisma schema while classifying it as dormant and outside the active product surfaces. Source inspection found no runtime reader, writer, route or UI; current flow execution uses `FlowRun` and `SubAgentRun`. UAT-065 closes the question of whether this model is necessary for current behavior, without asserting a live retention lifecycle or authorizing a schema removal.

The candidate passes API/Cloud regressions (39/39 and 18/18), five builds, five lint checks, four package typechecks, Browser TypeScript build, version alignment, PHDK coherence 56/56 and the diff check. Inventory distribution is 410 BLOCKED, 132 NOT APPLICABLE, 3 DECISION NEEDED and 1 PASS.

Whole PHDK Auto remains **PARTIALLY DELIVERED** at 63 PASS, 1 BLOCKED (UAT-060 PostgreSQL acceptance) and 1 MANUAL (native device/audio). Session lifecycle/retention, broad accessibility/localization, deployed SEO/AEO and client-specific live call/CRM journeys remain open. No deployment or customer environment was used.
