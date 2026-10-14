# UAT report — run `20261014-0007-phdk-auto-completion`

## Final source rebind — 2026-10-14

The candidate was rebuilt and `npm run test:uat` re-executed on source commit `afd66702ba7fc216e27c0c845ceaedb1eeb40944`; the suite passes 1/1 with 15 grouped assertions. Evidence is `evidence/uat-local-web-continued.json`, bound to that exact commit and the clean source fingerprint. The run uses a built SPA, synthetic Company Co APIs and blocked external network. API and database authentication are not exercised by that browser fixture. The audited server-side profile-selection design question remains unanswered, so UAT-008 is still open; persisted DB/migration and native device/audio remain blocked/manual. Whole-product status remains **NOT ACCEPTED**.

Date: 2026-10-14. Candidate: `tuyoisaza/keledon`, branch `fix/cloud-eslint-prettier`, base commit `6413d8aed295c18af098ca6a58c6dfbb7503930b`, product version 5.1.25. Source candidate fingerprint: `sha256:aced4dfae723e0c19aa30fee2d2219eda6290007dee9cedf79ec52bd246f1b1b`, calculated by the UAT harness over tracked diff and untracked source/test files in `browser`, `cloud`, `services/api`, `services/web`, `landing`. Environment: local built production Web SPA, ephemeral loopback server, synthetic Company Co/Other Co fixtures, API requests intercepted and external HTTP/WebSocket blocked. API/Cloud and Browser checks use isolated test doubles. This is not deployed or database acceptance.

## Intent alignment and coverage

Project intent sources: `PROJECT_INTENT.md`, `REQUIREMENTS_TRACEABILITY.md`, `PROJECT_BRIEF.md`, `PRD.md`, `FEATURES.md`, current `TASK.md`. User stories US-001..005 map safe diagnostics, tenant-limited admin, customer-selected CRM, provider-independent runtime flow, and truthful release identity to CMT-001..004. No out-of-intent stories were included. Synthetic Company Co fixtures are used only where relevant; no accounts were created, no email was sent, and no real customer or provider data was used.

The local SPA journey exercised anonymous diagnostics, role-shaped mock UI, localized dashboard/profile/admin journeys, write-only provider-key UI, synthetic CRUD dialogs and safe diagnostics. Current API/Cloud regressions supply isolated source-backed auth/tenant evidence; the Browser suite supplies offline runtime/credential-policy evidence. No role was authenticated against a real DB or deployment. Current JSON and screenshot references are under `docs/phdk/evidence/`.

| Result | Count |
|---|---:|
| PASS | 6 |
| FAIL | 1 |
| BLOCKED | 2 |
| MANUAL | 1 |
| NOT APPLICABLE | 0 |

## Case results

| Case | Result | Evidence |
|---|---|---|
| UAT-001 diagnostics widget | PASS | Local SPA suite 1/1; copy/deny/reset preservation, version row, 390px and simulated 200%/400% viewport checks, screenshot evidence. |
| UAT-002 admin/user-facing journeys | PASS, mocked UI only | Local SPA suite: admin/coordinator/superadmin role-shaped views, manager controls, provider replacement, Voice Profiles and KELEDON payload/dialog journeys; guest management denial. No real roles/auth. |
| UAT-003 API/Cloud permissions and tenant isolation | PASS, isolated source tests | API regression 19/19; Cloud regression 10/10. No persistent database. |
| UAT-004 CRM destinations and safe secrets | PASS, isolated source tests | API/Cloud vendor policy tests and Browser offline suite 27/27; private/local allowed origins are tenant-configured. No actual request to a private host. |
| UAT-005 call/Cloud/Browser synthetic path | PASS, mocked | Browser `company-co-lifecycle` included in the 27/27 offline tests; no customer provider or audio. |
| UAT-006 native Browser/device/audio | MANUAL | Not exercised; supported physical device/audio session unavailable. |
| UAT-007 baseline version | PASS, source only | Five app package/lock roots and Browser renderer identify 5.1.25. Final release version/PR remains pending. |
| UAT-008 audited superadmin test-profile selection | FAIL | Source review found no active server-authorized/audited test-profile switch; a stale unreferenced front-end simulation component is not proof. Requires UAT Fix or a scoped decision. |
| UAT-009 deployed development role authentication | BLOCKED | No safe development target/test accounts are configured or verified. Production is excluded. |
| UAT-010 persisted CRUD/migration matrix | BLOCKED | No isolated disposable PostgreSQL database; no migration run. Production DB is excluded. |

