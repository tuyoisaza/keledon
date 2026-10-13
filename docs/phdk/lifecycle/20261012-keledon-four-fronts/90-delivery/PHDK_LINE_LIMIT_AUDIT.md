# PHDK source line-limit audit

Date: 2026-10-13. Candidate: 5.0.54. Rule: source files remain below 600 physical lines. Count includes blank lines; scan includes `.ts`, `.tsx`, `.js`, `.jsx`, `.html`, `.css`, `.mjs`, `.cjs`, and `.vue`, excluding dependency and generated directories.

The current inventory contains **17 files** at or above the limit. This remains an open remediation backlog, not a passing Check result.

| Lines | File |
|---:|---|
| 1301 | `agent/src/background/legacy-background.js` |
| 1041 | `cloud/src/controllers/analytics.controller.ts` |
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
| 794 | `cloud/src/services/flow-execution.service.ts` |
| 769 | `cloud/src/services/decision-engine.service.ts` |
| 765 | `src/test/phase5-integration-test.js` |
| 762 | `cloud/src/services/ui-automation.service.ts` |
