## Reopened and refreshed — 2026-10-15, post-merge 5.1.70

PR #172 records the owner decision to keep FeatureFlag dormant. The schema/service remain without app registration, route, caller, UI or role grant; future activation/retirement requires a new capability decision and migration review. UAT-064 advances owner decision/source classification only; tally is 62 PASS, 1 BLOCKED, 1 MANUAL. The ordered four-front plan remains active: baseline/version and PR backlog; widget/safe diagnostics; tenant-selected voice→Cloud→Browser→CRM lifecycle; administration/permissions. Continue source-verifiable gaps, then run persistence and isolation UAT against the owner-provided PostgreSQL target. Keep whole Auto partial.

## Reopened and refreshed — 2026-10-15, post-merge 5.1.69

PR #170 reconciles the CompanyCountry and TeamInterface source contracts and is verified on remote `main`. The tested tree matches and UAT-063 advances source guard/classification only; UAT tally is 61 PASS, 1 BLOCKED, 1 MANUAL. The ordered four-front plan remains active: baseline/version and PR backlog; widget/safe diagnostics; tenant-selected voice→Cloud→Browser→CRM lifecycle; administration/permissions. Resolve remaining source-verifiable matrix gaps, then exercise PostgreSQL migration, restart and tenant isolation against the owner-provided disposable target. Keep whole Auto partial.

# Plan handoff — 20261014-0007-phdk-auto-completion

## Reopened and refreshed — 2026-10-15, post-merge 5.1.66

The former top-level plan described baseline 5.1.24 and is historical. Product PR #160 source merged at `bf00262649fb281f40979a867a2bdb09099f3074`; documentation PR #161 is current verified `main` `3364b3e43a1b10d550f253f1e2f8f3a1fe962fb6`. The four owner-approved commitments and role/private-CRM policies remain unchanged. The refreshed root plan is `IMPLEMENTATION_PLAN.md`; dependencies are: (1) source-resolvable matrix/permission gaps, (2) isolated PostgreSQL flow migration/restart acceptance, (3) native/accessibility/deployed-discovery gates, and (4) client-selected live call/CRM acceptance. CMT-001's 5.1.66 source slice is complete; CMT-001..004 remain open as portfolio commitments. Current matrix has 546 rows: 410 BLOCKED, 104 NOT APPLICABLE, 31 DECISION NEEDED, 1 PASS. No unapproved database provisioning will be done; UAT-060 needs an owner-provided disposable target under execution scope.

SIGUIENTE PASO: continue PMO against this refreshed dependency order and preserve external gates as open until evidence exists.

Status: COMPLETED. Source: `6413d8aed295c18af098ca6a58c6dfbb7503930b`, release baseline 5.1.24. The brownfield architecture and current security/integration boundaries are reconciled in root canonical artifacts; 13 canonical plan artifacts are snapshotted in this stage.

## Decisions and scope

The four ordered fronts remain baseline/version/PR; widget and safe diagnostics; voice→Cloud→Browser→customer-selected CRM; administration/permissions. Existing owner approvals are captured in ADR-AUTO-008/009. Actor and tenant are DB-derived, new accounts remain `user`, only an existing superadmin assigns elevated roles/company, tenant managers are bounded to their company, and secret replacements remain write-only. Explicitly configured private/local CRM URLs are supported after URL validation and tenant-scoped origin allowlisting.

## Plan exit gate

Brownfield surfaces and deployment contexts are source-identified; preservation constraints, requirements, dependency order, stable task IDs PLAN-AUTO-001..008, affected components, data/security controls, validation/UAT, rollback, and done criteria are defined. This is a source plan, not proof that all planned checks pass. Current known gaps include Cloud ESLint 333 errors/59 warnings, full CRUD matrix and disposable-DB proof, native Browser/device UAT, exact-candidate browser UAT, broad route UX and deployed SEO/AEO.

## Next stage

Proceed to PMO using the four already-confirmed workstreams; do not re-ask portfolio approval. Refresh workstream/dependency/status and progress artifacts against these stable plan IDs. Integration Review and later stages must preserve prior lifecycle history and use exact candidate evidence.

