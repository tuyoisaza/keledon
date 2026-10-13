#!/bin/sh
set -eu

# Railway may expose its generated database URL under a DATABASE_<url> name.
_real_db_url=$(env | awk -F= '!/^DATABASE_URL=/ && /^DATABASE_/ && /postgresql:\/\// {rest=substr($0, index($0,"=")+1); print rest; exit}')
if [ -n "$_real_db_url" ]; then
  export DATABASE_URL="$_real_db_url"
  echo "Using auto-injected database URL"
fi

echo "--- Waiting for database migrations ---"
_migration_applied=false
for _attempt in 1 2 3 4 5; do
  if npx prisma@5.22.0 migrate deploy; then
    _migration_applied=true
    break
  fi

  if [ "$_attempt" -lt 5 ]; then
    echo "Migration attempt $_attempt failed; retrying in 3s..." >&2
    sleep 3
  fi
done

if [ "$_migration_applied" != true ]; then
  echo "Database migrations failed after 5 attempts; refusing to start the API." >&2
  exit 1
fi

echo "--- Seeding database (only if empty) ---"
if ! _company_count=$(node -e "const{PrismaClient}=require('@prisma/client');new PrismaClient().company.count().then(c=>{console.log(c);process.exit(0)}).catch(()=>process.exit(1))" 2>/dev/null); then
  echo "Could not verify the company count; refusing to seed or start the API." >&2
  exit 1
fi
if [ "$_company_count" = "0" ]; then
  ts-node -O '{"module":"commonjs"}' scripts/seed-main-data.ts && echo "seed-main-data OK" || echo "seed-main-data FAILED (non-fatal)"
  ts-node -O '{"module":"commonjs"}' scripts/seed-operational-data.ts && echo "seed-operational-data OK" || echo "seed-operational-data FAILED (non-fatal)"
  echo "--- Seeds complete ---"
else
  echo "Database has $_company_count companies — skipping seeds"
fi

exec node dist/main
