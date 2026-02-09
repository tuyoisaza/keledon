# KELEDON Canonical Cloud Run Topology (C22.1)

## Status

Configuration clarification only. No architecture change.

## Canonical Production Topology

KELEDON production runs as a managed-service topology with strict runtime boundaries:

1. Cloud Brain service on Cloud Run
2. Managed Supabase (auth verifier and database)
3. Managed Qdrant (vector retrieval store)
4. Managed OTel backend (trace export target)

The Browser/Extension remains execution and I/O only.

## Why Single-Container All-in-One Is Forbidden

Single-container deployment that bundles Cloud Brain + local DB/vector/observability is forbidden in production because it violates canonical production dependency rules:

- breaks managed-service authority for Supabase/Qdrant/OTel
- creates local runtime coupling and silent fallback risk
- mixes stateless service runtime with stateful sidecars
- makes production behavior diverge from canonical managed topology

Allowed use of local containers is limited to `DEV_LOCAL` and `CI_PROOF` only.

## Cloud Run Compatibility Checklist (C22.2)

Cloud Brain must satisfy:

- bind to `PORT` provided by Cloud Run
- fail fast if `PRODUCTION_MANAGED` is selected but managed endpoints are missing/unreachable
- remain stateless (no required local file persistence)
- use explicit CORS origins via `KELEDON_CLOUD_CORS_ORIGINS` in production

## Vector Store Production Readiness (C22.4)

Managed Qdrant compatibility requirements:

- `KELEDON_QDRANT_URL` points to managed Qdrant endpoint
- `KELEDON_QDRANT_API_KEY` is set in `PRODUCTION_MANAGED`
- `KELEDON_QDRANT_COLLECTION` (or `QDRANT_COLLECTION`) names the expected collection
- decision path requires non-empty vector retrieval results for policy-gated command emission

If these conditions are not met, runtime must fail instead of falling back silently.
