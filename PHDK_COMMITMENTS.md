# Commitment ledger

## Active run update — 5.1.44 RPA resource scope (2026-10-15)

CHK-AUTO-022 applies the Cloud-derived tenant origin set to BrowserView HTTP(S)/WebSocket requests during RPA, including conservative handling for requests without a resolvable WebContents. Private CRM origins remain available when configured by the tenant. Candidate `0cbf038ed8ce7f27b1459c3a922a93f04165da46` (tree `9580bf410a52c2ecce0824e52fdf3ab30b322440`) is based on verified `main` `11d773e6d41d21625302ab63fef31cf43d521041` and aligns all five app package/lock roots and Browser renderer at 5.1.44. UAT-040 passes offline; Browser tests 27/27, security-policy/wiring 11/11, Browser build and PHDK coherence 52/52 pass.

| Commitment | Current candidate evidence | Remaining acceptance |
|---|---|---|
| CMT-001 — baseline, versions, PRs | PR #129 merged; main SHA `02d6d730f6713299bce627c1fdd7c8a2ff7538ca`, tree `823887e5096f9c9a4736f75983623138d88d86d4`; remote readback and 5.1.44 roots confirmed. | Continue baseline/PR surveillance; completion gate remains BLOCKED by lint and whole acceptance. |
| CMT-002 — widget and safe diagnostics | Diagnostics UI unchanged; prior local evidence remains applicable. | Native Windows device/audio and broad route/assistive-tech coverage remain open. |
| CMT-003 — voice → Cloud → Browser → CRM per client | Active RPA scope now covers HTTP(S)/WebSocket resources as well as navigation; private configured origins remain supported. | Packaged Electron/service-worker behavior, CDN multi-origin configuration, and customer-specific live provider/CRM acceptance remain open. |
| CMT-004 — administration and permissions | Approved identity/tenant policy unchanged; coherence 52/52. | Safe DB identities, disposable PostgreSQL, persisted migrations/CRUD, exhaustive authorization matrix remain open. |

Overall PHDK Auto remains **PARTIALLY DELIVERED**. UAT is 37 PASS, 2 BLOCKED, 1 MANUAL. No live endpoint, database, customer data, device or deployment was used.

---

## Active run update — 5.1.43 RPA navigation scope (2026-10-14)

The four owner-confirmed fronts remain active in order. Product fix `29d18efbbabe159e5279a01ba767f70e54d8afdc` plus exact tested candidate `076bce49bead0029fd8fc9ea7f79389538f526e5` (tree `7c2cdffbac9887d974f886d8144cff330029c691`) are based on verified `main` `e04418217e1ebb18acda9728a799041fd3bc3c19` and align the five application roots and Browser renderer at 5.1.43. CHK-AUTO-021 is fixed: Electron navigation, frame/redirect/popup and `tabs:navigate` guards share the trusted RPA tenant-origin scope during flow execution. UAT-039 passes; Browser suite 27/27, security-policy/wiring tests 9/9, Browser build and PHDK coherence 52/52 pass.

| Commitment | Current candidate evidence | Remaining acceptance |
|---|---|---|
| CMT-001 — baseline, versions, PRs | PR #127 merged; `origin/main` and `git ls-remote` agree at `c2b918c734ea7b2c54d99902afae62615d05e2eb`; remote tree `fa26e5e6857b1be8b9d803fadd4be8ccfb20b96c`; all roots 5.1.43. | Continue baseline/PR surveillance on subsequent changes. |
| CMT-002 — widget and safe diagnostics | No diagnostics UI changes; prior local diagnostics evidence remains applicable. | Native Windows device/audio and broad accessibility/localization remain open. |
| CMT-003 — voice → Cloud → Browser → CRM per client | RPA navigation guards share the tenant-origin scope; configured private CRM origins remain supported. | Packaged Electron and client-specific live provider/CRM acceptance, plus subresource behavior, remain open. |
| CMT-004 — administration and permissions | Approved actor/tenant policy remains; this candidate closes Browser navigation scope defense-in-depth. | Safe DB identities, disposable PostgreSQL, persisted migrations/CRUD and exhaustive model × role × tenant × surface × operation acceptance remain open. |

