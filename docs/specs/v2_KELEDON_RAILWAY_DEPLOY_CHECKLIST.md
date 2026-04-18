# KELEDON — Railway Deploy Checklist (Prisma Canon)

## Goal
Make KELEDON Cloud testable on Railway with canonical Prisma + managed Postgres posture.

## Required Files/Contracts
- `railway.json` present at repo root
- `cloud/prisma/schema.prisma` present
- `cloud/prisma/migrations/*` present
- `cloud/src/main.ts` enforces `DATABASE_URL` in managed tier
- `cloud/src/app.module.ts` supports `DATABASE_URL` first

## Railway Service Settings
- Root directory: repository root
- Start command (from `railway.json`):
  - `cd cloud && npm run prisma:migrate:deploy && npm run start`

## Required Railway Environment Variables
- `KELEDON_ENV_TIER=PRODUCTION_MANAGED`
- `NODE_ENV=production`
- `PORT` (Railway sets automatically)
- `DATABASE_URL` (Railway Postgres connection string)
- `KELEDON_CLOUD_BASE_URL` (public backend URL)
- `KELEDON_QDRANT_URL`
- `KELEDON_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`
- `KELEDON_CLOUD_CORS_ORIGINS` (must include frontend origin, no localhost)

## Smoke Test
1. Deploy service
2. Check health endpoint: `GET /health`
3. Verify logs include database-ready startup lines
4. Verify migrations applied successfully (`prisma migrate deploy` in logs)

## Ready-for-Test Criteria
You can start Railway tests when all are true:
- Build succeeds on Railway
- Deploy reaches healthy status
- `/health` responds 200
- No startup error for DATABASE_URL or managed endpoints

---

If any check fails, deployment is NOT READY.
