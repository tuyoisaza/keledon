# UAT retest — run `20261013-1900-phdk-auto`

## Candidate 5.1.32 exact-source retest — 2026-10-14

`services/web npm run test:uat` passes 1/1 after source commit `93f844bfe47f3b17e3c16f94adb76bab2c0d04b5`; `docs/phdk/evidence/uat-local-web.json` records that SHA, an empty tracked source fingerprint, and zero dirty untracked source files. UAT-030 covers the Knowledge page’s tenant fixture read, user read-only buttons, English/Spanish/Portuguese copy, shared accessible source modal keyboard/focus flow, no fabricated live-agent/RAG panel, and sanitized backend errors. All requests used synthetic fixtures and interception with external network/WebSockets blocked. This is UI behavior only, not live auth, persisted DB, real call/RAG, or deployment evidence.

Remaining: UAT-009 safe DB-backed development identities, UAT-010 disposable PostgreSQL persisted CRUD/migration proof, UAT-006 supported native device/audio interaction; whole-product acceptance remains **ACCEPTANCE INCOMPLETE**. Exact next step: provide/configure the permitted isolated environments, then rerun the linked UAT cases.

After the stale fixture and feedback fixes, `services/web npm run typecheck`, focused ESLint (`src/App.tsx`, both changed management pages and `test/local-uat.test.cjs`), `npm run build` and `npm run test:uat` all exited 0. The local Edge suite passed 1/1 and logged the Spanish Voice Profile retry/403/create/delete journeys and KELEDON create/cancel journey. The test harness used synthetic Company Co/Other Co fixtures, intercepted APIs and blocked external network/WebSockets.

Retested source remained dirty on base `60d7382f0e2003597690673103ace4e785f0c018`. Repeat after code commit and replace `docs/phdk/evidence/uat-local-web.json` before final delivery. No persistence, DB-backed tenant role, migration, native media/audio, customer workflow or deployed measurement is inferred.


## Candidate revalidation after SEO fallback

The unchanged Web UAT suite was rerun at source fingerprint sha256:aced4dfae723e0c19aa30fee2d2219eda6290007dee9cedf79ec52bd246f1b1b after adding a truthful noninteractive <noscript> summary to the retained Landing shell. Result remains PASS for the same local UI cases; DEF-UAT-001, UAT-006, UAT-009 and UAT-010 are unchanged. No role switch, database, native device or live provider test was performed.
