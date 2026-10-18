# KELEDON PMO charter — PHDK 2.56.0

Run: 20261014-0007-phdk-auto-completion
Owner-confirmed scope: CMT-001 through CMT-004, in that order
Verified base: remote main b54d747a63da8c27fa1358c3db82d2787038f966 / product 5.2.16
Active branch: phdk/auto-review-next-20261018
Roadmap: ../20-plan/MILESTONE_PLAN.md

## Portfolio objective

Deliver a trustworthy, accessible, secure multi-tenant contact-center product by maintaining the release baseline, completing safe diagnostics, protecting per-client voice/Cloud/Browser/CRM execution, and closing administration/permission gaps. All four fronts are confirmed; no new front or scope reduction is introduced.

## Governance and shared constraints

- Owner-confirmed role/tenant policy, tenant-specific private-CRM allowlist, production-only app acceptance, and synthetic-fixture scope are controlling.
- Normal versioned branch → scoped PR → merge → remote main/SHA/version readback is the delivery path. Current user authority includes continuing this Auto goal and its in-scope publication.
- No local application tests/build/lint; production acceptance uses the approved synthetic path only. Do not use customer identities/data, live calls/CRM, provider writes, Actions/schedules, secrets in chat, or force-push.
- Production identity and tenant sandbox are operation-specific prerequisites, not a global stop. Continue source work and independent UAT.
- Work proceeds sequentially in this assistant session; no subagents or background workers. Shared docs/version/API contracts are owned centrally by the orchestrator.

## Workstream portfolio

WS-001 baseline/version/PR (MS-001); WS-002 widget and safe diagnostics (MS-002); WS-003 command lease/fencing and audited synthetic execution (MS-003); WS-004 tenant DNS/socket/redirect egress (MS-004); WS-005 administration/permissions/CRUD (MS-005). MS-006 integrates all delivered milestones and carries residual gates into final UAT/Check/Delivery. Details and dependencies are in PMO_WORKSTREAMS.md and PMO_DEPENDENCIES.md.

## Seven-domain control and integration

Governance: preserve owner decisions and real host controls. Scope: only four commitments and linked PIA requirements. Schedule: dependency order; no invented dates. Finance: budget unknown, avoid metered providers. Stakeholders: owner and each tenant's chosen integration owner. Resources: current repo/browser and assistant sequential work. Risk: side-effect duplication, tenant escape, DNS rebinding, stale plan evidence and missing synthetic access.

Integrate shared API/Browser protocol and versions before UAT. Keep client-specific live acceptance separate from provider-neutral source. No workstream may claim DONE based on a branch, source presence or deployment SUCCESS alone.

## Definition of done

Each milestone meets its user-value acceptance, applicable evidence is tied to the deployed source, versioned changes merge through the normal PR path, current remote main is read back, and every remaining external acceptance gate is recorded precisely. Whole Auto remains partial while any confirmed commitment/gate lacks proof.
