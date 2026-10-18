# KELEDON value milestone plan

Run: 20261014-0007-phdk-auto-completion
Plan revalidation: PHDK 2.56.0 / product baseline 5.2.18 / 2026-10-18
Repository: tuyoisaza/keledon
Verified planning base: remote main b1dd123fb66d861fa3b5507b79d85fa888bdc6d7
Approach: Hybrid — the four outcomes and security invariants are stable; tenant-specific provider choices and external acceptance adapt to each customer's configured environment.
Authority: the owner-confirmed four commitments and the explicit production-only acceptance/security boundaries in AUTO_STATE.json.

This roadmap supersedes milestone sequencing in older snapshots but does not erase their evidence. Product version numbers are not reserved; reconcile the current main version when each milestone is ready to publish.

## Portfolio traceability

| Milestone | Owner value / commitment | Linked intent and requirements | Workstreams / included work | Dependencies | Material risk / PM domain impact | Acceptance evidence | Expected SemVer | UAT user-goal intent | Current status |
|---|---|---|---|---|---|---|---|---|---|
| MS-001 | Trustworthy release baseline and delivery evidence / CMT-001 | INT-002; FR-001, NFR-002 | WS-001: PHDK 2.56 alignment, current source/version/PR/deployment reconciliation, lifecycle and commitment evidence | Current main and canonical PHDK source | Stale evidence can cause wrong release action; Governance, Scope, Risk | Static PHDK coherence, exact remote SHA/tree/version and scoped PR/deployment readback | PATCH for docs/evidence only | Owner can identify the exact delivered source and distinguish it from a local or historical candidate | DELIVERED TO MAIN — PR #269 merged as f50b264ee31ae481c79e6075843c8d1c532bbe24; Web/API SUCCESS and UAT-153 scoped v5.2.17 query readback; normal URL's stale v5.2.16 HTML is separately recorded |
| MS-002 | Operators can diagnose safely and truthfully / CMT-002 | INT-002/003; FR-002, SEC-001, NFR-001 | WS-002: shared diagnostics readiness, route/surface coverage, copy/cache/reset privacy/accessibility, production UAT fixes | Existing shared widget and current production candidate | Secret/PII disclosure or clearing business state; Scope, Quality, Risk, Stakeholders | Exact deployed-source UAT for truthful copy, pre-capture redaction, app-owned reset, keyboard/focus and responsive journeys | PATCH unless a new user-facing capability warrants MINOR | Operator can understand and share a sanitized diagnostic or clear only its owned diagnostic state | PARTIAL — PR #270 merged as 5.2.18 at b1dd123; Railway Web/API now SUCCESS. UAT-154 confirms fresh-query v5.2.18/control names; UAT-155 confirms sampled keyboard order and visible focus. Copy/reset, responsive, screen-reader and authenticated acceptance remain open |
| MS-003 | Recoverable, tenant-safe Browser command execution / CMT-003 | INT-001/003; FR-003, SEC-002, BR-001; PIA CMT-003C1 and CMT-003A | WS-003: reconcile audited fixture path; add bounded lease, authenticated start/heartbeat, fencing and safe ambiguous-effect reconciliation across API and Browser | CMT-003C1 source path is on main; production journey depends on an existing superadmin session and two normal synthetic accounts | Duplicate CRM side effects or stale worker corruption; Quality, Resources, Risk, Governance | Sanitized production transitions for Q-LEASE-01/02, Q-ONCE-04, Q-FENCE-05 and Q-TENANT-06; idempotent sandbox for Q-IDEM-03 | MINOR for coordinated additive API/Browser protocol | Operator's same approved command can recover before execution while an uncertain started effect is never silently repeated | PARTIAL — atomic claim/result slice exists; lease protocol and authenticated production evidence remain |
| MS-004 | Private CRM destinations are safe and tenant-owned / CMT-003 | INT-001/003; INT-004, FR-003, SEC-002, BR-003; PIA CMT-003B | WS-004: complete redirect/DNS/socket address policy and tenant-specific destination binding for private networks | Validated tenant allowlist; positive acceptance depends on a client-selected synthetic DNS/CRM sandbox and exact host/port/CIDR | SSRF, DNS rebinding or redirect escape; Quality, Risk, Scope, Stakeholders | Source review plus safe synthetic negative cases; positive DNS/socket evidence only from that tenant's authorized sandbox | PATCH for enforcement repair; MINOR only for actual new supported capability | Tenant can reach its configured CRM while unauthorized destinations remain unreachable | PARTIAL — source gaps and positive sandbox UAT remain |
| MS-005 | Tenant administration respects least privilege / CMT-004 | INT-003; FR-004, SEC-003, SEC-004; admin and CRUD standards | WS-005: close source-resolvable role/resource/API/UI gaps; retain DB-derived actor scope, write-only secrets, company-bounded admins and audit behavior | Existing role policy and current Prisma/API/Web surfaces; authenticated acceptance depends on approved synthetic identities | Privilege escalation, cross-tenant access or secret exposure; Governance, Quality, Risk, Stakeholders | Current 41-model/574-row matrix reconciled; production-only allowed/denied synthetic role journeys and persistence/audit evidence | PATCH for auth correction; MINOR for new admin capability | Each administrator can complete only the resource changes granted to that role and company | PARTIAL — selected paths exist; broad resource/role/surface matrix and production acceptance remain |
| MS-006 | One coherent, accepted release across the four commitments / CMT-001–004 | All P0/P1 requirements; NFR-002 | Cross-milestone integration, final UX/security/CRUD review, production-only permitted UAT, Check/remediation, SEO/AEO evidence, completion audit and remote-main readback | MS-001 through MS-005; external customer/provider/device gates may remain itemized | Cross-surface regression or false completion; all material domains | Every milestone has intent-linked UAT; P0/P1 findings are retested; remote main/source/version/deploy and residual gates independently read back | PATCH for docs-only reconciliation; otherwise highest integrated source impact | Owner/operator can trace the integrated outcome and its accepted/unaccepted paths across all four commitments | NOT STARTED |

