# UX research baseline
Evidence: source only; no invented interviews/analytics/screenshots.
Roles: guest landing/login; operator/user/agent launch/calls; coordinator supervision; tenant admin configuration; superadmin authorized cross-tenant administration.
Surfaces: AppRouter, Sidebar/AppLayout, ManagementLayout, public Navbar, LoginPage/LandingPage, Electron renderer.
Jobs: safe diagnosis/reset, launch/pair/readiness/recovery, permitted resource details/updates.
Pain points evidenced in DEBUG_WIDGET_READINESS.md. Preserve navigation and correct flows.
Measures: executed task outcomes, keyboard/focus and negative permission cases. No fabricated numeric targets. Actual visual/media/vendor evidence awaits UAT.

## Current source-based finding — 2026-10-13

The authenticated dashboard and live/history session views contained English-only copy despite the supported Spanish default; the dashboard and session tables lacked captions and explicit column-header scope, and session filters lacked accessible names. This source finding drove J-005/J-006 and the 5.1.15 correction. The assessment is from reachable code and synthetic local UAT, not customer interviews or production analytics. Remaining active-route literal-copy candidates are inventoried in `docs/phdk/workstreams/PHDK-CONFORMITY-REVIEW.md` and are not all confirmed translation defects.
# 2026-10-14 continuation evidence boundary

This source-only baseline applies to run `20261014-0007-phdk-auto-completion`, candidate baseline 5.1.24 at `6413d8aed295c18af098ca6a58c6dfbb7503930b`. Owner decisions confirm four ordered fronts, restrictive DB-derived role/tenant policy, write-only secret replacement, and validated tenant-scoped allowlists for private/local CRM destinations. These are requirements, not claims of complete acceptance. No interviews, customer analytics, live integration runs, deployed visual captures, or production-data evidence were supplied. Pending usability and accessibility conclusions must come from synthetic UAT and be labeled accordingly.

