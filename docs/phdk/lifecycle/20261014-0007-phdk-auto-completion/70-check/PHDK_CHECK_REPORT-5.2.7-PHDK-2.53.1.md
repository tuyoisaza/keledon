# PHDK Check — KELEDON 5.2.7 / PHDK 2.53.1

Date: 2026-10-17. Scope: current merged `main` candidate `a7ca8689265642e6fe1f2f69aa4fa2c90b81867b`, PHDK Auto lifecycle `20261014-0007-phdk-auto-completion`. The approved objective covers four workstreams: baseline/version/PR; widget and safe diagnostics; tenant-selected voice→Cloud→Browser→CRM; administration and permissions. This Check does not mark the full product portfolio accepted.

## Baseline and method

- Repository: `tuyoisaza/keledon`; current remote `main` was read back at the SHA above after PR #247 merged.
- PHDK installed/canonical: 2.53.1; the active managed instructions match. Static coherence audit: **PASS, 64 manifest mappings**.
- Product version: 5.2.7 across the five application package/lock roots and Browser renderer (static alignment). PR #247 merged; Railway deploys are attached to the same repository's `main`.
- Intent sources: root `PROJECT_INTENT.md`, `PROJECT_BRIEF.md`, `PRD.md`, `FEATURES.md`, `REQUIREMENTS_TRACEABILITY.md`; current 4-front lifecycle and CMT PIAs; current `TASK.md`/`STATUS.md` as state evidence.
- Standards inspected for this pass: PHDK Check, lifecycle/delivery, UAT Prep, JWT, automation hygiene, UX/UI, theme, CRUD, administration console, diagnostics and relevant intent/architecture artifacts.
- No local application test, build, lint or app runtime was run. The user requires product acceptance on production. Static PHDK audits and source inspection below are not product acceptance evidence.

## Executive summary

Result: **ALIGNMENT INCOMPLETE — WHOLE AUTO PARTIAL**. Counts below cover the 13 grouped findings/evidence records in this report. PHDK baseline and release version are aligned; the scoped diagnostic privacy fix is merged and its production copy-status interaction was observed. Product and provider gates remain open.

| Status | Count | Meaning |
|---|---:|---|
| COMPLIANT | 3 | PHDK/version baseline; scoped diagnostics copy privacy; production deployment integrity for the deployed Web/API slice |
| GAP | 5 | Missing required product behavior or enforcement below |
| PARTIAL | 2 | Theme/admin UI and client-selected runtime integration are partly implemented |
| NOT APPLICABLE | 1 | JWT-specific token format checks; KELEDON uses its own HMAC bearer/session contract, not JWT |
| UNKNOWN / DECISION NEEDED | 0 | The approved four fronts and tenant/private destination policy define current scope |
| UNVERIFIED | 2 | Live CI/rules/provider-cost state and Landing runtime target |

Gap severity: **Critical 0, High 5, Medium 4, Low 0**. Installed/canonical PHDK drift: **none**.

## Findings and remediation backlog