Overall PHDK Auto remains **PARTIALLY DELIVERED**. UAT is 36 PASS, 2 BLOCKED, 1 MANUAL. No live endpoint, database, customer data, device, or deployment was used.

---

## Active run update — 5.1.42 RPA tenant scope (2026-10-14)

All four owner-confirmed fronts remain active in their approved order. Candidate `07f979b610b069d675183a7a4ad112b2466c20d2` (tree `a3664bdc9402c7b943e49b2a585b68de741f9f65`) is based on verified main `8075890cb9a112e948403491eb7bf7c8f44337b2` and aligns all five application roots and Browser renderer at 5.1.42. CHK-AUTO-020 is fixed: Browser RPA requires a non-empty tenant-origin scope and applies it to every navigation. UAT-038 passes; Browser suite 27/27, security-policy tests 8/8, Browser build and PHDK coherence 52/52 pass. No private destination or database was contacted.

| Commitment | Current candidate evidence | Remaining acceptance |
|---|---|---|
| CMT-001 — baseline, versions, PRs | PR #125 merged at `6deaa910a37a9bb579eef5e82ae9dda1983c94ea`; remote SHA/tree and Browser version 5.1.42 are verified. | GitHub reports no hosted checks or review decision; no deployment is claimed. |
| CMT-002 — widget and safe diagnostics | Existing local diagnostics evidence remains unchanged. | Native Windows device/audio and broad accessibility/localization remain open. |
| CMT-003 — voice → Cloud → Browser → CRM per client | Tenant RPA scope now fails closed; configured private CRM origin is permitted. | Per-client provider/CRM operation and subresource behavior need client-specific acceptance. |
| CMT-004 — administration and permissions | Current actor/tenant policy remains; scoped Browser RPA finding fixed. | Safe DB identities, disposable PostgreSQL, persisted migrations/CRUD and exhaustive matrix remain open. |

Overall PHDK Auto remains **PARTIALLY DELIVERED**. UAT is 35 PASS, 2 BLOCKED, 1 MANUAL. No database, customer data, private endpoint, device or deployment was used.

---

## Active run update — 5.1.41 vendor-origin navigation (2026-10-14)

The owner-confirmed four-front KELEDON portfolio remains active in this order: CMT-001 baseline/version/PR reconciliation; CMT-002 diagnostics widget and diagnostics; CMT-003 voice→Cloud→Browser→customer-selected CRM; CMT-004 administration and permissions. Owner-approved policy allows client-configured private HTTP(S) CRM origins only after URL validation and per-tenant allowlisting. It does not establish live client connectivity.

Source base is verified `main` `aed26d6641950fb3d4f40e64fee459fb013c544a` / 5.1.40. Candidate source `718ce3d4cf9c4e51b71ec163e9749307997d85d2` / tree `14e5c085771a1e556692991fd1724e747b164ee7` is 5.1.41 across all five package/lock roots and Browser renderer. It applies allowlisting to Electron frame navigations and the trusted navigation IPC. API/Cloud regressions 36/36 and 16/16; Browser full offline suite 35/35, Web UAT 4/4, diagnostics 19/19; all five builds and PHDK coherence 52/52 pass. PR #122 delivered the preceding UAT candidate. PR #123 merged at `7ac039f217f0328a9f25d6fbe9e7f85107c13ca1`; fresh remote ref and PR readback agree and PR/main trees match.

