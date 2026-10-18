# UAT cases — Auto Force re-entry (2026-10-18)

| ID | Persona / intent | Steps | Expected | Result |
|---|---|---|---|---|
| UAT-143 | Anonymous public visitor; CMT-002 | Load production home and inspect visible version plus disclosure for illustrative/demo state. | Page loads; actual deployed version is identifiable; simulated session is not represented as live telemetry. | PASS_SCOPED on v5.2.10; evidence `production-anonymous-uat.json`. |
| UAT-144 | Anonymous visitor; CMT-004 | Navigate to production `/management/teams` without credentials. | Redirect to `/login`; no tenant management information appears. | PASS_SCOPED; evidence `production-anonymous-uat.json`. |
| UAT-141 revalidation | Anonymous mobile/login visitor; CMT-002 | Read rendered login target geometry in production without activating controls. | Every sampled target is at least 44×44 CSS px. | FAIL_REPRODUCED on deployed v5.2.10: brand 152×40, email 399×41, password 399×41, create account 69×20. Preserve the original failure. |
| UAT-142 | Anonymous login visitor; CMT-002 | After PR #259's 5.2.11 candidate is deployed, measure those same controls on `/login` without signing in. | Each is at least 44×44 CSS px; fresh production version/deployment evidence ties result to the candidate. | BLOCKED at entry: production currently serves 5.2.10; candidate not deployed. |

Authenticated role/tenant, Browser device/command, flow, CRM/private-egress and elevated admin journeys remain blocked under the current UAT Prep handoff. No live CRM/call or private destination is part of these cases.
