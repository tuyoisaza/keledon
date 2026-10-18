# Current brief — Windows Meet + Salesforce MVP (2026-10-18)
Real-platform, objective-driven Windows interaction MVP: remote Meet voice, interruption, fictitious Salesforce case lookup, grounded spoken reply and standby. Acoustic alerts trigger observation; UI/context confirms an interaction. Meet is not ACD offer detection.
Executor selection OPEN: Electron vs standard browser + Windows component. Preserve Cloud business authority and tenant/security controls. [Intent](docs/intents/windows-meet-salesforce-mvp-intent.md) · [five PIAs](docs/mvp/meet-salesforce/README.md).

---

## Historical baseline (retained; current scope above takes precedence)

# KELEDON project brief
## Current owner decisions — 2026-10-14
New accounts are unprivileged `user`; an existing superadmin alone grants elevated roles/company assignments; admin/coordinator remain within their company and cannot elevate roles or delete companies. The API derives actor and tenant from current DB state. Secrets are write-only in normal API responses and client-supplied replacement credentials are never echoed. Call/CRM vendors vary by tenant. Private/local CRM origins are accepted only when URL-validated and configured in that tenant's allowlist.

Multi-tenant inbound voice/CRM runtime with Cloud policy, deterministic Electron execution and React operator/admin interfaces.
Users: guest, operator/user/agent, coordinator, admin, superadmin.
Confirmed scope, in order: baseline/versions/PR reconciliation; shared safe diagnostics; voice/cloud/browser/CRM contracts; administration/permissions.
Workflows: launch/pair -> vendor readiness -> voice/decision/action -> summary -> standby; permitted resource administration; safe diagnosis/reset.
Current stage: brownfield Auto. Dependencies: existing NestJS/Prisma/PostgreSQL/vector/provider/vendor/IPC contracts; synthetic isolated tests only.
Constraints: PROJECT_INTENT.md and unchanged V4 canon. No new infra, live migrations or restored bots.
Definition of success: all confirmed commitments verified and integrated on target; external acceptance gaps are explicit, never fake PASS. No open intent question.