| Commitment | Current candidate evidence | Remaining acceptance |
|---|---|---|
| CMT-001 — baseline, versions, PRs | PR #123 merge/readback verified at `7ac039f217f0328a9f25d6fbe9e7f85107c13ca1`; PR/main trees match; all five app roots align at 5.1.41. | Continue baseline reconciliation for subsequent source slices; this source-slice delivery is closed. |
| CMT-002 — widget and safe diagnostics | Web diagnostics 19/19 and exact-source UAT-036 pass on 5.1.41; responsive/localized baseline journeys pass in local fixtures. | Native Windows device/audio and broad active-route/accessibility acceptance remain open. |
| CMT-003 — voice → Cloud → Browser → CRM per client | Client-selected providers preserved; private origins are validated and per-tenant allowlisted in API/Cloud/Browser. Frame, redirect and IPC navigation scope now shares that allowlist. | No CRM is universal or configured here; live acceptance is per client after its own provider setup. No private destination was contacted. |
| CMT-004 — administration and permissions | Approved least-privilege and server-derived tenant policy retained; API/Cloud regression 36/36 and 16/16; 35-model drift and 168 core-row checks remain source-level only. | Safe DB identities, disposable PostgreSQL migrations/persistence, exhaustive model×role×tenant×surface×operation acceptance remain open. |

Overall PHDK Auto remains **PARTIALLY DELIVERED**. No database, customer data, provider endpoint, private network destination, or deployment was used.

---

## Active run update — 5.1.38 source delivery (2026-10-14)

Verified base is `main` `746c5669ab0f9f39645ed27d99d2029dffa89ed1` / 5.1.37; Cloud escalation parity candidate `5d1b585e8b3a96865bd50494db7315de7281916b` is merged by PR #113 at `45b9031b9d3261a98e928cceb6fb51e73e21421f`. PHDK evidence PR #114 merged at `3222021e4e800ca1079d9752b18849f62165dd73`; remote main agrees. All five app package/lock roots and Browser renderer are 5.1.38. API build/regression 35/35; Cloud build/regression 15/15 and focused changed-file ESLint 0/0; Browser/Web/Landing builds, Web/Landing typechecks, Web diagnostics 19/19, exact-source Web UAT 2/2, Web/Landing SEO 1/1 each and PHDK coherence 52/52 pass. Active source inventory: 1,163 files, zero at/above 600 lines.

The Cloud escalation guard now derives actor and tenant from current DB records, scopes manager operations to company teams, limits ordinary users to their own session/team scope, and filters aggregate reads. The four owner-approved fronts remain active in order. CMT-001 source delivery/readback passes. CMT-002 native device/audio and broad screen-reader/accessibility acceptance remain open. CMT-003 stays provider-neutral with client-configured private origins validated and allowlisted; no customer endpoint was contacted. CMT-004 source policy/parity is covered, while disposable-DB persistence and the complete model-family operation matrix remain open. Overall: **PARTIALLY DELIVERED**. No database, customer data, private endpoint or deployment was used.

---

## Prior active run update — 5.1.37 source candidate (2026-10-14)

Verified base is `main` `493c6c238c6c3cac585b7a80dcff968fff6ab7b4` / 5.1.36; candidate commit `ccd74293bbb36ebf1fbb08bdcdbc1f43c3c4233d`. All five app package/lock roots and Browser renderer align at 5.1.37. API build/regression pass; regressions are 35/35. Cloud build/regression pass 14/14 and full typed ESLint is 0 errors/0 warnings. Web build/typecheck/UAT 2/2/SEO pass; Browser and Landing builds pass; Landing SEO passes. Widget and diagnostics suite passes 19/19; PHDK coherence is 52/52; line inventory is 1,161 files with none at/above 600. Exact-SHA synthetic UAT is recorded in `docs/phdk/evidence/uat-local-web.json` and `uat-device-5.1.36.json` (the latter retains its historical case filename).

