# Remediation — 5.1.78 managed Cloud AI candidate

## Current continuation — bounded audit export event

The admin CSV export now records `AUDIT_EXPORT_REQUESTED` through a dedicated API/Cloud route protected by the current DB-derived superadmin role. The append-only event stores only actor and tenant from the authenticated record, CSV/visible-page scope, row count, offset and allowed filter names; it excludes filter values and exported contents. The event write is required before the browser starts the download, so a failed audit write blocks export. General CRUD writes to audit logs remain denied, and global interceptors skip this route to avoid duplicate records. API/Cloud in-process HTTP and audit-service contract tests pass; built-Web admin-audit UAT confirms bounded request metadata and download ordering. Audit retention policy and isolated PostgreSQL persistence/restart acceptance remain open.

The Cloud AI integration gap is repaired for source parity. Brain and decision-engine calls now resolve revisioned workflow definitions, schema, provider and key through persisted tenant configuration; enforce bounded server-built inputs and validated structured outputs; apply budget/kill-switch controls; and record safe usage attribution without payloads or guessed price.

The focused Check also found a stale RolesGuard test expectation. It now includes the database-derived companyId projection already used for tenant-attributed denial auditing. The focused guard suite passes 3/3.

Retests: Cloud managed AI 6/6; Cloud regression 19/19; API managed AI 9/9; API regression 42/42; API guard 3/3; scoped Cloud lint; API/Cloud/Web/Landing/Browser builds; Web typecheck; Prisma validate/generate; PHDK coherence 63/63. The API database-dependent e2e case remains blocked by unavailable disposable PostgreSQL. No migrations, provider calls, customer endpoints or deployments were executed.

No in-scope P0/P1 source issue remains for this candidate. Whole PHDK Auto remains **PARTIALLY DELIVERED** pending current Check/Delivery and existing database, broad CRUD, native/accessibility, deployed-discovery and client-selected integration gates.

## Web delivery remediation discovered during final Check

Read-only Railway metadata showed the latest 5.1.77 Web deployment failed in Vite because its configured root directory `/services/web` omitted the canonical `shared/theme-tokens.css` import. The Dockerfile now supports a repository-root build context, and railway.toml identifies its monorepo Dockerfile path. Container build cannot be locally verified because Docker is unavailable. Railway provider settings were not modified; the owner must set the service root to `/` and config-as-code path to `/services/web/railway.toml`, then confirm a successful deployment. The source repair is prepared, but production Web delivery remains EXTERNAL / MANUAL until that setting and deployment are verified.
