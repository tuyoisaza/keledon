# Repository architecture
services/web: current React app from root Dockerfile; public/login/operator/admin.
services/api: API voice/planner/CRUD/guards/Prisma and local service Dockerfile.
browser: deterministic Electron executor/IPC/command transport/vendor bootstrap.
cloud, landing, agent: existing compatibility/alternative trees; preserve until migration evidence.
contracts and docs/specs: immutable/canonical contracts, read without rewriting.
phdk-standards and AGENTS.md: exact canonical standards/rules.
docs/phdk/lifecycle/20261012-keledon-four-fronts: historical stage snapshots.
Existing Vite/Nest/Electron topology is a documented brownfield exception to default scaffold. Root owns docs/UI/version/integration; runtime/admin workers own disjoint areas. No parallel floor restoration.
# 2026-10-14 PHDK Auto continuation — current repository map

Run `20261014-0007-phdk-auto-completion`; source baseline `5.1.24` / `6413d8aed295c18af098ca6a58c6dfbb7503930b`. This section is authoritative over older snapshot headings below.

| Surface | Source/deployment | Trust boundary / current proof |
|---|---|---|
| Web UI | `services/web`; root and service Dockerfiles build Vite/React and nginx | Browser regression and diagnostics tests pass; full journey/accessibility coverage remains open. |
| API | `services/api` NestJS/Prisma; API Dockerfile generates Prisma client and compiles TypeScript | Actor/tenant resolution, RBAC, credential encryption and validated vendor origins have source tests; disposable DB proof remains open. |
| Cloud | `cloud` runtime/services | Runtime gateways, voice, flow, persistence, vector scope, seed, subagent and RAG focused suites pass; full ESLint remains 333 errors/59 warnings. |
| Browser | Electron renderer and automation services | Tenant vendor-origin allowlists gate redirects/actions; native OS/device/audio acceptance is not evidenced. |
| Landing/compatibility | landing/static and retained deployment copies | Check parity and SEO/AEO source; external crawls/deployments are outside this run. |

Root `Dockerfile` is the backward-compatible Web deployment copy; `services/web/Dockerfile` is canonical. API deploys from `services/api` build context. Integration must verify package/lock/version and duplicated-manifest parity before assigning a release candidate.