The scoped Check remediation replaces request-body/actor `any` types in the API and Cloud CRUD controllers with service-derived contracts, removes Cloud's general audit-log write route to match API, removes a duplicate provider, and validates Cloud TTS stream chunks. API full lint remains 0 errors/135 existing warnings; do not call it warning-free. The 35-model/168-row inventory is a source drift assertion, not persisted DB proof. PR [#111](https://github.com/tuyoisaza/keledon/pull/111) is merged at `33cff1e345de0b735657570a6144ddeec61f7c3e`; remote main, tree and version readback pass. Overall: **PARTIALLY DELIVERED**; DB/migration, live Qdrant, native device/audio, broad accessibility/localization and deployed discovery remain open. No client provider or private URL was contacted.

---

## Prior checkpoint — 5.1.36 Device candidate

This candidate continues the four owner-confirmed fronts in order. It is based on verified `main` `f0a9633e39bbdbca416f5e1c24c32acab7276902` / 5.1.35. Five app package/lock roots and Browser renderer are aligned at 5.1.36. API build/regression 35/35; Web typecheck/build and synthetic SPA UAT 2/2; PHDK coherence 52/52; Device × role × API/Web rows bring the drift assertion to 168. Source delivery is pending; persistence/native/device audio/deployed evidence remain partial.

| ID | Confirmed front | Candidate truth | Remaining acceptance |
|---|---|---|---|
| CMT-001 | Baseline, versions and PR reconciliation | Prior 5.1.35 source and matrix are verified on main; candidate 5.1.36 versions align. | Current product PR, merge and exact remote readback pending. |
| CMT-002 | Shared visible diagnostics widget and safe diagnostics | Prior diagnostics and current full Web UAT pass; Device revoke uses the shared accessible modal and EN/ES/PT copy. | Native OS permission/device/audio and broad route/screen-reader accessibility remain open. |
| CMT-003 | Voice → Cloud → Browser → customer-selected CRM | Client-selected integrations remain provider-neutral; private destinations require validation and tenant-origin allowlists (regression 26). | Live call/CRM acceptance only after each client's provider configuration; no private host was contacted. |
| CMT-004 | Administration and permissions | Device registration binds current DB actor/company and denies an unscoped actor; manager revoke enforces same tenant and has a confirmed localized UI. Matrix/drift coverage is 35 models/168 rows. | DB persistence, all model-specific operation matrices, disposable migration/identity proof, live pairing and Qdrant failure/concurrency remain open. |

Overall: **PARTIALLY DELIVERED; CANDIDATE DELIVERY PENDING**. No database, provider, customer data, private endpoint or deployment used.

SIGUIENTE PASO: complete exact-candidate UAT evidence, publish the 5.1.36 PR, and verify its merge and remote-main tree.

---

## Previous checkpoint — 5.1.35 source and matrix delivered

All four owner-confirmed fronts remain active in the confirmed order. Source commit `2f18c7d82d6a6ac1155910c4f0206da02e0e4de0` shipped in PR #106; PR #107 records that delivery; PR #108 delivered the matrix reconciliation at merge SHA `056e8605097874337c6bc532c006da3a3f772d56`. All application roots and Browser renderer align at 5.1.35. PHDK coherence is 52/52; API regression 35/35 and Cloud 14/14 pass; API/Cloud builds, Web typecheck/build and focused lint pass; exact-commit UAT uses synthetic intercepted APIs. The matrix drift regression now covers KnowledgeBase/KnowledgeDocument across role and API/Web surfaces. No deployment, live Qdrant, PostgreSQL, customer data or client provider was used.

| ID | Confirmed front | Current truth | Remaining acceptance |
|---|---|---|---|
| CMT-001 | Baseline, versions and PR reconciliation | PRs #106–#108 merged; PR #108 merge SHA `056e8605097874337c6bc532c006da3a3f772d56`; all five app roots and Browser renderer align at 5.1.35. | Source and matrix documentation delivered; no deployment is claimed. |
| CMT-002 | Shared visible diagnostics widget and safe diagnostics | Widget remains covered by diagnostics and the 5.1.35 synthetic built-SPA UAT. | Native OS permission/device/audio and broad route/screen-reader accessibility remain open. |
| CMT-003 | Voice → Cloud → Browser → CRM, providers chosen per client | Provider-neutral contracts and validated, per-tenant private CRM allowlists remain covered by offline tests. | Live call/CRM acceptance applies per tenant after provider configuration. |
| CMT-004 | Administration and permissions | Approved least privilege and DB-derived scope retained; KnowledgeBase detail/update and UI CRUD are delivered with company-scoped guards and tests. PR #108's source drift test covers 154 role×surface rows including KnowledgeBase and KnowledgeDocument. | Persisted DB role/tenant/operation behavior, real DB-backed identities, and Qdrant/PostgreSQL failure/concurrency acceptance remain open. |

