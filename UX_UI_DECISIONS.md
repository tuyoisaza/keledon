# UX/UI decisions
D-UI-001 keep Vite/React/brand/navigation (NFR-001).
D-UI-002 replace duplicated diagnostic variants with common component/utilities across public/login/app/admin (FR-002).
D-UI-003 independent awaited green check + hidden ARIA status; no toast or version substitution (FR-002).
D-UI-004 safe owned-key/cache reset; no origin-wide delete (SEC-001).
D-UI-005 source baseline and actual UAT evidence separately; no fake visual proof.
D-UI-006 preserve existing en/es/pt catalogs and expand localization systematically across active user/admin journeys; avoid unrelated bulk rewrites. 5.1.15 begins with the dashboard and records the remaining route inventory as open work.
D-UI-007 dashboard data tables include a programmatic caption and explicit column-header scope; synthetic UAT checks the Spanish accessibility names without claiming screen-reader certification.
Rejected: page-specific widgets (drift), colliding invisible targets, destructive broad reset.
