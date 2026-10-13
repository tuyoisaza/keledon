# UAT cases — KELEDON 5.1.12

Candidate `ca34792`; local production-built Web UI; synthetic fixtures and intercepted API. PASS means the described scope only.

| Case | Steps and expected outcome | Actual / evidence | Result |
|---|---|---|---|
| UAT-001 / US-001 | Open login; verify exact version row, copy success and failure behavior, then clear KELEDON-owned local/cache state. | Edge assertions pass; foreign local/session keys and cache remain. `uat-local-web.json`; `uat-login-desktop.png`. | PASS, local UI |
| UAT-002 / US-005 | Select light/corporate/dark; verify descendant primary token and rendered button color after transition; scan visible login text against WCAG contrast thresholds. | Each theme matches its declared color; no sampled login text failures. `uat-login-{light,corporate,dark}.png`; `loginContrastSample` in JSON. | PASS, automated sample only |
| UAT-003 / US-001/005 | Exercise login at 390px and simulated 200%/400% viewport widths (640/320px); assert no horizontal overflow. | Assertions pass; screenshots at mobile/200%/400%. Viewport simulation is not Windows zoom. | PASS, selected routes |
| UAT-004 / US-003/004 | Open Company Co detail as superadmin/admin/coordinator; use keyboard/Escape/focus return; collapse navigation; verify selected controls. | Each isolated frontend fixture passes; API is intercepted. Role-specific screenshots. | PASS, UI fixture only |
| UAT-005 / US-003 | As admin, create/reassign user to same-company team; inspect fields and submitted payload. | Role/company fields absent; foreign-company team absent; payload contains only name/email/teamId. | PASS, synthetic UI; API guards tested separately |
| UAT-006 / US-003 | Replace provider key and save; inspect response/UI, then save blank unchanged field. | No secret prefill; replacement clears after save; untouched blank omitted. | PASS, synthetic UI |
| UAT-007 / US-002/004 | As admin, leave diagnostics off, enable, view safe registry, click safe probe, confirm manual-only CRM has no probe, turn diagnostics off. | No initial read; one read after enable; one explicit safe probe; CRM action remains manual-only; results cleared on disable. | PASS, mocked UI/API |
| UAT-008 / US-003/004 | Attempt management as synthetic guest. | Redirect completes without loop; no backend auth claim from UI fixture. | PASS, frontend only |
| UAT-009 / US-003/004 | Verify full persisted CRUD matrix, migration ledger, role revocation and cross-tenant direct IDs. | Isolated API regressions cover selected negatives/controls; no PostgreSQL runtime or persisted identity is available. | BLOCKED, database acceptance |
| UAT-010 / US-002/005 | Verify native Electron media consent and physical device/audio lifecycle. | Renderer/device runtime not exercised in this candidate. | MANUAL / NOT TESTED |
| UAT-011 / US-001/005 | Full active-route screen reader, 200/400% real OS zoom, keyboard, locale-copy and color contrast audit. | Login contrast sample and selected viewport/keyboard checks only. | MANUAL, broad accessibility/localization |
| UAT-012 / US-001 | Verify deployed SEO/AEO headers and discovery behavior. | Source tests only; production GET review awaits explicit target authorization. | BLOCKED, deployed evidence |
| UAT-013 / US-002 | Exercise customer-configured telephony and CRM end-to-end. | Owner confirmed providers vary by customer; no client integration selected. | N/A for common flow |

Full journey and acceptance limits: `UAT_JOURNEY_MAP.md`, `UAT_REPORT.md`, and `UAT_ACCESS_REPORT.md`.
