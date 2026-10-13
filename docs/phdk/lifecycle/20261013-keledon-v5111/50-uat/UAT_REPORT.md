# UAT report — KELEDON 5.1.12

Run: `20261013-keledon-v5111` continuation. Candidate commit `ca34792`, branch `phdk/theme-palette-descendant-vars`, version 5.1.12. Local production-built Web SPA in headless Edge; loopback only, APIs intercepted, external HTTP/WebSockets blocked. Synthetic Company Co/Other Co fixtures. No real auth, DB, customer, provider, email, paid model or deployment used.

## Executed results

- Web local UAT: 1/1; theme tokens/buttons, sampled login contrast, widget/reset, 390px and 640/320px viewport simulations, synthetic admin/coordinator/superadmin, provider write-only, guest redirect, diagnostics and safe/manual probe controls pass. See `uat-local-web.json` and snapshots in this folder.
- Web diagnostics/version tests: 18/18; Web typecheck/build pass.
- API build and regression: pass; 14/14 suites. Isolated authorization evidence is not persisted CRUD acceptance.
- Cloud build/regression: 8/8; Browser TypeScript build and 29/29 CJS regression checks pass; Landing build/typecheck/lint pass; source SEO header test pass.
- PHDK coherence: 52/52 mappings, static check only.

## UX/UI audit gate

The corporate palette defect (selected tokens were not reaching descendant controls) was P1 and is fixed in `ca34792`; the exact control color is now asserted in UAT, all three login-theme contrast samples are empty, and the result was retested. Other UX/UI dimensions are assessed in `UX_UI_AUDIT_REPORT.md`. Overall UAT is **ACCEPTANCE INCOMPLETE**, not accepted for all roles/routes/environments.

| Area | Result |
|---|---|
| Anonymous/login, widget, reset, selected role UI and diagnostics | PASS within synthetic local scope |
| Tenant-persisted CRUD, migration ledger and role revocation | BLOCKED: no isolated PostgreSQL/real DB-backed identities |
| Native Electron/media permission/device/audio | MANUAL / NOT TESTED on this candidate |
| Full-route screen reader, actual OS zoom, locale copy and contrast | MANUAL; selected login sample/reflow only |
| Deployed SEO/AEO | BLOCKED pending exact target/authorization; source test only |
| Live client telephony/CRM | N/A to shared flow; integrations are client-selected |

No remaining P0/P1 failure was observed in the executed synthetic journeys after the fix. Open manual/environment cases prevent overall acceptance. Exact resume actions are in `UAT_CASES.md` and `UAT_ACCESS_REPORT.md`.
