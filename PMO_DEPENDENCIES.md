# Dependencies / ownership
## Active run `20261014-0007-phdk-auto-completion`

Root owns all integration and delivery. No workers or independent branches are used. Remote `main` 5.1.71 is verified; candidate 5.1.72/PR #176 remains open. Dependency order: refresh baseline and Plan/PMO → converge WS-002, WS-003 and WS-004 in owner order → Integration Review → exact-candidate UAT/Fix → SEO → AEO/GEO → Check → remediation → final version/history/PR/review/merge/readback.

External acceptance dependencies: broader isolated PostgreSQL/persisted model-operation acceptance beyond UAT-066; supported Windows/Electron host and permitted device/audio for native acceptance; each customer's non-sensitive integration configuration for live provider acceptance; deployed domain/crawler/Search Console or answer-engine data for field discovery. These do not block source work and must remain NOT RUN/BLOCKED until evidence exists. No production data, live provider calls, or deployment.

Plan and PMO revalidation precede integration. Continue in owner order WS-002, WS-003, WS-004, then central review/UAT/Fix/SEO/AEO/Check/delivery. Root owns all files, evidence, integration and delivery in this run. No worker or independent branch is assigned. Local tests remain required when external acceptance is blocked; no provider writes/live customer data operations are allowed.