| ID | Severity / status | Standard and applicability | Evidence and missing behavior | Remediation / validation | Dependencies |
|---|---|---|---|---|---|
| CHK-527-001 | High / GAP | `PHDK_UAT_PREP.md`, `JWT_STANDARD.md`; authenticated multi-tenant app | Prep plan, role matrix and fixture manifest exist, but current handoff does not establish a functioning synthetic identity/device provision → session → negative authorization → cleanup cycle on the deployed candidate. Production-only acceptance is mandatory. | FIXABLE WITH VALIDATION: complete CMT-003C/fixture path and prove all roles, expiry/revocation, tenant isolation, cleanup, and production bootstrap exclusion using isolated synthetic identities on production. | CMT-003C; safe production fixture path |
| CHK-527-002 | High / GAP | `CRUD_STANDARD.md`, `ADMIN_CONSOLE_STANDARD.md`; stateful tenant workflows | Flow definitions are to become tenant-owned editable configuration; current lifecycle still tracks tenant runtime/configuration and broad persisted CRUD acceptance as incomplete. | FIXABLE WITH VALIDATION: complete tenant-scoped Flow/FlowStep editor/API CRUD, role guards, audit and production cross-tenant cases. | CMT-003, CMT-004 |
| CHK-527-003 | High / GAP | runtime reliability and side-effect integrity; Browser/CRM command queue | CMT-003A source review documents permanent `browser.command.claimed` claims with no expiring lease; duplicate result detection does not make an external CRM effect idempotent. | FIXABLE WITH VALIDATION: persisted atomic leases, fencing and stable operation keys; fail closed to at-most-once/reconciliation where the selected adapter lacks idempotency. Production concurrency, timeout, stale-result and tenant-isolation cases required. | CMT-003A; CMT-003C; client sandbox for real side-effect case |
| CHK-527-004 | High / GAP | SSRF/egress security and approved tenant private destinations | CMT-003B contract requires per-tenant host/port/CIDR allowlists and DNS/IP pinning at the socket, including redirects and subrequests. A preflight DNS check alone cannot prevent rebinding. | FIXABLE WITH VALIDATION: enforce destination policy at the actual connection or an egress proxy; validate redirects, schemes, ports and credential stripping. Production synthetic DNS/CRM cases only. Keep private Browser egress disabled until enforcement passes. | CMT-003B; CMT-003C; authorized isolated private sandbox |
| CHK-527-005 | High / GAP | mandatory administration console and role/tenant controls | Current admin capability and CRUD artifacts show a broad per-model/role/surface matrix, with persisted acceptance still blocked. Approved policy requires default `user`, DB-derived actor/tenant, tenant-scoped admin/coordinator and secret replacement without returning values. | FIXABLE WITH VALIDATION: close uncovered CRUD/role gates, tenant-scoped TeamInterface selector and safe secret status/replacement; prove allow/deny over production synthetic tenants. | CMT-004; CMT-003C |
| CHK-527-006 | Medium / PARTIAL | `PHDK_THEME_STANDARD.md` and `PHDK_UX_UI.md`; UI app | Theme static audit returned `STATIC_PASS: 0 finding(s); runtime unverified`. This does not establish persisted template editor, corporate-theme visibility control/fallback, server authorization, or all role journeys. UX/UI reports and browser evidence remain partial. | FIXABLE WITH VALIDATION: complete actual platform/tenant template administration and persisted runtime UAT, plus remaining P0/P1 accessibility and responsive retests. | Admin synthetic persona and production UAT |
| CHK-527-007 | Medium / UNVERIFIED | automation and provider-cost hygiene applies | Static automation scanner found no local findings but explicitly reports remote state UNVERIFIED. GitHub workflow run endpoint returned zero PR-triggered runs for the merge SHA and combined statuses are only Railway Web/API success. Railway metadata reports `checkSuites=false` for both `main` services; billing/usage and ruleset/protection state were not established. | EXTERNAL / MANUAL: inspect GitHub enabled workflows/rules and Railway Wait for CI, trigger/restart settings and usage in owner-authorized provider surfaces; preserve connected autodeploy. No provider settings changed. | Authorized provider metadata access |
| CHK-527-008 | Medium / UNVERIFIED | diagnostics standard; app packages | Production UAT-130 confirms anonymous Web version/copy-status behavior and source review verifies Landing no longer emits configured hostnames. Railway has only Web/API app services; Web builds `services/web/Dockerfile`, which excludes `landing/`; no authoritative Landing production target was available. | EXTERNAL / MANUAL: identify/establish the intended Landing deployment and verify its exact runtime diagnostic behavior. | Landing deployment target |
| CHK-527-009 | Medium / PARTIAL | integration/runtime requirement; client-selected providers | Product intentionally supports per-customer calling systems and CRM, rather than one vendor-specific adapter. Browser and Cloud runtime contracts have earlier source/UAT evidence, while the complete configured, authenticated, persisted voice→Cloud→Browser→CRM journey remains incomplete. | FIXABLE WITH VALIDATION: finish adapter-neutral tenant configuration, runtime enforcement and synthetic production end-to-end journey. Do not choose a customer's vendor or endpoint. | CMT-003A/B/C; customer sandbox only for adapter-specific side effects |

## Non-gap evidence

- PHDK 2.53.1 coherence: 64/64 manifest mappings; no upstream version drift was found in the current installed standard set.
- Version 5.2.7 is aligned across five package/lock roots plus the Browser renderer. PR #247 merged to `main` at `a7ca8689` and Railway Web/API deployments for that revision report SUCCESS.
- UAT-130 on production Web: anonymous public page exposes the expected compact diagnostic row; after clicking copy the accessibility state became “Diagnóstico copiado.” Clipboard contents were not read. This passes the scoped copy-status case only.
- UAT-131 on production Web: all nine public ES/EN/PT × dark/light/corporate selections passed AX localization checks; four desktop screenshots visually confirm the compact row in representative combinations. It does not close contrast/WCAG/mobile/authenticated gates.
- UAT-132 on production Web `/login`: all nine ES/EN/PT × dark/light/corporate states exposed localized form labels/actions in AX; one forward Spanish/dark keyboard sample reached six expected targets. No credentials or actions were submitted; this does not close full accessibility/authentication gates.
- Landing diagnostics source now withholds API/OAuth hostnames by matching the Web diagnostic contract. Landing has no verified production deployment, so runtime remains UNVERIFIED.
- Theme static audit: zero static findings; runtime unverified. Automation static audit: no local findings; provider plane unverified.
- Railway production environment currently reports five services, zero issues, zero recent deployment failures and no staged work. Web/API source is `tuyoisaza/keledon@main`; autodeploy is present. Both service configs say `checkSuites=false`.
- N/A: JWT algorithm/issuer/audience claims do not apply as KELEDON is not using JWT. Its actual HMAC bearer/session expiry, revocation and test-identity behavior remain subject to the authenticated production Prep gate.