## Executed checks

- `node test/local-uat.test.cjs` — PASS, local Edge/Playwright, 1/1 suite with 15 grouped journey assertions after the Landing metadata fallback; evidence records the source fingerprint above.
- `npm run test:regression` in `services/api` — PASS, 19/19 suites.
- `npm run test:regression` in `cloud` — PASS, 10/10 suites.
- `node --test tests/*.test.cjs` in `browser` — PASS, 27/27 offline tests, including the synthetic call lifecycle.
- API vendor/encryption Jest — PASS, 4/4 tests; Cloud crypto/RAG/subagent Jest — PASS, 8/8 tests.
- API/Cloud/Browser builds, Web typecheck/build, Web diagnostics 9/9, Web debug-mode 2/2, PHDK coherence 52/52 — PASS as recorded in `INTEGRATION_REPORT.md`.

## Defects and action plan

**UAT-008 / DEF-UAT-001 — missing audited test-profile switch.** Observed: no active UI/API path lets a superadmin select and test a permitted profile with a server-authorized audit record. The existing `EntityTable` simulation component is not mounted and would be client-side only. Expected: explicit, auditable server-side test selection that cannot change persisted roles or bypass DB-derived actor/tenant guards. Root cause: capability is absent. Impact: role-specific acceptance cannot be proven through actual test identities under `UAT_JOURNEY_STANDARD.md`. Proposed repair: implement a test-only, server-authorized audited profile-selection flow with fail-closed non-production gating and tests; require a secure design decision on exact scope because this adds privileged impersonation behavior. Retest UAT-008/009, API guard/tenant matrix, expiry, return-to-superadmin and audit assertions. Risk: HIGH security/auth. **Can PHDK do it now? PARTIAL** — code work is within broad PHDK scope, but exact safe product boundary awaits owner answer. No local client-only role spoof will be called a pass.

**UAT-009 — development accounts/access.** No safe deployed development target or actual synthetic identities are configured. Owner/admin action: provide a non-secret dev URL and confirm it contains synthetic test data; authenticate in the user's secure browser if MFA is required. Then run isolated role journeys and cleanup synthetic records. **Can PHDK do it now? NO** — no target/account context is configured; production is prohibited.

**UAT-010 — disposable database.** No isolated PostgreSQL test DB is configured to execute the dry-run-first migration, persisted CRUD matrix or rollback. Owner/admin action: provision a disposable DB/backup and approved rollback process without sharing production credentials here. Then run API vendor migration dry-run, migration execution, before/after ciphertext/projection tests, and all role/tenant/operation checks; remove the disposable DB after evidence capture. **Can PHDK do it now? NO** — no isolated DB prerequisite is available.

**UAT-006 — native desktop/manual case.** A human with a supported Windows host and test device must verify the actual OS permission dialog, same-origin grant/denial, device pairing, audio start/stop/error cleanup and visible recovery. Record redacted screen/trace and build revision; no customer call. **Can PHDK do it now? PARTIAL** — source/unit policies pass, physical interaction is unavailable.

## Conclusion

**NOT ACCEPTED.** Six cases passed in their stated local/source scope; one required UAT capability failed; two external/environment cases are blocked; one native case requires manual interaction. Mocked roles, API regressions and a local SPA do not establish real authentication, persisted authorization or deployment acceptance.

### Recommended next actions

1. Resolve the exact security boundary for server-authorized test-profile switching (the open owner question); then implement or formally defer it and update the intent/coverage if the decision changes scope.
2. Continue UAT Fix for any in-scope local findings and re-run the local UAT against its exact candidate fingerprint.
3. Obtain safe dev test identities and a disposable DB separately; never use production identities/database for this gate.
4. Complete native device/audio manual UAT when supported hardware is available.
5. Proceed with SEO → AEO/GEO → Check/remediation while external cases stay explicitly blocked; final delivery remains partial until the completion gate passes.

**SIGUIENTE PASO:** inicio UAT Fix sobre la capacidad de perfiles auditables y seguiré con los frentes de código independientes mientras queda pendiente la decisión de diseño de impersonación segura.

