# UAT stories

## Active Auto candidate 5.1.17

| Story | Actor | User goal / intent-linked outcome | Intent source |
|---|---|---|---|
| US-007 | Company administrator | As a company administrator, I want to create and manage KELEDON records with clear field and failure feedback, so that I can administer my company's automation safely and understand when a change did not save. | `PROJECT_INTENT.md` INT-002/003; `REQUIREMENTS_TRACEABILITY.md` FR-004, SEC-001..003; owner-confirmed CMT-004. |
| US-008 | Company administrator | As a company administrator, I want to configure voice profiles using the API's tenant and field contract, so that profiles stay scoped to my company and valid configuration is accepted. | `PROJECT_INTENT.md` INT-003; `REQUIREMENTS_TRACEABILITY.md` FR-003/004, SEC-001..003; owner-confirmed CMT-003/004; client platforms remain tenant-selected. |

The synthetic UI/API tests do not prove persisted tenant isolation. Their evidence is limited to observed frontend requests, visible states and isolated API regressions.
UAT-001: maintainer verifies current baseline, versions and PR dispositions without reviving old recovery work.
UAT-002: visitor/manager copies safe diagnostics or clears only owned local state and sees success only after completion.
UAT-003: configured client runtime accepts authenticated tenant commands, serializes work, validates browser outcomes and returns standby after a successful close.
UAT-004: managers stay in their tenant; only superadmin changes elevated access; saved keys never refill secret inputs; protected AI administration exposes real revisions and unknown consumption honestly.
UAT-005: failures/cancellation/disabled AI/budget exhaustion remain failures and cannot produce fabricated completion.

## 5.1.7 execution boundary

US-001..US-006 remain the stable intent-linked stories above. Current evidence revision `edce7eafbe13ac16ab93274a87e12571e7b04b2e` (same tree as remote main) closes scoped local UI checks for US-001, US-002, selected US-004, and US-006. US-003/US-005 remain isolated contract-test evidence only. Full persisted role/CRUD, native device/audio and deployed discovery acceptance remain open; no client vendor was selected.
