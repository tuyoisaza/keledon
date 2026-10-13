# UAT stories — KELEDON 5.1.12

| ID / persona | Intent and traceability | Priority | Entry / acceptance |
|---|---|---|---|
| US-001 Anonymous/operator | See and copy the current app version, reset only KELEDON-owned state, and use public/login screens. CMT-001/002. | P1 | `/login`; exact compact widget, truthful success/failure, unrelated browser state preserved, responsive layout. |
| US-002 User/agent | Use provider-independent voice → Cloud → Browser flow and understand safe diagnostics. CMT-002/003. | P1 | No vendor-specific assumption; bounded/safe probes are explicit and manual CRM actions are not offered as safe probes. |
| US-003 Coordinator/admin | View and administer only own company without elevating roles or changing company ownership. CMT-004. | P1 | Company details and user/team form omit forbidden fields and foreign-company teams. |
| US-004 Superadmin | Manage permitted cross-company controls and inspect protected diagnostics. CMT-002/004. | P1 | Global controls appear only to permitted role; protected data remains sanitized. |
| US-005 All UI users | Choose a theme and read/operate controls at narrow and zoom-equivalent widths. UX baseline / PHDK UX/UI. | P1 | Correct semantic colors apply to descendant controls; tested login text has no automated contrast failures; selected reflow checks pass. |

Stories describe goals; executable cases and the synthetic-vs-persisted boundary are in `UAT_CASES.md` and `UAT_REPORT.md`.
