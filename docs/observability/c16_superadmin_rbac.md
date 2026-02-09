# C16 Superadmin Dashboard RBAC Lock

## Scope

This lock applies to observability access for Grafana and Jaeger in the Superadmin dashboard path.

It does not grant operational authority.

## Role Definition

- Canonical role: `ROLE_SUPERADMIN_OBSERVER`
- Meaning: read-only observability access to traces and dashboard views
- Explicitly not granted:
  - command emission
  - policy mutation
  - decision override
  - flow or execution control

Observability access is not control-plane access.

## Enforcement Model

- Access path is restricted through `keledon-observability-proxy`.
- Default behavior is deny.
- A valid Supabase bearer token is required.
- Required role claim must include `ROLE_SUPERADMIN_OBSERVER`.
- Non-GET/HEAD/OPTIONS methods are rejected.

## Identity Source

- Uses existing Supabase authentication (`/auth/v1/user`) for token verification.
- No hardcoded users.
- No role bypass flags.
- No new auth provider introduced.

## Read-Only Guarantees

- Grafana runs in viewer-only mode and is not exposed directly.
- Jaeger is not exposed directly from this stack.
- Proxy allows only read methods and trace/dashboard retrieval.

## Audit Telemetry

Every dashboard access attempt is logged as a telemetry event with:

- `user_id`
- `role`
- `timestamp`
- `dashboard_id`
- `allowed`
- `reason`

Event name: `superadmin.dashboard.access`

## Interaction with C12 Proof

- `npm run proof:c12:local` remains mandatory.
- RBAC lock is observability-only and must not affect decisioning or extension execution proof flow.
