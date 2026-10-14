# UX research baseline
Evidence: source only; no invented interviews/analytics/screenshots.
Roles: guest landing/login; operator/user/agent launch/calls; coordinator supervision; tenant admin configuration; superadmin authorized cross-tenant administration.
Surfaces: AppRouter, Sidebar/AppLayout, ManagementLayout, public Navbar, LoginPage/LandingPage, Electron renderer.
Jobs: safe diagnosis/reset, launch/pair/readiness/recovery, permitted resource details/updates.
Pain points evidenced in DEBUG_WIDGET_READINESS.md. Preserve navigation and correct flows.
Measures: executed task outcomes, keyboard/focus and negative permission cases. No fabricated numeric targets. Actual visual/media/vendor evidence awaits UAT.

## Current source-based finding — 2026-10-13

The authenticated dashboard and live/history session views contained English-only copy despite the supported Spanish default; the dashboard and session tables lacked captions and explicit column-header scope, and session filters lacked accessible names. This source finding drove J-005/J-006 and the 5.1.15 correction. The assessment is from reachable code and synthetic local UAT, not customer interviews or production analytics. Remaining active-route literal-copy candidates are inventoried in `docs/phdk/workstreams/PHDK-CONFORMITY-REVIEW.md` and are not all confirmed translation defects.
