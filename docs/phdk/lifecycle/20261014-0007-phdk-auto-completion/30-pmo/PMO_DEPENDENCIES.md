# PMO dependency and integration map — KELEDON Auto

## Ordered value dependencies

MS-001 / WS-001 → MS-002 / WS-002 → MS-003 / WS-003 → MS-004 / WS-004 → MS-005 / WS-005 → MS-006 integrated UAT/Check/delivery. This preserves the owner's four-front order while decomposing CMT-003 into its two accepted PIAs.

```text
CMT-001 baseline and PHDK 2.56 plan
  └── CMT-002 diagnostics UAT/remediation
        └── CMT-003A/003C1 command lifecycle source and lease fencing
              ├── authenticated production acceptance (existing superadmin + synthetic pair)
              └── CMT-003B tenant DNS/socket egress
                    └── positive private CRM acceptance (client-selected sandbox host/port/CIDR)
                          └── CMT-004 broad role/resource acceptance where the same fixture is needed
                                └── integrated cross-milestone UAT, Check, normal delivery readback
```

## Hard gates versus independent work

- Missing superadmin session/synthetic users blocks authenticated fixture creation and the production acceptance cases that need those identities. It does not block source analysis, documentation, command protocol implementation or public anonymous UAT.
- Missing client sandbox blocks positive private egress/idempotent CRM acceptance only. It does not block DNS/socket source hardening or safe negative synthetic checks.
- A current owner prohibition on local app suites is a real check boundary. Do not run those suites or represent static review as application acceptance; use production UAT after a candidate is deployed.
- No external provider configuration, host access, credentials or CI operation is a dependency the agent may create.

## Shared contracts and collision control

| Shared item | Participating workstreams | Integration rule |
|---|---|---|
| Product version and package/lock/renderer roots | WS-001 through WS-005 | One centrally reconciled version per integrated product candidate; exact current-main reconciliation before publication.
| Browser command envelope/API/events | WS-003, WS-004 | WS-003 owns attempt/lease/fencing. WS-004 preserves its tenant URL checks on each request and socket; integrate only after source review.
| Actor, tenant and fixture lifecycle | WS-003, WS-004, WS-005 | Database-derived identity; fixture limits from PIA-CMT-003C1; no test-as or privileged test users.
| Diagnostics and lifecycle evidence | WS-001, WS-002, all UAT | Redact secrets/PII before storage/copy; never report deploy or source status as UAT pass.
| CRUD inventory and admin surfaces | WS-005, WS-002 | 41 schema models / 574 role-surface rows; update matrix only with current source/evidence.
| PHDK Plan/PMO artifacts | WS-001, all workstreams | Maintain one current roadmap/coverage/status; historical snapshots immutable.

No worker delegation is used; changes to shared files are serialized by the current orchestrator.
