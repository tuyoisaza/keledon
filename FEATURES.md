## Current source features — 5.9.0
- Positive company/team surface policies; no classification means read-only observation.
- Audited command reservation/publication and deterministic two-minute memory erasure.
- Explicitly armed Meet/UI/Brain cycle with bounded actions, cancellation and standby reset.
- Audit-backed account suspension/reactivation/session revocation; unchanged role-elevation policy.
- Team voice/profile settings connected to TTS; provider capabilities enforced.
- Compact diagnostics and translated interface controls; modular AI/CRUD services.
All are source implementations; actual production build and deployment are recorded separately. UAT NOT RUN; installer/backups/tenant-risk decisions excluded.

---

# Current feature delta — Meet/Salesforce MVP, 2026-10-18
CMT-003 includes MVP-R01..R09 in [five PIAs](docs/mvp/meet-salesforce/README.md). Windows first; Electron is a candidate, not an obligation. No AppleScript or fake telephony/CRM.
This slice prepares intent, plan, experimental profile schema/example, Windows read-only inventory and UAT runbook. Operational audio/conversation/CRM integration is not delivered by these artifacts.

---

## Historical baseline (retained; current scope above takes precedence)

# Features / confirmed fronts
## Current continuation status — 2026-10-14
The owner reconfirmed SEC-004/INT-004 behavior: least-privilege registration and role assignment, DB-derived tenant identity, write-only secret replacement, per-tenant CRM/call configuration, and validated tenant origin allowlists for private/local CRM targets. Source remediation and final delivery remain in progress; database/native/deployed acceptance remains independently tracked.

| Feature | Intent/requirements | Actor/value | Acceptance | Dependencies/status |
|---|---|---|---|---|
| FEAT-001 baseline/versions/PRs | INT-002; FR-001,NFR-002 | owner; accurate state | actual facts, scoped PR review, single integrated version | first/IN PROGRESS |
| FEAT-002 safe shared diagnostics | INT-002/003; FR-002,SEC-001,NFR-001 | all users; safe troubleshooting | common mounts, redaction/reset negative tests and independent states | baseline/PLANNED |
| FEAT-003 deterministic voice/execution | INT-001; FR-003,SEC-002 | operators; reliable approved actions | isolated contracts plus explicit real-call blockers | baseline/PLANNED |
| FEAT-004 bounded administration | INT-003; FR-004,SEC-003 | admin/superadmin; permitted CRUD | role/tenant/resource matrix and negative cases | baseline/PLANNED |
All P0/P1 for this portfolio; no new vendor integration/live operations/bot restoration/schema redesign.
