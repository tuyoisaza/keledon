# PHDK source line-limit audit

Date: 2026-10-13. Candidate: 5.0.54. Rule: source files remain below 600 physical lines. Count includes blank lines; scan includes `.ts`, `.tsx`, `.js`, `.jsx`, `.html`, `.css`, `.mjs`, `.cjs`, and `.vue`, excluding dependency and generated directories.

The current inventory contains **38 files** over the limit. This list is a remediation backlog, not a passing Check result.

| Lines | Path |
|---:|---|
| 1800 | `agent/extension/ui/sidepanel-pipeline.js` |
| 1334 | `agent/extension/ui/sidepanel.js` |
| 1301 | `agent/src/background/legacy-background.js` |
| 1272 | `agent/extension/background/legacy-background.js` |
| 1217 | `cloud/src/crud/crud.service.ts` |
| 1035 | `services/api/src/controllers/analytics.controller.ts` |
| 1029 | `services/api/src/calls/calls.service.ts` |
| 1020 | `agent/extension/background/background-service.js` |
| 966 | `services/api/src/services/real-time-alerting.service.ts` |
| 919 | `services/api/src/services/decision-engine.service.ts` |
| 908 | `services/api/src/services/ui-automation.service.ts` |
| 882 | `services/api/src/services/flow-execution.service.ts` |
| 861 | `agent/extension/rpa/executor/index.js` |
| 861 | `agent/src/rpa/executor/index.js` |
| 828 | `test/integration/integration-test-suite.js` |
| 826 | `cloud/src/services/real-time-alerting.service.ts` |
| 813 | `cloud/src/controllers/analytics.controller.ts` |
| 794 | `cloud/src/services/flow-execution.service.ts` |
| 769 | `cloud/src/services/decision-engine.service.ts` |
| 765 | `src/test/phase5-integration-test.js` |
| 762 | `cloud/src/services/ui-automation.service.ts` |
| 692 | `services/api/src/services/database-persistence.service.ts` |
| 664 | `agent/src/rpa/adapters/genesys.adapter.ts` |
| 664 | `agent/extension/rpa/adapters/genesys.adapter.ts` |
| 658 | `agent/extension/ui/sidepanel.html` |
| 654 | `cloud/src/gateways/agent.gateway.ts` |
| 653 | `landing/src/pages/BrainPage.tsx` |
| 640 | `services/api/src/knowledge/knowledge.service.ts` |
| 638 | `cloud/src/services/database-persistence.service.ts` |
| 634 | `services/api/src/crud/crud.service.ts` |
| 625 | `test/production/production-test-suite.js` |
| 612 | `agent/test/rpa-engine.test.ts` |
| 611 | `agent/src/rpa/adapters/salesforce.adapter.ts` |
| 611 | `agent/extension/rpa/adapters/salesforce.adapter.ts` |
| 605 | `services/api/src/crud/crud.controller.ts` |
| 605 | `cloud/src/crud/crud.controller.ts` |
| 605 | `services/api/src/services/voice-analytics.service.ts` |
| 605 | `services/web/src/pages/BrainPage.tsx` |

The adapter and extension duplicates should be kept in sync. Several API and `cloud` service modules are parallel implementations and need separate integration checks. Test harnesses remain part of the repository source audit. Remediation must preserve behavior and run the relevant package checks; mechanical splitting alone does not close the associated Check findings.
