# C15 Superadmin OTel Dashboard Runbook

## Purpose

Implement and operate the KELEDON Superadmin observability dashboard as read-only telemetry.

This dashboard observes existing OTel traces only. It is not a control plane.

## Preconditions

- `npm run proof:c12:local` must be PASS on the target branch.
- Use canonical spec: `docs/observability/otel_superadmin_dashboard_spec.md`.

## Start Observability Stack (DEV)

Grafana (connects to existing local Jaeger):

```bash
docker compose -f docker-compose.observability.yml up -d
```

If Jaeger is not already running, start Jaeger + Grafana together:

```bash
docker compose -f docker-compose.observability.yml --profile with-jaeger up -d
```

Endpoints:

- Grafana: `http://localhost:3000` (`admin` / `admin`)
- Jaeger: `http://localhost:16686`

## Implemented Panels

Dashboard: `KELEDON Superadmin OTel Dashboard`

Panels:

1. System Health
2. Decision Integrity
3. Vector Grounding Coverage
4. Agent Execution Outcomes
5. Canonical Law Violations

Each panel uses existing span names and attributes only.

## What Each Panel Proves

- **System Health**: decision + command + execution traces are present and correlated.
- **Decision Integrity**: policy check evidence exists for decisions that emit commands.
- **Vector Grounding Coverage**: vector retrieval occurs and doc IDs are populated.
- **Agent Execution Outcomes**: cloud command emission is followed by extension execution evidence.
- **Canonical Law Violations**: highlights missing vector evidence, missing execution evidence, or trace correlation breaks.

## Verification Sequence

1. Run `npm run proof:c12:local` from `cloud`.
2. Confirm proof output includes:
   - `session_id`
   - `decision_id`
   - `trace_id`
   - `qdrant_doc_ids=doc-1,doc-2,doc-3`
   - `validated_ops=keledon.vector.retrieve,keledon.policy.check,keledon.decide,keledon.command.emit,keledon.agent.exec`
3. In Grafana, open `KELEDON Superadmin OTel Dashboard` and verify panel queries for the same spans.

## Read-Only Guarantee

- No dashboard buttons or mutation workflows.
- No decision hooks or command APIs.
- No browser/cloud policy mutation paths.
- Data source is Jaeger trace query only.

The dashboard can observe, but cannot issue commands or alter runtime behavior.