Overall: **PARTIALLY DELIVERED**. UAT remains 28 PASS, 2 BLOCKED, 1 MANUAL. No database, customer provider, private CRM endpoint, customer data or deployment was used.

SIGUIENTE PASO: provide safe DB-backed identities, disposable PostgreSQL and a supported native Windows device/audio host; then close the remaining CRUD, accessibility and deployed SEO/AEO acceptance.

## Historical checkpoint — candidate 5.1.32

The four owner-confirmed commitments remain active in the confirmed order. Base: verified main `fdf47b252783d32e08200fc8bd7e19d2bbe01bf7`; source commit `93f844bfe47f3b17e3c16f94adb76bab2c0d04b5`; five package/lock roots plus Browser renderer are 5.1.32. API 33/33, Cloud 14/14, Browser 33/33; all product builds pass; Web diagnostics 19/19; exact-source synthetic UAT 1/1; Web/Landing SEO 1/1 each; PHDK coherence 52/52. Exact UAT evidence is bound to `93f844b` with empty source diff. PR #102 has not yet been updated to this commit.

| ID | Confirmed front | Current truth | Remaining acceptance |
|---|---|---|---|
| CMT-001 | Baseline, versions and PR reconciliation | Candidate 5.1.32 is version-aligned and tested on the existing fix branch. | Push/update PR #102; satisfy actual checks/reviews; merge and verify exact remote main. |
| CMT-002 | Shared visible diagnostics widget and safe diagnostics | Widget and diagnostics pass 19/19; UAT-030 closes the in-scope Knowledge page fake-state/i18n/error/modal defect. | Native OS permission/device/audio, broad route and screen-reader accessibility remain open. |
| CMT-003 | Voice → Cloud → Browser → CRM, providers chosen per client | API/Cloud/Browser contracts, tenant private-origin validation and offline synthetic flow pass. | Live call/CRM acceptance is per tenant after a customer configures a provider. |
| CMT-004 | Administration and permissions | Owner-approved least privilege, current-DB actor/tenant scopes, tenant-safe knowledge/vector APIs and safe UI role gating pass source regressions. | Disposable-DB persisted CRUD/migration and safe DB-backed test identities remain open; static 35-model/126-row inventory is not runtime proof. |

Overall: **PARTIALLY DELIVERED**. UAT: 27 PASS, 2 BLOCKED, 1 MANUAL. No database, customer provider, private CRM endpoint, customer data or deployment was used.

SIGUIENTE PASO: finalize Check/lifecycle records, update PR #102 with the candidate, then use actual PR controls for merge and remote-main verification.

---

## Historical Capture snapshot — prior baseline refresh

Four owner-confirmed commitments remain in order. PR #96 delivered KELEDON 5.1.27 to `main` at `a0425134ba69b1feaf165cd512caad8c136ca6f8`; fresh fetch and `git ls-remote` agree. All five app roots and Browser renderer align. The slice improves API/Cloud flow-step reorder integrity, but remaining role-by-model authorization mapping and whole-product acceptance remain open.

