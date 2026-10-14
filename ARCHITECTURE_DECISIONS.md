# Architecture decisions
ADR-AUTO-001 retain existing React/Vite/Nest/Prisma/Electron instead of default scaffold; code/Dockerfile evidence.
ADR-AUTO-002 preserve Cloud-decides/Browser-executes, immutable docs/specs and no parallel historical floor restoration.
ADR-AUTO-003 local bounded sanitized diagnostics, no anonymous privileged calls; only app-owned client reset.
ADR-AUTO-004 preserve existing role/tenant restrictive policy; repair proven failure, review material new permission decision. Synthetic tests only.
ADR-AUTO-005 owner confirmed all four fronts in order 2026-10-12; no reusable Auto authority.
ADR-AUTO-006 bots were intentionally deleted on main; do not recreate. Reconcile release once at final integrated boundary.

ADR-AUTO-007 (owner 2026-10-12): call platform/CRM and workflows are per-client configuration. Current focus is code review/conformance and isolated client-agnostic tests; no specific vendor or real-client call required for this review. Real vendor/audio/CRM acceptance is NOT EXECUTED, outside current code-review proof.

ADR-AUTO-008 (owner 2026-10-12): new accounts receive only `user`; only a current existing superadmin grants elevated roles or company assignments; tenant managers remain inside their company and cannot elevate roles/delete companies. API resolves actor/tenant from DB; standard responses do not return stored or submitted credentials. Credential updates replace values. Preserve this policy across API and Cloud entry points and test negative cross-tenant/role-escalation cases.

ADR-AUTO-009 (owner 2026-10-13): every client may choose its own call/CRM provider, including a local CRM. Permit private/local destinations only after URL validation and tenant-owned origin allowlisting. Do not assume a universal live vendor or send private-target requests through Cloud; the customer's Browser connects to its configured client system.
