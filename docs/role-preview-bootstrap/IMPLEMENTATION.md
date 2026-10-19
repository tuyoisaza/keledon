# Selector synthetic bootstrap — candidate 5.5.0

Owner authorization, 2026-10-18: after being told that a selector-capable synthetic superadmin was missing, the owner explicitly authorized the assistant to do the necessary work: “si peudes hacerlo tu estas autorizado”. Scope remains the role selector, four synthetic roles, return, denial/expiry and cleanup in production. No old Auto/PMO work, customer data, real-account changes, provider administration or local application commands.

The existing TTS bootstrap remains TTS-only. This change introduces a separate first-party product capability, issued only by an already-authenticated current non-synthetic platform administrator. It is not a public login adapter, password, OAuth grant or general-purpose superadmin credential.

## Trust and lifecycle

- Protected POST `/api/auth/uat-test-profiles/bootstrap` reuses the dedicated, bounded Company Co role-preview fixture lifecycle. The current real operator is used only for explicit provisioning/retirement, never as a test persona. No existing human account/role/tenant is changed. Only a dedicated run with an owned `purpose: role_preview` creation audit may issue the synthetic capability.
- A single passwordless `.invalid` synthetic superadmin per fixture run has no company/team assignment. Creation/reuse and session issuance are audited. Reissuing advances `uatFixtureAuthAfter`, invalidating previous operator grants. Target profiles are the existing four passwordless synthetic identities; their membership/roles are never client-selected.
- The signed capability omits ordinary auth claims and issued-at; `LocalAuthService.validateToken` explicitly rejects it in all modes, including TTS opt-in. Only the global guard's dedicated validator accepts it after HMAC verification, active current DB actor/owner, exact reserved address, null assignments/password, provisioning evidence, current run/retirement and scoped session audit checks. Operator max lifetime is 15 minutes; a genuine server-issued five-second probe is provided for expiry acceptance.
- Operator routes are limited by method and exact path to GET `/api/auth/me`, GET role list, POST switch and POST return. It cannot bootstrap, prepare/retire, access general admin/CRUD, use provider/runtime APIs or sockets. There is no grant of customer/global-data access despite the persisted role name.
- Role targets resolve the owning real administrator through audited delegation; previews bind `operatorSessionId` and remain valid only while that exact operator grant, owner and run are valid. Their expiry cannot exceed ten minutes, fixture TTL or the originating capability's own expiry. Returning ends/revokes the preview idempotently and restores the synthetic operator, not the human operator.
- Bootstrap opens a separate same-origin tab on an explicit gesture. It replaces inherited authentication storage before navigation, puts no credential in URLs and detaches opener. The original operator tab retains only its own existing credential and a non-secret cleanup session ID. Synthetic credentials stay in the test tab's first-party session storage; evidence/results never contain them. Sockets are disabled for the operator and previews.
- Protected POST `.../bootstrap/retire` requires the original non-synthetic administrator and its owned issuance event, then uses the existing audited fixture retirement transaction. All seed/profile/operator accounts become retired, authentication boundaries advance, inert devices remain revoked, and preview/operator grants fail. No hard deletion or background job is introduced. Retained synthetic records/audits can be explicitly renewed through the existing role-preview lifecycle.

## Finite UAT support

The synthetic Profile page offers an explicit finite check panel. It exercises actual same-origin production APIs for identity, four role starts/reads, forbidden writes, Company Co A/B denial, forbidden switching, provider denial, return, old-token revocation, idempotent return, genuine expiry and final synthetic operator identity. Requests target only generated fixture records. TTS denial requests intentionally omit team selection as an additional no-provider-effect guardrail. It stops on the first unexpected result and attempts to end any active preview. Results contain case/status only. After fixture retirement an explicit verification checks operator and retained preview denial.

Actual sidebar role selection, page reload, visible banners, keyboard/mobile behavior and return must additionally be exercised through the production UI. API support is not a substitute for those journeys. No PASS is claimed until actual execution; initial production access report remains historical.

## Static review and delivery

Source/security and full scoped diff review; TS/TSX syntax parse (14 files, zero errors), version/lock/renderer alignment, unchanged dependency metadata, locale JSON/key parity, whitespace, physical line limits and PHDK 2.57.1 coherence are the only local checks. No local tests, builds, lint, typechecks, Prisma generation, DB access, migrations or provider calls. Existing hosting GitHub autodeploy is the only deployment route. Acceptance waits for exact deployed source and occurs solely in production.

## Commitment ledger

| ID | Required outcome | Pre-publication state |
|---|---|---|
| ROLE-BOOT-01 | Audited bounded selector-only synthetic origin and isolated tab | Source implemented; runtime pending |
| ROLE-BOOT-02 | Four actual synthetic role journeys and return/reload | UAT pending exact deployment |
| ROLE-BOOT-03 | Current role/tenant/expiry, denied writes/provider/global access, replay | UAT pending exact deployment |
| ROLE-BOOT-04 | Explicit owned retirement and actual revocation evidence | UAT pending exact deployment |
| ROLE-BOOT-05 | Normal PR/merge, remote main and production readback | Publication pending |

Final runtime evidence will be recorded under this directory and canonical UAT artifacts after execution, including actual failures and cleanup. Source merge alone does not complete these commitments.

## Actual 5.5.0 UAT and 5.5.1 repair

First production run phdk-uat-7d828120-432b-431f-a924-698a26c11986 created the scoped synthetic operator through the protected UI. All four actual sidebar switches/returns, User reload and keyboard activation passed. The finite DOM-reported API batch plus retirement verification passed 49/49, including foreign-tenant/write/TTS/global denial, genuine expiry and old-token revocation. Original actor was used only for creation/retirement; synthetic tab closed after old operator/profile /me returned 401. See production-5.5.0.json.

Actual screenshot/AX exposed two UI defects: return footer below a short viewport and missing tenant names in Profile. 5.5.1 makes nav scroll independently, caps/scrolls the footer, fetches assigned synthetic profile context from persisted relations and supports the existing camelCase contract in Profile. No permission expansion. Production retest remains pending this repair's exact deployment; initial failures retained.