## Automation and Cost Hygiene

| Surface | Owner / provenance | Active state and dependency | Cost/blockage risk | Severity / remediation |
|---|---|---|---|---|
| Checked-in automation | Repository `.github` and `phdk_automation_audit.py` | No local static findings; PR-triggered workflow runs query returned empty for merge SHA | No repo automation cost found in this static scope; no CI workflow evidence | Medium / UNVERIFIED remote workflow inventory |
| GitHub checks | Combined status for `a7ca8689` | Two successful checks are Railway Web and API; no GitHub Actions run attached | Product deploy has no CI suite gate in current provider config | Medium / inspect enabled workflows and branch rules in GitHub |
| Railway Web/API | Owner KELEDON Railway project; read-only `describe_service` and environment status | Both connected to `main`, no staged work, `checkSuites=false`, one production replica each, sleep enabled; no cron schedule shown in service config | Successful deploy/autodeploy confirmed; usage trend, restart policy details and provider trigger configuration are not fully exposed by this read | Medium / inspect complete provider controls; do not alter them in Check |
| Provider spend | Railway usage metadata not available in this audit result | UNVERIFIED | Cost trend/cap cannot be asserted | Medium / EXTERNAL / MANUAL |

Static check: `phdk_automation_audit.py --root . --format text` → no static findings, remote state UNVERIFIED. No provider mutation occurred.

## Mandatory theme, CRUD, administration and authentication gates

- **Three themes:** static scanner is clean, but required editor, persistence, corporate visibility flag/fallback, server-side authorization and runtime proof are UNVERIFIED/PARTIAL. A scan pass alone is insufficient.
- **CRUD:** `CRUD_MATRIX.md` remains the authoritative per-model matrix. Historical matrix totals must not be promoted to accepted on the basis of this Check; the four-front lifecycle keeps persisted/full CRUD acceptance open. This report tracks the shared closure in CHK-527-005.
- **Admin console:** current inventories (`ADMIN_CAPABILITY_MATRIX.md`, `ADMIN_ARCHITECTURE.md`, `ADMIN_SETTINGS_REGISTRY.md`) are evidence maps, not proof of every UI/API behavior. Tenant/member/role/permission, invitations, integrations, secret masking, audit, backups/recovery, role test-as and negative tenant cases require deployed behavior and production UAT.
- **Synthetic authentication/JWT:** KELEDON uses a custom HMAC bearer/session contract, so JWT-specific token format checks are N/A. The required safe synthetic identity/device, production session issuance, isolation, revocation and cleanup are not yet evidenced as READY; see CHK-527-001.
- **UX/UI:** current report and snapshots exist. UAT-130 adds a public diagnostic interaction only and does not establish authenticated journeys, accessibility coverage, or tenant-admin usability.

## Decisions, external blockers and execution order

No new product decision is requested. The owner already approved the tenant private-destination policy and tenant-scoped interface assignment. The vendor-neutral calling/CRM adapter choice remains per client and is intentionally not selected globally.

External/unverified gates: production-only synthetic identity/device lifecycle (CHK-001); approved synthetic DNS/private CRM sandbox for network/side-effect acceptance (CHK-003/004); Landing production target (CHK-008); GitHub workflow/ruleset and full Railway cost/trigger metadata (CHK-007). These are not evidence of compliance.

Execution order: (1) make CMT-003C fixture/cleanup and production test identity path safe; (2) implement CMT-003A lease/fencing/operation idempotency; (3) implement CMT-003B connection-time DNS/CIDR enforcement; (4) close Flow/runtime/admin tenant-scoped CRUD (CMT-003/CMT-004); (5) finish persisted theme/admin and broad UX acceptance; (6) deploy Landing to its verified target; (7) complete client-selected production journey and full four-front closure.

## Verification performed

- `python phdk-standards/scripts/phdk_coherence_check.py` → PASS, v2.53.1 / 64 mappings.
- `python phdk-standards/scripts/phdk_theme_audit.py --root .` → STATIC_PASS, 0 findings; runtime unverified.
- `python phdk-standards/scripts/phdk_automation_audit.py --root . --format text` → no static findings; remote state UNVERIFIED.
- GitHub combined status → Railway Web/API success; workflow-run query for merge SHA → none.
- Railway read-only metadata → Web/API SUCCESS, `main`, no staged work, `checkSuites=false`; environment 5 services, zero issues/recent failures.
- Production UAT-130: scoped copy-status PASS, per evidence JSON and report. No clipboard content read.
- No local product tests/build/lint and no provider writes.