## Milestone definitions and exit evidence

### MS-001 — Release baseline and evidence

Outcome: the owner and implementers can identify the exact source, version, change and deployment state without relying on stale snapshots.

Acceptance:
- Fresh remote main SHA/tree and product version are recorded; all application package/lock roots and Browser renderer agree.
- Applicable open PRs are reconciled by actual current state; merged source and post-deploy evidence are distinguished.
- PHDK coherence and manifest/native-rule integrity pass; no stale PHDK-only gate is carried forward as an external blocker.
- The current plan, task, milestone, commitment coverage and PMO status point to this run and the same candidate.
- No provider settings, CI, scheduler, secret, or customer-data operation is included.

Evidence: static repository/version/coherence output, authoritative remote Git readback, and bounded existing deployment metadata when available. No local application test/build/lint under the owner's standing restriction.

Expected SemVer impact: PATCH for a docs/evidence-only delivery; reconcile rather than reserve a version.

### MS-002 — Safe diagnostics and widget journeys

Outcome: users see truthful, bounded diagnostics and can copy or clear only app-owned local diagnostic state on every applicable surface.

Acceptance:
- Read and reconcile DEBUG_WIDGET_READINESS.md against Web, Landing, Browser and mounted shell routes, roles and current production source.
- Sanitization occurs before capture/copy; credentials, tokens, personal data and private hostnames are absent from output.
- Copy and clear report independent truthful outcomes; clear cannot erase business/session/device/auth state.
- Production-only UAT covers the approved public and synthetic journeys, keyboard/focus/accessible names, responsive geometry and applicable localized themes; no live probe or customer data.
- Fix in-scope P0/P1 findings and retest the affected deployed candidate. Native device/audio or unsupported deployment surfaces stay MANUAL/UNVERIFIED with precise evidence.

Evidence: source/diff review and production browser UAT evidence tied to deployed SHA/version. Existing test source is not execution evidence.

Expected SemVer impact: PATCH unless implementation introduces a new user-visible capability that meets the repository's MINOR criteria.

### MS-003 — Tenant-safe Browser command lifecycle

Outcome: an expired pre-execution claim can be recovered, but an operation that may have started is never automatically repeated without a confirmed idempotency contract.

Acceptance:
- Keep the stable command and operation identity; resolve tenant/device/actor from the database, never from Browser-supplied authority.
- Persist append-only attempt transitions with bounded TTL and attempt/time limits; claims are atomic across API replicas.
- Browser must obtain an accepted start before invoking a side-effecting handler; authenticated heartbeats renew only the current attempt/token.
- Stale token/attempt results and heartbeats are rejected. A completed result is terminal and duplicate result submission returns the same terminal result.
- Expiry before start may make the same command claimable. Expiry after start becomes reconciliation_required and cannot automatically re-run.
- CRM/vendor retry remains disabled unless that tenant's adapter contract proves idempotency; otherwise preserve at-most-once semantics and explicit reconciliation.
- Production cases Q-LEASE-01/02, Q-ONCE-04, Q-FENCE-05 and Q-TENANT-06 run only with approved synthetic production fixtures; Q-IDEM-03 additionally requires that customer's authorized idempotent sandbox.

Evidence: exact deployed API/Browser version, sanitized transition readback and cleanup confirmation. Missing authenticated superadmin, synthetic sessions or sandbox blocks only its dependent acceptance; no PASS is inferred from source.

