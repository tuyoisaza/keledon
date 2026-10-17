# UX architecture
Preserve '/' and '/login', protected operator AppLayout and management shell; common diagnostics once per applicable region. Retain Electron readiness/activity hierarchy.
Separate public-safe client reports from authorized server diagnostic/management content. Copy is local/bounded; no live probe. Reset app-owned client state, never business data.
Critical journeys in UX_JOURNEYS.md; exact role/resource constraints in CRUD_MATRIX.md. Compare source baseline with actual candidate UAT.
# 2026-10-14 PHDK Auto continuation — current journey boundaries

Source baseline for run `20261014-0007-phdk-auto-completion`. Keep public landing/login, protected operator app, management shell, Cloud runtime, Browser/Electron and per-tenant integrations as separate trust surfaces. The four approved work fronts remain ordered baseline/version/PR, widget/diagnostics, voice→Cloud→Browser→CRM, administration/permissions.

Roles and tenant boundaries follow DB-resolved identity. New accounts are users; only an existing superadmin assigns elevated roles/companies. Admin/coordinator remain within their company and cannot elevate roles or delete companies. Credential replacement inputs are write-only; normal responses expose presence/safe metadata only. Local/private CRM URLs are allowed only when URL-validated and explicitly allowlisted for that tenant. Diagnostics must not probe integrations or disclose secrets/transcripts.

Source journeys and route inventory are documented in `UX_JOURNEYS.md`; actual visual, keyboard, screen-reader, OS permission and device outcomes must be reported only from current-candidate UAT. Provider-specific completion is customer-configured and cannot be generalized across tenants.
