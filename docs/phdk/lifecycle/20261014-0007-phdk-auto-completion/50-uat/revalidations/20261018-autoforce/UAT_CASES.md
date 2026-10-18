# UAT cases — Auto Force re-entry (2026-10-18)

## Current post-merge candidate case — 5.2.15

**User story US-CMT004-IFCAT-01 (CMT-004 / ADM-CAT):** As a platform superadmin, I want the company-owned interface catalog to open from a direct link, so I can administer client integrations without exposing the catalog to tenant roles. Source intent: `10-capture/revalidations/20261018-autoforce/PROJECT_INTENT.md`; acceptance: superadmin-only catalog route and protected anonymous entry.

| ID | Actor / actions | Expected | Result |
|---|---|---|---|
| UAT-150 | Anonymous production visitor; open `/admin/interfaces` directly, then compare the known protected `/management/teams` route. | The catalog URL serves the SPA and redirects to `/login`; no catalog or tenant data is exposed. | **PASS_SCOPED after repair**: FAIL reproduced on 5.2.15 due missing Nginx `known_spa_route` entry; after PR #267 / 5.2.16 Web deployment, fresh anonymous navigation resolved to `/login`, displaying v5.2.16. Evidence `../evidence/uat-150-admin-interfaces-spa-allowlist-2026-10-18.json`. |

The anonymous route retest passes on deployed 5.2.16 Web. It does not replace authenticated superadmin/tenant isolation acceptance.

**User story US-CMT002-DIAGNOSTICS-01 (CMT-002):** As an anonymous visitor, I want the diagnostic controls to remain named and operable with adequate targets, so I can identify the app version and reach support affordances without exposing private runtime data. Source intent: `10-capture/revalidations/20261018-autoforce/PROJECT_INTENT.md`.

| ID | Actor / actions | Expected | Result |
|---|---|---|---|
| UAT-151 | Anonymous visitor; open production `/login`, inspect AX names and measure diagnostic targets/document width. | Version visible; copy/clear have accessible names; sampled controls at least 44×44 CSS px; no horizontal overflow. | **PASS_SCOPED** for rendering and accessible names on 5.2.15; fresh 5.2.16 production revalidation again displayed both named controls. Geometry was not remeasured on 5.2.16; earlier 44×44 and 1581/1581px measurement is limited to 5.2.15. Clipboard, cache clear, mobile and runtime payload redaction not exercised. Evidence `../evidence/uat-151-production-login-widget-2026-10-18.json`. |

| ID | Persona / intent | Steps | Expected | Result |
|---|---|---|---|---|
| UAT-143 | Anonymous public visitor; CMT-002 | Load production home and inspect visible version plus disclosure for illustrative/demo state. | Page loads; actual deployed version is identifiable; simulated session is not represented as live telemetry. | PASS_SCOPED on v5.2.10; evidence `production-anonymous-uat.json`. |
| UAT-144 | Anonymous visitor; CMT-004 | Navigate to production `/management/teams` without credentials. | Redirect to `/login`; no tenant management information appears. | PASS_SCOPED; evidence `production-anonymous-uat.json`. |
| UAT-141 revalidation | Anonymous mobile/login visitor; CMT-002 | Read rendered login target geometry in production without activating controls. | Every sampled target is at least 44×44 CSS px. | FAIL_REPRODUCED on deployed v5.2.10: brand 152×40, email 399×41, password 399×41, create account 69×20. Preserve the original failure. |
| UAT-142 | Anonymous login visitor; CMT-002 | After PR #259's 5.2.11 candidate is deployed, measure those same controls on `/login` without signing in. | Each is at least 44×44 CSS px; fresh production version/deployment evidence ties result to the candidate. | BLOCKED at entry: production currently serves 5.2.10; candidate not deployed. |

Authenticated role/tenant, Browser device/command, flow, CRM/private-egress and elevated admin journeys remain blocked under the current UAT Prep handoff. No live CRM/call or private destination is part of these cases.