Expected SemVer impact: MINOR for the additive, coordinated API/Browser lease protocol; reconcile product policy before publication.

### MS-004 — Tenant-scoped private egress

Outcome: private/local CRM is usable only for the tenant's explicitly configured, validated and safely resolved destination, with each network hop still inside policy.

Acceptance:
- Validate scheme, credentials, hostname, port and normalized URL; enforce tenant-owned allowlist on every redirect/navigation/resource path.
- Resolve and validate all IPv4/IPv6 answers at connection time; prevent DNS rebinding, mixed public/private answers outside the tenant policy, metadata/link-local access and redirect escape.
- Bind the validated address to the socket/connection so DNS is not independently re-resolved after policy evaluation.
- No global private-range exception; private destinations require an explicit per-tenant owner-configured allowlist.
- Negative security cases use safe production synthetic endpoints; positive private egress runs only against that tenant's exact authorized host/port/CIDR and synthetic CRM. Do not probe private infrastructure or metadata services.

Evidence: source/security review and per-tenant production UAT with sanitized DNS/redirect/socket evidence. Without the customer-provided private sandbox, keep positive acceptance BLOCKED while finishing source work and negative checks.

Expected SemVer impact: MINOR if adding a tenant-configured egress capability; PATCH if it only closes an existing enforcement defect without expanding supported behavior.

### MS-005 — Administration and permissions

Outcome: each actor can manage only the resources and operations allowed by the confirmed role/tenant contract.

Acceptance:
- Reconcile every current Prisma model against role × API/Web/Cloud surface × C/R/U/D using the current CRUD matrix and exact code.
- New email/Google accounts remain user; only an existing active DB superadmin grants elevated roles/company; Admin/Coordinator cannot elevate roles or delete companies.
- API resolves actor and tenant from current DB state; foreign tenant IDs fail closed; secrets are replaced write-only and never returned in normal responses.
- Resolve every unambiguous source gap with matching API, persistence, UI and audit behavior; no placeholder capability or source-only row is marked accepted.
- Production-only synthetic acceptance covers allowed and denied role/tenant pairs; migration/restart and audit/retention cases require the approved disposable/synthetic environment.

Evidence: source/diff review plus exact-candidate production UAT; verified persistence and audit readback where in scope. Keep unprovided key provisioning or privileged session cases blocked without reading secrets or inventing identities.

Expected SemVer impact: MINOR for new admin capability; PATCH for scoped authorization corrections with no feature expansion.

### MS-006 — Integrated completion

Outcome: one versioned candidate is traceable across requirements, architecture, all four commitments, UAT, Check, delivery and remote main.

Acceptance:
- Integration Review resolves shared API, Browser, tenant, locale, version and evidence contracts.
- Production-only UAT maps each milestone to at least one intent-linked user-value journey and required role/cross-tenant negatives.
- P0/P1 findings are fixed and retested on the deployed candidate; external/native/customer cases remain itemized, never promoted to PASS.
- Final Check includes PHDK coherence, automation hygiene bounded read-only evidence where authorized, UX/admin/CRUD and completion audit.
- Normal branch → PR → merge → remote main SHA/tree/version readback succeeds; preserve host controls and do not use Actions or bypasses.

Expected SemVer impact: PATCH for a documentation/evidence-only final reconciliation; otherwise follow the highest integrated source change.

## Seven-domain PMO view

| Domain | Planning control |
|---|---|
| Governance | Current owner-approved four-front mandate; exact auth/tenant/private-egress rules are binding; no inferred reviewer or provider authority |
| Scope | Only CMT-001–004 and their accepted requirements/PIAs; no universal CRM vendor, new infrastructure, live customer data, live calls, CI or schedules |
| Schedule | Dependency order above; no dates or completion estimates invented; external gates are shown as dependencies |
| Finance | No budget or paid-service ceiling was supplied; avoid metered calls and provider writes; cost remains UNKNOWN |
| Stakeholders | Owner controls material policy; tenant owners choose/configure their CRM and sandbox; operators/admins are user-value actors |
| Resources | Current assistant/repository and allowed production browser UAT; no delegated agents; synthetic fixtures are capped by the runbook |
| Risk | Duplicate side effects, tenant escape, stale sessions, private-network SSRF, stale plan evidence and unavailable production identity are explicit risks with gates above |

## Change and replan triggers

Replan only when a new owner-confirmed commitment changes scope, a material security/provider architecture decision is required, current main changes a dependency, or production UAT contradicts an acceptance assumption. Preserve prior milestone evidence and update this plan with the observed source/revision; do not create a new run merely for a milestone transition.