| ID | Confirmed front | Current truth | Remaining acceptance |
|---|---|---|---|
| CMT-001 | Baseline, versions and PR reconciliation | PR #96 delivered 5.1.27; all five roots and renderer verify on remote main SHA `a0425134ba69b1feaf165cd512caad8c136ca6f8`. | Source delivery/readback pass; GitHub had no hosted checks/review decision configured; no deployment is claimed. |
| CMT-002 | Shared visible diagnostics widget and safe diagnostics | Exact-candidate built-SPA evidence passes 1/1; diagnostics tests pass 19/19; source widget readiness is recorded. | Native Electron rendering, OS permissions, physical device/audio, and broad route/a11y acceptance remain unverified. |
| CMT-003 | Voice → Cloud → Browser → CRM, providers chosen per client | Provider-neutral source and tenant-scoped private-origin policy are implemented and covered by API/Cloud/Browser checks. | No universal live vendor UAT; configured client acceptance remains tenant-specific. |
| CMT-004 | Administration and permissions | Owner-approved least-privilege rules are implemented; 35-model inventory/126 core-row drift guard passes; FlowStep reorder validation is serializable. | Remaining 26 model-specific role×tenant×surface×operation mappings and persistent migration acceptance remain incomplete; UAT-009/010 remain open. |

Source checks pass on the current candidate: API and Cloud builds/typecheck; Cloud regressions 11/11; API 31/31; Browser 27/27; Web diagnostics/SEO 19/19 and 1/1; PHDK coherence 52/52; 1,135 live source/test files with none at or above 600 lines. Whole-product acceptance remains partial for native, persisted DB/migration, deployed SEO/AEO, broad route coverage, real development identities and customer-specific live integration. No live CRM, production DB, deployment, paid request, hosted CI, or provider write was used.

---

## Current continuation — 2026-10-14, 5.1.17 merged source slice

