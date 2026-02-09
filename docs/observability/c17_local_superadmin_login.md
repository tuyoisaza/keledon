# C17 Local Dev Superadmin Login Flow

## Purpose

Provide one-command local developer steps for read-only superadmin observability access.

This flow never grants control-plane authority.

## Preconditions

- C12 proof must pass on branch: `npm run proof:c12:local`.
- RBAC proxy role requirement: `ROLE_SUPERADMIN_OBSERVER`.
- Local Supabase stack is running via Supabase CLI (`npx supabase start`).
- Observability proxy reads `observability/.env.local.supabase`.

## Local Supabase First

Start local Supabase:

```bash
./scripts/dev-supabase-cli-local.sh
```

Windows PowerShell:

```powershell
./scripts/dev-supabase-cli-local.ps1
```

Health checks:

```bash
curl -i http://localhost:54321/health
curl -i http://localhost:54321/auth/v1/health
```

Default local auth config used by scripts/proxy:

- `SUPABASE_URL=http://localhost:54321`
- `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from `observability/.env.local.supabase`
- `docker-compose.supabase.local.yml` is deprecated for auth bootstrap and not used in the supported flow.

## One Command: Start Stack

```bash
docker compose -f docker-compose.observability.yml up -d
```

Serves RBAC proxy at `http://localhost:3014`.

## One Command: Login and Get Token

Windows PowerShell:

```powershell
./scripts/otel-login.ps1 -ExportToken
```

Shell:

```bash
./scripts/otel-login.sh
```

Both commands print:

`Authorization: Bearer <token>`

Notes:

- Scripts use local Supabase by default.
- Scripts read env from process first, then fallback to `observability/.env.local.supabase`, then `cloud/.env`.
- No hardcoded users, no bypass tokens.

## One Command: Assign Observer Role (Auditable)

Windows PowerShell:

```powershell
./scripts/otel-assign-observer-role.ps1 -Email <your-email>
```

Shell:

```bash
./scripts/otel-assign-observer-role.sh <your-email>
```

This updates Supabase app metadata with `ROLE_SUPERADMIN_OBSERVER`.

## One Command: Open / Validate Dashboard Access

Windows PowerShell:

```powershell
./scripts/otel-open.ps1
```

Shell:

```bash
./scripts/otel-open.sh "$KELEDON_OBS_TOKEN"
```

RBAC proxy paths:

- Grafana (proxied): `http://localhost:3014/grafana/`
- Jaeger (proxied): `http://localhost:3014/jaeger/`

Browser note:

- Browser access requires Authorization header injection (for example ModHeader) because proxy requires bearer auth for all reads.

## Verification Commands

Set token variable first (PowerShell `$env:KELEDON_OBS_TOKEN`, shell `export KELEDON_OBS_TOKEN=...`).

Unauthenticated must be 401:

```bash
curl -o /dev/null -s -w "%{http_code}" http://localhost:3014/grafana/api/health
```

Wrong role must be 403:

```bash
curl -o /dev/null -s -w "%{http_code}" -H "Authorization: Bearer <token-without-observer-role>" http://localhost:3014/grafana/api/health
```

Correct role must be 200:

```bash
curl -o /dev/null -s -w "%{http_code}" -H "Authorization: Bearer $KELEDON_OBS_TOKEN" http://localhost:3014/grafana/api/health
```

Non-read method must be 405:

```bash
curl -o /dev/null -s -w "%{http_code}" -X POST -H "Authorization: Bearer $KELEDON_OBS_TOKEN" http://localhost:3014/grafana/api/health
```

## Audit Telemetry

Every request emits:

- `event=superadmin.dashboard.access`
- `user_id`
- `role`
- `timestamp`
- `dashboard_id`
- `path`
- `method`
- `allowed`
- `access` (`allow|deny`)

Inspect logs:

```bash
docker compose -f docker-compose.observability.yml logs keledon-observability-proxy --no-color
```

## Optional Remote Supabase

Remote Supabase can still be used for non-local environments by exporting `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` before running scripts.
