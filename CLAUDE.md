# KELEDON tool guidance

Read AGENTS.md, phdk-standards/AGENTS.md, EXECUTION_SCOPE.md and current TASK.md/STATUS.md. The current owner request governs scope; historical task queues are evidence, never autonomous work authorization.

## Current architecture
Cloud decides; Browser executes. services/web is the current React/Vite web source in root Dockerfile, services/api the NestJS API, browser the deterministic Electron runtime. cloud/landing/agent are retained compatibility/alternative source trees; source configuration does not prove live deployment.
Canonical V4 intent lives in docs/specs/v4_KELEDON_CANON.md and v4_KELEDON_BROWSER.md. docs/specs/ remains immutable without the required governance issue. Do not run historical floor restoration in parallel.

## Delivery and versions
Use explicit actual repository workdir; this run uses C:/Users/tboar/OneDrive/Documentos/GitHub/KELEDON.
Implementation delivery follows current PHDK branch/check/version-prefixed commit/PR/review/merge/readback semantics within the requested scope. Bare upgrade performs local standards synchronization plus the bounded read-only Stack Security Review, including no-op synchronization. Git publication and application remediation require applicable authorization in the current request.
Read actual five package versions; never reset to obsolete 0.2.x. Reconcile browser/cloud/landing/services/api/services/web plus lock root metadata once for integrated release.
The version-bump and release workflows were intentionally removed from main. Do not recreate bots, hosted CI, scheduled jobs or tag-triggered publication. Installer assets/production are unverified unless independently evidenced.
Use normal existing authenticated git, never inject credentials into remote URLs or print secrets. Preserve hooks/protections; no force push.

## Checks and safety
Run bounded necessary local source/contract checks and final integrated checks, no watchers. A past hanging compiler observation is not current evidence; diagnose actual tooling and resource limits without bypassing controls.
Restore existing locked dependencies only when needed for the authorized task; no incidental dependency upgrades/additions.
No paid/live provider probes, migrations, production data, provider/settings writes or browser outside scoped UAT.
Preserve KELEDON_RESET_DB/KELEDON_RESET_QDRANT production safety; do not inspect secret values or alter live environment settings.
Do not simulate success. Redact diagnostics, enforce server authorization and tenant isolation, validate untrusted commands; no browser business-policy selection.

## Approved policy for current portfolio (2026-10-12)
Owner explicitly confirmed new email/Google accounts=user without privileges; existing provisioned roles preserved. Existing DB-backed superadmin alone assigns elevated roles/companies. Admin/coordinator operate within authorized company without elevation/company deletion. Resolve actor/tenant from DB; ordinary responses contain secret presence indicators and write-only replacement, never raw keys.
These are recorded policy decisions, not permission for future autonomous work.
