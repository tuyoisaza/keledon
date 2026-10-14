# UX/UI decisions
D-UI-001 keep Vite/React/brand/navigation (NFR-001).
D-UI-002 replace duplicated diagnostic variants with common component/utilities across public/login/app/admin (FR-002).
D-UI-003 independent awaited green check + hidden ARIA status; no toast or version substitution (FR-002).
D-UI-004 safe owned-key/cache reset; no origin-wide delete (SEC-001).
D-UI-005 source baseline and actual UAT evidence separately; no fake visual proof.
D-UI-006 preserve existing en/es/pt catalogs and expand localization systematically across active user/admin journeys; avoid unrelated bulk rewrites. 5.1.15 delivered dashboard/session copy; 5.1.16 continues with profile, devices, the linked Keledon launcher and session detail while preserving the remaining route inventory as open work.
D-UI-007 dashboard data tables include a programmatic caption and explicit column-header scope; synthetic UAT checks the Spanish accessibility names without claiming screen-reader certification.
D-UI-008 display profile dates in the selected locale; keep device list states and launcher copy in shared catalogs, announce loading/errors, and use semantic theme tokens so light/dark modes remain legible. Device pairing remains within its existing role/tenant-controlled Keledon flow.
D-UI-009 session-detail return navigation uses the app router and remains a keyboard-operable link; the recording/transcript region stays an explicit localized placeholder until that capability is implemented.
Rejected: page-specific widgets (drift), colliding invisible targets, destructive broad reset.
