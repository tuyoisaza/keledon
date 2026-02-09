# KELEDON Production Readiness Matrix (C22.8)

| Component | Managed Service | Required Env Vars | Proof |
| --- | --- | --- | --- |
| Cloud Brain (Cloud Run) | Cloud Run | `KELEDON_ENV_TIER=PRODUCTION_MANAGED`, `PORT`, `KELEDON_CLOUD_CORS_ORIGINS` | `npm run proof:c12:local` |
| Auth + DB boundary | Supabase (managed) | `KELEDON_SUPABASE_URL`, `KELEDON_SUPABASE_ANON_KEY` | `npm run proof:c12:local` |
| Vector retrieval | Qdrant (managed) | `KELEDON_QDRANT_URL`, `KELEDON_QDRANT_API_KEY`, `KELEDON_QDRANT_COLLECTION` | `npm run proof:c12:local` |
| Observability export | Managed OTel backend | `KELEDON_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` | `npm run proof:c12:local` |
| Extension cloud path | Cloud Brain URL only | `KELEDON_CLOUD_BASE_URL` | `npm run proof:c12:local` |

## Required Correlated Spans

- `keledon.vector.retrieve`
- `keledon.policy.check`
- `keledon.decide`
- `keledon.command.emit`
- `keledon.agent.exec`
