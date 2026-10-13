# Delivery report — 5.1.8 credential integrity fix

Run: `20261012-keledon-four-fronts` · PHDK v2.50.10 · overall Auto **PARTIALLY DELIVERED**.

The owner-approved administration policy requires the API to derive the actor and tenant from current database state, permit role elevation only to an existing superadmin, and keep credentials write-only. Code review found `/api/crud/users` accepted a caller-provided `passwordHash` on create/update and passed it to Prisma. The API now rejects that field for every role; the password registration flow remains the only writer of bcrypt hashes.

Product 5.1.8 is integrated by PR [#56](https://github.com/tuyoisaza/keledon/pull/56), squash merge SHA `f44f76a8bfb46e4ef60bfbe99982a8d787bc00a6`. Remote `main` independently reads back that SHA. All five app package/lock roots report 5.1.8. Source commit `a365325` contains the release change; `8a51f56` reconciles the clean main-based candidate branch. PR #55 was closed without merge because GitHub marked its old pre-squash ancestry DIRTY; its source change was recreated on current `main` and carried by clean PR #56.

Validation on the 5.1.8 candidate: API build/C13 PASS; API TypeScript PASS; API full typed ESLint PASS (184 files, 0 errors/139 warnings); API regression 11/11 PASS, including admin/coordinator POST+PUT and superadmin POST rejection of client hashes. PHDK v2.50.10 coherence passes 52/52. The local Edge browser UAT and diagnostics 18/18 are bound to the 5.1.7 integrated source tree; the backend-only 5.1.8 delta is covered by API tests, not represented as a second browser run. GitHub reported no checks for PR #56, no branch protection, and no review requirement. No hosted check or human GitHub review is claimed.

This closes the source defect in CMT-004; it does not close the four-front Auto goal. Persisted full CRUD/role matrix and deployed migration runtime, native Electron/device/audio, broad accessibility/localization, and deployed SEO/AEO remain outstanding. Client-selected CRM/voice integrations remain tenant-specific. No production database/migration, live provider, customer operation, application probe, or deployment was performed.

## Delivery evidence

| Gate | Result | Evidence |
|---|---|---|
| Version | PASS | Five app package and lock roots are 5.1.8. |
| Commit prefix | PASS | Source release commit subject begins `v5.1.8:`; documentation reconciliation is also version-prefixed. |
| Push and PR | PASS | PR #56 targets `main`, merged; no checks were reported. PR #55 is closed without merge. |
| Remote main | PASS | Readback SHA `f44f76a8bfb46e4ef60bfbe99982a8d787bc00a6`, with 5.1.8 and the guard change present. |
| Scope and checks | PARTIAL | CMT-004 source policy is repaired; other confirmed acceptance blockers remain as listed above. |

No deployment is claimed. Root `PHDK_DELIVERY_EVIDENCE.json` is the machine-readable, post-merge evidence record.
