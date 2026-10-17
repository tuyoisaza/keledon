# UAT evidence — managed Cloud AI parity, 5.1.78

- Run: `20261014-0007-phdk-auto-completion`
- Candidate: source commit `db4b4657133bafb75b4313ab378759c0f9eae1b5` on branch `fix/phdk-auto-continuation-5-1-78`, based on `383fd84f2fd1c7218882dc840db7e5be1957246a`.
- Stage: UAT / UAT Fix, local source and synthetic fixtures.
- Browser permission: `ACTIVE_UAT_EXCEPTION`; browser capability: `NOT_NEEDED` for this candidate because it changes only backend runtime, schema and server tests and has no browser-facing journey. No browser session or URL was used.
- Spend: `NO_NEW_SPEND`.
- Data: in-process mocked persistence and mocked provider responses; no PostgreSQL, real provider, client identity, customer data, telephony or CRM endpoint.

## Executed cases

| Case | Result | Evidence |
|---|---|---|
| Managed Cloud workflow runtime | PASS | Jest 6/6: persisted definitions, disabled/missing workflow fail-closed, decision schema validation, bounded inputs, provider request shaping, safe usage attribution and DB-derived team scope. |
| API/Cloud catalog and migration parity | PASS | Cloud regression suite 19/19, including `43-managed-ai-cloud-parity.test.js`; migration copies and default catalog match API. |
| API managed AI contract | PASS | Node contract suite 9/9. |
| API role guard persisted identity expectation | PASS | Focused Jest 3/3 after aligning the test query projection with role plus companyId. |
| API full Jest | PARTIAL / BLOCKED | 47 tests passed; 1 e2e test requires `DATABASE_URL` and PostgreSQL. No database endpoint was available; migration/restart proof is not claimed. |

No P1/P0 candidate defect remains in the tested managed Cloud AI path. Overall four-commitment UAT remains partial with prior portfolio gates open, including PostgreSQL migration/restart, 396 blocked CRUD rows, native device/audio, broad accessibility/localization and client-selected live integration acceptance.
