# KELEDON Superadmin OTel Dashboard Spec

## Status

This document is the canonical authority for Superadmin observability scheduling in KELEDON.

Scope is read-only observability.

## Preconditions

- `npm run proof:c12:local` MUST be PASS on the target branch before dashboard deployment.
- If C12 proof is not PASS, dashboard deployment is BLOCKED.

## Canonical Stack Decision

- **Grafana** is the Superadmin dashboard surface.
- **Jaeger** is the trace explorer and source of truth.
- Optional future trace store is **Tempo** only if fed by the same existing OTel stream.

Explicitly rejected alternatives:

- Custom admin backend inside KELEDON Cloud.
- Product-side custom dashboard UI for superadmin observability.
- New decision or control services tied to observability panels.

## Scope Boundary (Read-Only)

- Dashboards observe cloud and extension runtime evidence.
- Dashboards do not execute commands.
- Dashboards do not alter policy, intent, flow, or command emission.

This is observability, not a control plane.

## Canonical Superadmin Views

1. **System Health**
2. **Decision Integrity**
3. **Vector Grounding Coverage**
4. **Agent Execution Success**
5. **Canonical Law Violations**

## Required Queries and Failure Conditions

### 1) System Health

- Spans: `keledon.decide`, `keledon.command.emit`, `keledon.agent.exec`
- Required attributes:
  - `decision.id`
  - `trace_id`
  - `execution_status`
- Query logic (pseudo):
  - count traces with all three spans in rolling window
  - compute successful execution ratio where `execution_status=success`
- Red condition:
  - missing any required span in correlation set
  - success ratio below operational threshold

### 2) Decision Integrity

- Spans: `keledon.policy.check`, `keledon.decide`, `keledon.command.emit`
- Required attributes:
  - `policy.decision_id`
  - `policy.ids`
  - `decision.id`
- Query logic (pseudo):
  - join by `decision.id` / `policy.decision_id`
  - verify command emission exists for each decision
- Red condition:
  - decision without policy evidence
  - command emitted without matching decision evidence

### 3) Vector Grounding Coverage

- Spans: `keledon.vector.retrieve`, `keledon.decide`
- Required attributes:
  - `vector.doc_ids`
  - `decision.vector_doc_ids`
  - `decision.id`
- Query logic (pseudo):
  - ensure each decision has vector retrieval span
  - verify doc IDs populated and non-empty
- Red condition:
  - no vector retrieval span for decisions
  - missing/empty doc IDs

### 4) Agent Execution Success

- Spans: `keledon.command.emit`, `keledon.agent.exec`
- Required attributes:
  - `decision.id`
  - `command_type`
  - `execution_status`
  - `tab_id`
- Query logic (pseudo):
  - pair command emit and agent exec by `decision.id`
  - trend execution status by command type
- Red condition:
  - command emit without agent exec
  - repeated `failure` or `blocked` execution status

### 5) Canonical Law Violations

- Spans: `keledon.vector.retrieve`, `keledon.decide`, `keledon.command.emit`, `keledon.agent.exec`
- Required attributes:
  - `decision.id`
  - `trace_id`
  - `execution_status`
  - `vector.doc_ids`
- Query logic (pseudo):
  - detect decisions missing vector grounding
  - detect execution evidence missing for emitted commands
  - detect trace correlation breaks across required spans
- Red condition:
  - any decision path without vector evidence
  - any emitted command without execution evidence
  - trace mismatch across required spans

## Grafana Dashboard Specification (Planning Only)

For each panel, define:

- Panel purpose: one of the canonical views above.
- Data source: Jaeger (or Tempo mirroring same OTel traces).
- Query logic: span + attribute filters and correlation keys.
- Panel state:
  - Green: all required evidence present and correlated.
  - Red: any defined failure condition met.

No provisioning scripts, no deployment manifests, and no infra rollout are included in this scope.

## Scope-Drift Prevention

- This dashboard is not a control plane because it has no write path and no execution authority.
- Superadmins observe telemetry only; they do not intervene in runtime decisions via the dashboard.
- Cloud remains sole decision authority; browser remains execution-only.