Product PR [#78](https://github.com/tuyoisaza/keledon/pull/78) merged by squash at `f8933a61c60655a6448a546790521665c6b81c9f`; fresh `origin/main` tree readback matches the candidate and all five app package/lock roots are 5.1.17. Source commit `4e874c14cde10fd5b1a0ce521ee097e67823e120` has post-commit UAT evidence bound to its SHA. API regression 15/15, web typecheck/build, synthetic UAT 1/1, diagnostics 18/18, locale parity 734/734, landing SEO test 1/1/build, Browser/Cloud builds and PHDK coherence 52/52 pass. GitHub reports no hosted checks or review decision; no deployment is claimed.

| ID | Owner-confirmed front | Current source/evidence | Remaining acceptance / disposition |
|---|---|---|---|
| CMT-001 | Baseline, versions, PRs | PR #78 integrates 5.1.17 at remote main `f8933a61c60655a6448a546790521665c6b81c9f`; tree matches tested candidate and five app roots are 5.1.17. | Source-slice delivery/readback PASS; hosted checks/review are unconfigured and no deployment is inferred. |
| CMT-002 | Widget and safe diagnostics | Diagnostics 18/18; synthetic UAT covers safe probes, profile/device journeys and visible API recovery. | Native Electron permission, device and physical audio acceptance remains unverified. |
| CMT-003 | Voice → Cloud → Browser → CRM | Provider-independent contracts and configured-origin tenant flow remain; providers are selected per client. No vendor was hard-coded or contacted. | Continue code/contract review; no live-client acceptance is assumed without that client's environment. |
| CMT-004 | Administration and permissions | Approved DB-derived actor/tenant, restrictive role elevation and write-only secret policy remain; API regression 15/15 and synthetic management UAT cover safe Voice Profile detail/edit and error paths. | Persisted CRUD × role × tenant × operation acceptance and migration/runtime evidence remain incomplete; broad route i18n/a11y continues. |

CMT-001 is delivered for this source slice. CMT-002/003/004 retain the acceptance limits shown above. Overall PHDK Auto remains **PARTIALLY DELIVERED**; open acceptance is not waived by the merge.

## Integrated continuation — 5.1.15 (PRs #74/#75)

PR #74 integrated the dashboard/session/call-monitor source slice at `2e61f41926ab25b4d9ea9f9b73d11aba82988a63`; PR #75 recorded the evidence/readback at current main `c8534e6f6568922d540eabfba4abe90cc93749c1`. All five package/lock roots were read at 5.1.15. The dashboard/session UAT and diagnostics pass. Persisted CRUD/migration, native Electron/device/audio, broad route i18n/a11y and deployed SEO/AEO remained open and continue in the current 5.1.16 plan.
## Latest continuation — 2026-10-13, 5.1.13 merged

Product PR [#70](https://github.com/tuyoisaza/keledon/pull/70) delivered provider-settings localization to `main` at `45be8d82de1f402ee6199a19cd4fa5083bb9ecb1`; all five app roots align at 5.1.13. The owner-confirmed four fronts remain active. The provider route uses the existing en/es/pt catalogs; Spanish UAT and 404-key parity pass. CRM/telephony remains tenant-selected. Overall Auto is PARTIALLY DELIVERED pending the recorded persisted CRUD/migration, native device/audio, whole-app accessibility/localization and deployed SEO/AEO acceptance.

## Latest continuation — 2026-10-13, 5.1.9 integrated

PR #58 delivered 5.1.9 to `main` at `6d0112dd940c142c20b5e4c56c766da64d000b3b`; all five app package/lock roots align. CMT-004's operational escalation, global dashboards/analytics/RBAC, and listening-session routes now enforce DB-derived actor/tenant roles and strong expiring capabilities. API regressions pass 12/12, build/typecheck pass, and changed-file ESLint has 0 errors/15 existing warnings. All four commitments remain confirmed. Overall Auto remains PARTIALLY DELIVERED pending persisted CRUD/migration, native Electron/audio, broad accessibility/localization and deployed SEO/AEO evidence.

Current ledger below retains historical plan fields; the latest git/acceptance disposition is superseded by this continuation and `HANDOFF_5.1.9.md`. Last revalidated 2026-10-13 against product merge PR #58 (`6d0112dd940c142c20b5e4c56c766da64d000b3b`) and current remote `main` after handoff PRs #59/#60. Four commitments have integrated source; remaining manual/persisted acceptance is tracked, not waived. The exact latest main SHA is maintained in `PHDK_DELIVERY_EVIDENCE.json`. See `UAT_REPORT.md`.

## Current continuation — 2026-10-13, candidate 5.1.8

The source audit found that generic CRUD accepted caller-supplied `passwordHash` on user create/update. CMT-004 remediation now rejects that field for every role; only LocalAuthService's password-registration path generates bcrypt hashes. API policy regression explicitly covers admin, coordinator and superadmin attempts. PR #56 merged at `f44f76a8bfb46e4ef60bfbe99982a8d787bc00a6` with all application roots at 5.1.8. PR #55 is CLOSED WITHOUT MERGE because its old squash ancestry produced a dirty merge base; its changes were carried by clean-based PR #56. The four commitments remain confirmed; overall Auto remains PARTIALLY DELIVERED while persisted CRUD/runtime and other acceptance evidence is outstanding.

Owner decision 2026-10-12: 'Los cuatro, en ese orden' confirms CMT-001..004. No deferrals/cancellations.
| ID/title | Origin/category/priority | Scope | Acceptance | Plan/owner | Execution/verification | Git/final disposition |
|---|---|---|---|---|---|---|
| CMT-001 baseline/versions/PRs | owner front 1/technical P1 | CONFIRMED | current facts and scoped PR reconciliation | T-001/WS-001/root | SOURCE REVIEW COMPLETE; remote delivery not done | PR #42 OPEN/DRAFT; 0/4 remotely delivered |
| CMT-002 shared safe diagnostics | owner front 2/defect P1/security P0 | CONFIRMED | common row, confirmed actions/redaction/reset/regression | T-002/WS-002/root | IMPLEMENTED; local test and browser fixture UAT PASS; native Electron render open | local; 0/4 remote |
| CMT-003 voice/cloud/browser/CRM | owner front 3/defect P1 | CONFIRMED | provider-independent configurable contracts + isolated end state | T-003/WS-003/runtime worker | SOURCE/CONTRACT PASS; browser18 checks PASS; client live vendor expressly excluded | local; 0/4 remote |
| CMT-004 administration/permissions | owner front 4/security P0 | CONFIRMED | restrictive DB actor/tenant, no elevation, secrets write-only | T-004/WS-004/admin worker | Policy source, selected API regressions, and current-candidate synthetic manager UI/payload retest pass; full CRUD role×tenant×operation matrix, real detail UAT and persistence remain open. Migration inclusion approved; no DB operation. | local; 0/4 remote |
Last revalidated 2026-10-13 against pushed branch head `e2276dc64db3eff5e99a83fdd5ad3711fc7eecfa` and open/draft PR #42; product source candidate is `cc9b94d`. Local status: 001 source/PR evidence current, remote delivery pending; 002 source/isolated widget tests pass with Electron rendering open; 003 source and synthetic contract acceptance; 004 policy implementation, selected regressions and synthetic manager UI/payload pass, while exhaustive CRUD coverage and persistence UAT remain open. Remote delivered 0/4. External prerequisites/open scoped PRs never silently dropped. Records grant no future authority.

Owner scope clarification 2026-10-12: vendors are client-defined; review code for maximum applicable PHDK conformance. CMT-003 acceptance uses tenant-configurable source/contracts + synthetic local tests; specific live-client setup is not required by this review. Full standards audit additionally inventories new capability/debt gaps; those are not silently waived or claimed delivered.


Owner clarification 2026-10-12: client call/CRM provider varies by tenant; code and tenant-configurable contracts are the in-scope acceptance. No follow-up asking for a single vendor.

Owner decision 2026-10-13: inclusion and merge of the additive managed-AI migration is approved through the normal DB procedure. PR #42 already contains it. This does not authorize live database access or migration execution; neither occurred. PR #42 remains OPEN/DRAFT and the repository source line-limit/conformity findings keep all four commitments locally implemented but not remotely delivered.

2026-10-13 current candidate continuation (5.1.1, source `cff60c675ec3e4b21864a24821cbda34a9c51d64`): CMT-001 version/package alignment and baseline facts reverified; source commit is local only, PR #42 and target-main delivery remain open. CMT-002 health diagnostics disclosure finding is fixed and scoped tests pass; Electron rendering remains open. CMT-003 provider-independent contracts remain within the tenant-configurable scope; no live vendor integration was run. CMT-004 manager user/team UI and Nest tenant guard now support same-company reassignment without company/role fields; tests use synthetic browser APIs and isolated Prisma fixtures, so persisted CRUD/tenant coverage remains incomplete. Remote delivered remains 0/4 until merge and main readback.

2026-10-13 post-merge reconciliation: PR #42 merged; remote `main` is `e305d3d817ff20ed52ed889315e2d618127d7d9f`, with all five app package roots at 5.1.2 and source candidate 5.1.2 included. All four code commitments are remotely integrated. CMT-002 native Electron rendering and CMT-004 persisted CRUD/migration behavior remain unverified; broad accessibility/localization and deployed SEO/AEO evidence also remain open. The official completion gate is blocked because it cannot read a JSON property from the canonical `services/web/package.json`; it compares the entire document as plain text. No delivery-complete claim is made.

2026-10-13 PHDK tool/installation revalidation: central PHDK PR #48 repairs JSON version-source verification; #49 makes README/CHANGELOG required manifest inputs. Both merged to PHDK v2.50.10 (`e3958702d30ae6f9cd18e35b82c7a75a0f11e116`). All 52 mappings are installed and byte-verified; coherence checker passes; isolated completion-gate smoke verifies KELEDON remote SHA/version. The full Auto gate remains BLOCKED by acceptance items, not by parser incompatibility. Downstream sync branch `chore/phdk-upgrade-v2.50.10` remains pending KELEDON PR integration.
