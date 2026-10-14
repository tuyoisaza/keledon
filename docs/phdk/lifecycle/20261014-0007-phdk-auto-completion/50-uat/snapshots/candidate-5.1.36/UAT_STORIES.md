# UAT stories — run 20261014-0007-phdk-auto-completion

| Story | Persona / intent-linked value | Source intent | Acceptance cases |
|---|---|---|---|
| US-001 | As a visitor or operator, I want a safe report and owned-state reset so I can share useful troubleshooting context without exposing private data or deleting business records. | `PROJECT_INTENT.md`, FR-002, SEC-001; CMT-002 | UAT-001 |
| US-002 | As a tenant manager, I want to administer only my company's resources so customer data and privileged actions stay isolated. | `PROJECT_INTENT.md`, SEC-004; ADR-AUTO-008; CMT-004 | UAT-002, UAT-003 |
| US-003 | As an integration administrator, I want to configure a private/local CRM safely so my client can use its own provider without cross-tenant navigation. | `PROJECT_INTENT.md`, INT-004, ADR-AUTO-009; CMT-003 | UAT-004 |
| US-004 | As an operator, I want the selected call/Cloud/Browser/CRM flow to preserve explicit customer configuration and fail safely. | `PROJECT_INTENT.md`, PRD INT-004; CMT-003 | UAT-005, UAT-006 |
| US-005 | As a release owner, I want a coherent version and verified delivery so operators can identify what runs. | `PROJECT_INTENT.md`, NFR-001; CMT-001 | UAT-007 |
| US-006 | As a tenant user or manager, I want the knowledge page to show only real tenant-scoped documents and truthful system state, with controls matching my role, so I can use operational knowledge without mistaking a demo for a live call or RAG result. | `PROJECT_INTENT.md`, INT-002/003; `REQUIREMENTS_TRACEABILITY.md`, CMT-002/004 | UAT-030 |
| US-009 | As a tenant administrator, I want to revoke a device with a clear confirmation while ordinary operators can only inspect their own safe device summary, so lost device credentials can be disabled without crossing company boundaries. | `PROJECT_INTENT.md`, SEC-001/004; ADR-AUTO-008; CMT-004 | UAT-032 |

All cases remain inside the owner-approved intent: provider choice is per customer; no universal live CRM/call behavior is assumed.



## Historical records from earlier candidates

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
