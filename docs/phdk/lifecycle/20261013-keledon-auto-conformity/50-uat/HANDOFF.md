# Auto handoff — UAT

Run `20261013-keledon-auto-conformity`; scoped local UAT completed 2026-10-13.

Command: `services/web npm run test:uat` after `npm run build`. Result: 1/1 suite PASS. UAT-T-005-DASHBOARD opens `/dashboard` using a synthetic user and intercepted APIs, verifies Spanish greeting/activity/today stats/empty and completed-session states, switches greeting/stats through English and Portuguese, and checks the caption/column scope. UAT-T-005-SESSIONS opens live/history with synthetic superadmin data and verifies Spanish call-monitor/session copy, filter names, statuses, captions/scoped headers and detail action. Existing Company Co management, theme/widget and safe-diagnostic paths pass in the same suite. Evidence is local SPA behavior only; backend acceptance remains in separate API regression evidence.

No external requests, customer records, live CRM, database, migration, native device or production endpoint was used. The initial accessible-name assertion used the wrong case; an expanded retest exposed the fixture's incorrect API mock route. Both test-harness issues were corrected, and UAT Fix records the final rerun.

Next: record and retest the assertion correction.
