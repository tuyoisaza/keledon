# UAT stories — run 20261014-0007-phdk-auto-completion

| Story | Persona / intent-linked value | Source intent | Acceptance cases |
|---|---|---|---|
| US-001 | As a visitor or operator, I want a safe report and owned-state reset so I can share useful troubleshooting context without exposing private data or deleting business records. | `PROJECT_INTENT.md`, FR-002, SEC-001; CMT-002 | UAT-001 |
| US-002 | As a tenant manager, I want to administer only my company's resources so customer data and privileged actions stay isolated. | `PROJECT_INTENT.md`, SEC-004; ADR-AUTO-008; CMT-004 | UAT-002, UAT-003 |
| US-003 | As an integration administrator, I want to configure a private/local CRM safely so my client can use its own provider without cross-tenant navigation. | `PROJECT_INTENT.md`, INT-004, ADR-AUTO-009; CMT-003 | UAT-004 |
| US-004 | As an operator, I want the selected call/Cloud/Browser/CRM flow to preserve explicit customer configuration and fail safely. | `PROJECT_INTENT.md`, PRD INT-004; CMT-003 | UAT-005, UAT-006 |
| US-005 | As a release owner, I want a coherent version and verified delivery so operators can identify what runs. | `PROJECT_INTENT.md`, NFR-001; CMT-001 | UAT-007 |
| US-010 | As a visitor, I want public navigation and display preferences to stay clear of the page content and remain reachable on mobile. | `PROJECT_INTENT.md`, INT-002; `PRD.md`, NFR-001; CMT-002 | UAT-052 |
| US-011 | As a public visitor, I want the homepage's theme and language selectors to preserve understandable labels and demo disclosure in each supported combination. | `PROJECT_INTENT.md`, INT-002; CMT-002 | UAT-131 |
| US-012 | As a public visitor or crawler, I want the canonical Web homepage's product explanation present in initial HTML and not duplicated after app startup. | PHDK SEO/AEO; PIA-AUTO-SEO-001 | UAT-133 |
| US-013 | As a visitor opening login, I want the login form and private-route metadata to replace the shared public shell after app startup, without exposing account data. | PIA-AUTO-SEO-001/002 | UAT-134 |

All cases remain inside the owner-approved intent: provider choice is per customer; no universal live CRM/call behavior is assumed.