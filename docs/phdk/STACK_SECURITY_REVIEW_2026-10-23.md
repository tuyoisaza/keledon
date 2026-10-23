# Stack Security Review — tuyoisaza/keledon

Review date: 2026-10-23 (America/Mexico_City). Source/advisory refresh checkpoint: 2026-10-23T17:05:51Z.

This is a bounded evidence report for the authorized PHDK vendor update. It does not establish application security clearance.

## Independent outcomes

| Outcome | Result |
|---|---|
| STANDARDS_SYNC | NOT_APPLICABLE to this stack-only evidence document. Verify adoption separately through the vendored VERSION/manifest/native block and the rollout delivery record. |
| STACK_REVIEW_COVERAGE | PARTIAL — selected source declarations, lock entries and dated provider evidence; full dependency/provenance and deployed runtime coverage remain incomplete. |
| STACK_SECURITY_STATUS | GAPS_FOUND — additional unknowns remain; no application clearance is asserted. |
| EVIDENCE_MODE | SOURCE_AND_DATED_PROVIDER_SNAPSHOT |
| Application/runtime validation | NOT PERFORMED by this security evidence assembly. Any separately performed publication gates are recorded in the delivery record and do not establish security or deployed-runtime clearance. |

Execution scope: this security review assembled source, advisory and existing provider evidence through reads and static comparisons. Separately required standards-publication checks, including any locked dependency restore or static application build, belong to the delivery record. Their success does not extend the dependency, provenance or live-runtime coverage claimed here.

## Source identity and freshness

- Repository/default branch: [tuyoisaza/keledon](https://github.com/tuyoisaza/keledon/tree/a9edbbe1287aabedb6999394929b1019d0ef67db) / `main`.
- Current source baseline for this report: `a9edbbe1287aabedb6999394929b1019d0ef67db`.
- Earlier portfolio-audit source: `a9edbbe1287aabedb6999394929b1019d0ef67db`.
- Canonical PHDK baseline: [v2.65.0](https://github.com/tuyoisaza/PHDK/commit/9fc6605c75b42e678bab41feb741dca71fcbabcc).
- Source freshness: same commit as the bounded audit, with manifest/runtime/lock input blobs listed below.
- This report is anchored to the pre-vendoring source SHA. Later standards/version/report commits do not by themselves prove that application dependencies or a deployment changed.

| Reviewed input | Audit Git blob | Current Git blob | Revalidation |
|---|---|---|---|
| Dockerfile | 36dd8b42b4e99c36e3bdda52d9cf1f19b00d2243 | 36dd8b42b4e99c36e3bdda52d9cf1f19b00d2243 | SAME_BLOB |
| agent/package-lock.json | 274fec4d9d6fe7ce80b43328c61d88be31d831a9 | 274fec4d9d6fe7ce80b43328c61d88be31d831a9 | SAME_BLOB |
| agent/package.json | 27d06d17eef4d3bd9ce2aa05d0672306c23a2a83 | 27d06d17eef4d3bd9ce2aa05d0672306c23a2a83 | SAME_BLOB |
| autobrowse-service/package.json | 5969aca6157d1a9f541af56221711de8a8ef626d | 5969aca6157d1a9f541af56221711de8a8ef626d | SAME_BLOB |
| autobrowse/package.json | 5969aca6157d1a9f541af56221711de8a8ef626d | 5969aca6157d1a9f541af56221711de8a8ef626d | SAME_BLOB |
| browser/package-lock.json | ed76f89df47233a1a555feafef3f72fce44a79eb | ed76f89df47233a1a555feafef3f72fce44a79eb | SAME_BLOB |
| browser/package.json | b01041911292273fd4654e743161999770c3376c | b01041911292273fd4654e743161999770c3376c | SAME_BLOB |
| cloud/Dockerfile | 1885049251925075daaa4b1014c3a57cd6c68877 | 1885049251925075daaa4b1014c3a57cd6c68877 | SAME_BLOB |
| cloud/Dockerfile.appengine | 6800036812964662df0b617f780bc0a6fe4e14fa | 6800036812964662df0b617f780bc0a6fe4e14fa | SAME_BLOB |
| cloud/Dockerfile.cloudrun | 72a962812512554f14d111979fad3ba6197549ef | 72a962812512554f14d111979fad3ba6197549ef | SAME_BLOB |
| cloud/package-lock.json | b77ada5a09f7c4dede653c9f49990ca1d251f476 | b77ada5a09f7c4dede653c9f49990ca1d251f476 | SAME_BLOB |
| cloud/package.json | 4900c01de644566fd928a8d8e5521dc2124743c5 | 4900c01de644566fd928a8d8e5521dc2124743c5 | SAME_BLOB |
| cloud/vosk-server/Dockerfile | c5a2a675ba63e262d245f654f283e7876321e727 | c5a2a675ba63e262d245f654f283e7876321e727 | SAME_BLOB |
| docker-compose.dev.v2.yml | cf4b0f7e4edcd33b36ee0e0e94657f69bb896cf1 | cf4b0f7e4edcd33b36ee0e0e94657f69bb896cf1 | SAME_BLOB |
| docker-compose.dev.yml | ee1e7d2e6bd42976f77063aead7725fea9481d5f | ee1e7d2e6bd42976f77063aead7725fea9481d5f | SAME_BLOB |
| docker-compose.observability.yml | f278c0b8fbaa9809b17821e41707f68650879507 | f278c0b8fbaa9809b17821e41707f68650879507 | SAME_BLOB |
| docker-compose.prod.yml | 4c050119028d054c2698b47a467d749104ce9c7f | 4c050119028d054c2698b47a467d749104ce9c7f | SAME_BLOB |
| docker-compose.supabase.local.yml | 17388e5158f33af7717f7fc4ef464e53865cab56 | 17388e5158f33af7717f7fc4ef464e53865cab56 | SAME_BLOB |
| installer/package.json | 390819dcdb9866de36cb71e4fdd275a3ac6845c5 | 390819dcdb9866de36cb71e4fdd275a3ac6845c5 | SAME_BLOB |
| landing/Dockerfile | 92f93d7a0fd349d75e4c8244bb8d2c85dbc55e11 | 92f93d7a0fd349d75e4c8244bb8d2c85dbc55e11 | SAME_BLOB |
| landing/package-lock.json | 68af226baa84aaf952522088e1c1bfe08dae6762 | 68af226baa84aaf952522088e1c1bfe08dae6762 | SAME_BLOB |
| landing/package.json | e18990820c5c52a92a14a9150aab0cf7bf83ce1f | e18990820c5c52a92a14a9150aab0cf7bf83ce1f | SAME_BLOB |
| package-lock.json | 2165b17a8276aed4188db72e05d76db60cb74e85 | 2165b17a8276aed4188db72e05d76db60cb74e85 | SAME_BLOB |
| railway.json | a91a1f69b4382e4738d8daee4f2f290098261579 | a91a1f69b4382e4738d8daee4f2f290098261579 | SAME_BLOB |
| rbac-backend/package-lock.json | 36a273ae4b6bdd56d342e08e15be19b736a75fe6 | 36a273ae4b6bdd56d342e08e15be19b736a75fe6 | SAME_BLOB |
| rbac-backend/package.json | 45b75d187b8f78aa443a7b868d2c94df164c6d95 | 45b75d187b8f78aa443a7b868d2c94df164c6d95 | SAME_BLOB |
| runtime/package-lock.json | 6aa84ad0e24173b007865b0d2f55d55c73f569ac | 6aa84ad0e24173b007865b0d2f55d55c73f569ac | SAME_BLOB |
| runtime/package.json | 16cc1bc4a247d265970919f30cc971a73aa1c12c | 16cc1bc4a247d265970919f30cc971a73aa1c12c | SAME_BLOB |
| services/api/Dockerfile | cb1278574b875c3b03385abaffd15818bb76999f | cb1278574b875c3b03385abaffd15818bb76999f | SAME_BLOB |
| services/api/Dockerfile.appengine | 6800036812964662df0b617f780bc0a6fe4e14fa | 6800036812964662df0b617f780bc0a6fe4e14fa | SAME_BLOB |
| services/api/Dockerfile.cloudrun | 72a962812512554f14d111979fad3ba6197549ef | 72a962812512554f14d111979fad3ba6197549ef | SAME_BLOB |
| services/api/package-lock.json | af2cdb543d261d8d403db961b555aa1972e15916 | af2cdb543d261d8d403db961b555aa1972e15916 | SAME_BLOB |
| services/api/package.json | a01dbf1c953251e554f8e434e22ca7ecc3fb6dc5 | a01dbf1c953251e554f8e434e22ca7ecc3fb6dc5 | SAME_BLOB |
| services/api/railway.toml | bc0892f496d62ec0ae12dbc692e374ba810b8360 | bc0892f496d62ec0ae12dbc692e374ba810b8360 | SAME_BLOB |
| services/api/vosk-server/Dockerfile | c5a2a675ba63e262d245f654f283e7876321e727 | c5a2a675ba63e262d245f654f283e7876321e727 | SAME_BLOB |
| services/web/Dockerfile | f095f26405b4dfb4b04c90bc4bce6173556e09bb | f095f26405b4dfb4b04c90bc4bce6173556e09bb | SAME_BLOB |
| services/web/package-lock.json | 9a64ceb0e4ee11570e6ee20a13b846b42fbf28e4 | 9a64ceb0e4ee11570e6ee20a13b846b42fbf28e4 | SAME_BLOB |
| services/web/package.json | ff52f3030f87b13611e249b0343f04d8df97eab3 | ff52f3030f87b13611e249b0343f04d8df97eab3 | SAME_BLOB |
| services/web/railway.toml | d44c980cddeeccb4aec1fd94c6c7c21d66100db9 | d44c980cddeeccb4aec1fd94c6c7c21d66100db9 | SAME_BLOB |


## Declared runtime, package manager and images

Declarations are source configuration. Ranges and floating tags do not establish an exact build or running version.

| Path | Evidence kind | Declared value | Reference |
|---|---|---|---|
| Dockerfile | Docker FROM declaration; stage usage in source only | FROM node:20-alpine AS builder | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/Dockerfile) |
| Dockerfile | Docker FROM declaration; stage usage in source only | FROM nginx:alpine | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/Dockerfile) |
| cloud/Dockerfile | Docker FROM declaration; stage usage in source only | FROM node:20-bookworm AS builder | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/cloud/Dockerfile) |
| cloud/Dockerfile | Docker FROM declaration; stage usage in source only | FROM node:20-bookworm | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/cloud/Dockerfile) |
| cloud/Dockerfile.appengine | Docker FROM declaration; stage usage in source only | FROM node:18-alpine | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/cloud/Dockerfile.appengine) |
| cloud/Dockerfile.cloudrun | Docker FROM declaration; stage usage in source only | FROM node:18-alpine AS builder | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/cloud/Dockerfile.cloudrun) |
| cloud/Dockerfile.cloudrun | Docker FROM declaration; stage usage in source only | FROM node:18-alpine AS runtime | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/cloud/Dockerfile.cloudrun) |
| cloud/vosk-server/Dockerfile | Docker FROM declaration; stage usage in source only | FROM python:3.11-slim | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/cloud/vosk-server/Dockerfile) |
| landing/Dockerfile | Docker FROM declaration; stage usage in source only | FROM node:18-alpine AS builder | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/landing/Dockerfile) |
| landing/Dockerfile | Docker FROM declaration; stage usage in source only | FROM nginx:alpine AS runtime | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/landing/Dockerfile) |
| services/api/Dockerfile | Docker FROM declaration; stage usage in source only | FROM node:20-slim AS builder | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/services/api/Dockerfile) |
| services/api/Dockerfile | Docker FROM declaration; stage usage in source only | FROM node:20-slim | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/services/api/Dockerfile) |
| services/api/Dockerfile.appengine | Docker FROM declaration; stage usage in source only | FROM node:18-alpine | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/services/api/Dockerfile.appengine) |
| services/api/Dockerfile.cloudrun | Docker FROM declaration; stage usage in source only | FROM node:18-alpine AS builder | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/services/api/Dockerfile.cloudrun) |
| services/api/Dockerfile.cloudrun | Docker FROM declaration; stage usage in source only | FROM node:18-alpine AS runtime | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/services/api/Dockerfile.cloudrun) |
| services/api/vosk-server/Dockerfile | Docker FROM declaration; stage usage in source only | FROM python:3.11-slim | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/services/api/vosk-server/Dockerfile) |
| services/web/Dockerfile | Docker FROM declaration; stage usage in source only | FROM node:20-alpine AS builder | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/services/web/Dockerfile) |
| services/web/Dockerfile | Docker FROM declaration; stage usage in source only | FROM nginx:alpine | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/services/web/Dockerfile) |
| docker-compose.dev.v2.yml | image declaration | qdrant/qdrant:latest | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/docker-compose.dev.v2.yml) |
| docker-compose.dev.v2.yml | image declaration | redis:7-alpine | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/docker-compose.dev.v2.yml) |
| docker-compose.dev.v2.yml | image declaration | pgvector/pgvector:pg16 | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/docker-compose.dev.v2.yml) |
| docker-compose.dev.yml | image declaration | qdrant/qdrant:latest | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/docker-compose.dev.yml) |
| docker-compose.observability.yml | image declaration | jaegertracing/all-in-one:latest | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/docker-compose.observability.yml) |
| docker-compose.observability.yml | image declaration | grafana/grafana:11.2.2 | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/docker-compose.observability.yml) |
| docker-compose.observability.yml | image declaration | node:20-alpine | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/docker-compose.observability.yml) |
| docker-compose.prod.yml | image declaration | qdrant/qdrant:latest | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/docker-compose.prod.yml) |
| docker-compose.prod.yml | image declaration | redis:7-alpine | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/docker-compose.prod.yml) |
| docker-compose.prod.yml | image declaration | pgvector/pgvector:pg16 | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/docker-compose.prod.yml) |
| docker-compose.prod.yml | image declaration | nginx:alpine | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/docker-compose.prod.yml) |
| docker-compose.supabase.local.yml | image declaration | supabase/postgres:15.14.1.081 | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/docker-compose.supabase.local.yml) |
| docker-compose.supabase.local.yml | image declaration | supabase/gotrue:v2.177.0 | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/docker-compose.supabase.local.yml) |
| docker-compose.supabase.local.yml | image declaration | postgrest/postgrest:v12.2.3 | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/docker-compose.supabase.local.yml) |

The web Dockerfiles compile with Node 20 and finish in nginx. Separate API/cloud files also declare Node runtime stages, and legacy source files still reference Node 18. Evaluate each actual service/build role; a web compilation stage is not a live Node server.

## Framework/dependency declarations and lock coverage

These are selected declarations, not a complete dependency vulnerability result. Python, PHP, Electron, Vite, Nest, ORMs/drivers and other listed components were inventoried but not comprehensively checked against all vendor advisories.

| Path | Selected declared components | Reference |
|---|---|---|
| agent/package.json | typescript: ^5.0.0 | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/agent/package.json) |
| autobrowse-service/package.json | fastify: ^4.26.0; @playwright/test: ^1.41.0; playwright: ^1.41.0; typescript: ^5.3.3 | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/autobrowse-service/package.json) |
| autobrowse/package.json | fastify: ^4.26.0; @playwright/test: ^1.41.0; playwright: ^1.41.0; typescript: ^5.3.3 | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/autobrowse/package.json) |
| browser/package.json | electron: ^44.7.0; typescript: ^5.3.3 | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/browser/package.json) |
| cloud/package.json | @nestjs/core: ^11.0.1; pg: ^8.18.0; playwright: ^1.58.1; @prisma/client: ^5.22.0; prisma: ^5.22.0; typescript: ^5.9.3 | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/cloud/package.json) |
| installer/package.json | typescript: ^5.3.3 | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/installer/package.json) |
| landing/package.json | react: ^19.2.0; react-dom: ^19.2.0; typescript: ~5.9.3; vite: ^7.2.4 | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/landing/package.json) |
| rbac-backend/package.json | @nestjs/core: ^10.0.0; typescript: ^5.0.0 | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/rbac-backend/package.json) |
| runtime/package.json | typescript: ^5.3.3 | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/runtime/package.json) |
| services/api/package.json | @nestjs/core: ^11.0.1; @prisma/client: ^5.22.0; pg: ^8.18.0; playwright: ^1.58.1; prisma: ^5.22.0; typescript: ^5.9.3 | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/services/api/package.json) |
| services/web/package.json | react: ^19.2.0; react-dom: ^19.2.0; typescript: ~5.9.3; vite: ^7.2.4 | [source](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/services/web/package.json) |

| Lockfile | Current Git blob | Read/evaluation scope | Reference |
|---|---|---|---|
| agent/package-lock.json | 274fec4d9d6fe7ce80b43328c61d88be31d831a9 | presence only | [lock](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/agent/package-lock.json) |
| browser/package-lock.json | ed76f89df47233a1a555feafef3f72fce44a79eb | presence only | [lock](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/browser/package-lock.json) |
| cloud/package-lock.json | b77ada5a09f7c4dede653c9f49990ca1d251f476 | root/importer prefix only | [lock](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/cloud/package-lock.json) |
| landing/package-lock.json | 68af226baa84aaf952522088e1c1bfe08dae6762 | root/importer prefix only | [lock](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/landing/package-lock.json) |
| package-lock.json | 2165b17a8276aed4188db72e05d76db60cb74e85 | root/importer prefix only | [lock](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/package-lock.json) |
| rbac-backend/package-lock.json | 36a273ae4b6bdd56d342e08e15be19b736a75fe6 | presence only | [lock](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/rbac-backend/package-lock.json) |
| runtime/package-lock.json | 6aa84ad0e24173b007865b0d2f55d55c73f569ac | presence only | [lock](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/runtime/package-lock.json) |
| services/api/package-lock.json | af2cdb543d261d8d403db961b555aa1972e15916 | root/importer prefix only | [lock](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/services/api/package-lock.json) |
| services/web/package-lock.json | 9a64ceb0e4ee11570e6ee20a13b846b42fbf28e4 | root/importer prefix only | [lock](https://github.com/tuyoisaza/keledon/blob/a9edbbe1287aabedb6999394929b1019d0ef67db/services/web/package-lock.json) |

No Next manifest was detected in the bounded source inventory. This is not a clean bill for the other framework dependencies.

## Dated provider/build evidence

Provider inventory checkpoint: `2026-10-23T15:12:15Z`. These existing records were reused, not refreshed after that checkpoint. Current deployment identity/state is therefore UNVERIFIED. Build logs describe an artifact build and are not direct `process.version` evidence. No runtime shell/probe was used.

| Project/service | Observed build version | Deployment ID | Deployment source SHA | Source relationship | Snapshot assessment | Evidence |
|---|---|---|---|---|---|---|
| KELEDON / keledon-web | Node 20 image tag; exact patch not observed | d7ca4601-06b6-411a-bda0-deb89fb63c3c | a9edbbe1287aabedb6999394929b1019d0ef67db | same source SHA | EOL_NODE20_BUILD | [provider record](https://railway.com/project/ccc268b2-a167-4452-9932-ecc93d39e272/service/293aa6eb-dd92-40fd-82da-e5ca21e851cb?environmentId=6bc7210b-8af9-410d-8400-ab23828d289c) |
| KELEDON / keledon-api | Exact Node patch not observed | 124a56bc-ae71-4395-88a2-d5c0ed64a5a8 | a9edbbe1287aabedb6999394929b1019d0ef67db | same source SHA | EXACT_RUNTIME_UNVERIFIED | [provider record](https://railway.com/project/ccc268b2-a167-4452-9932-ecc93d39e272/service/9329a257-3614-4d8c-9e39-9eeb147d87ee?environmentId=6bc7210b-8af9-410d-8400-ab23828d289c) |

- keledon-web build record `2026-10-19T21:25:24.614189032Z`: `[internal] load metadata for docker.io/library/node:20-alpine`.
- keledon-web build record `2026-10-19T21:25:24.966755626Z`: `[internal] load metadata for docker.io/library/node:20-alpine`.

## Data services and container evidence

Data services are associated by the exact provider project ID containing this repository. Co-location does not prove that every service is consumed by the application. Versions below come from existing startup logs; image tags alone are declarations.

| Project | Service | Configured image | Snapshot state | Deployment ID |
|---|---|---|---|---|
| KELEDON | Qdrant | qdrant/qdrant | live | 4f7d7bc7-473f-4f25-942b-da9660a8c9b2 |
| KELEDON | Postgres | ghcr.io/railwayapp-templates/postgres-ssl:18 | live | 3007aa88-ea6f-4497-9050-0f05ba4db8a9 |
| KELEDON | Speaches | ghcr.io/speaches-ai/speaches:0.9.0-rc.3-cpu | live | 0f48dadd-9238-4390-80c7-dbf8f1405779 |

| Project/service | Startup-log runtime | Image declaration | Deployment ID | Limited comparison | References |
|---|---|---|---|---|---|
| KELEDON / Qdrant | 1.19.2 | qdrant/qdrant | 4f7d7bc7-473f-4f25-942b-da9660a8c9b2 | Observed 1.19.2 meets the reviewed internal-gRPC advisory fix; configuration/exposure and other advisories remain unverified. | [vendor](https://github.com/qdrant/qdrant/security/advisories/GHSA-3gph-6c29-p29v); [log source](https://railway.com/project/ccc268b2-a167-4452-9932-ecc93d39e272/service/d7528435-28a7-42e3-b08d-ece9bb7f92fd?environmentId=6bc7210b-8af9-410d-8400-ab23828d289c) |
| KELEDON / Postgres | 18.6 | ghcr.io/railwayapp-templates/postgres-ssl:18 | 3007aa88-ea6f-4497-9050-0f05ba4db8a9 | Observed 18.6 meets the reviewed August release baseline on its own major; not a complete database/OS clearance. | [vendor](https://www.postgresql.org/about/news/postgresql-186-1711-1615-1519-1424-and-19-beta-3-released-3365/); [log source](https://railway.com/project/ccc268b2-a167-4452-9932-ecc93d39e272/service/30a7f006-02d1-4b4b-9727-6b69bb676c7b?environmentId=6bc7210b-8af9-410d-8400-ab23828d289c) |

## Dated security baselines and next actions

- Node reference, re-opened on 2026-10-23: [21 October security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases). Reviewed per-major fixes are 22.23.4, 24.22.1 and 26.12.1. These are dated floors for that notice, not permanent “latest” constants.
- [Official Node support schedule](https://raw.githubusercontent.com/nodejs/Release/main/schedule.json): Node 18 and 20 are EOL. On this review date, 22 and 24 are supported Maintenance LTS; 26 enters LTS on 28 October. For existing supported majors, prefer compatible security patches on that major. For EOL selectors, assess a supported-LTS migration instead of silently changing architecture.
- Prioritize source-confirmed unsupported runtime/image selectors, below-floor build evidence and affected locked Next versions. Match every action to the actual service/build role; update pinned image digests together with tags.
- Reconcile source/default-branch versus deployed SHA and then retrieve bounded existing deployment/runtime metadata. Do not infer remediation from a standards-only commit, successful deploy status or a source pin.
- Complete the unreviewed dependency/native/OS/data-engine work during scoped remediation or the next applicable review. Findings remain open until the relevant changed artifacts and verification evidence are recorded.

## Coverage limits and ownership

- Full direct/transitive advisory coverage, package-source provenance, publisher security, install-script effects and native-binary/OS package inventories: UNKNOWN / NOT FULLY REVIEWED.
- Complete framework/ORM/driver/runtime compatibility and reachable exploitation prerequisites: UNVERIFIED. No vulnerable endpoint was exercised.
- Exact current deployed Node/Python/PHP process versions, current image digests and complete deployment-package resolutions: UNVERIFIED unless a particular startup-log fact is explicitly recorded above.
- This evidence assembly made no package-manager “zero advisories” claim and performed no application request, secret retrieval, database query, provider mutation or runtime test. Any separate locked restore, static build or other publication gate is reported in the standards delivery record, not counted as security coverage here.
- Reported findings do not block delivery of safer PHDK standards and are not repaired by vendoring. Application-release security decisions remain subject to PHDK Secure and existing owner/host controls.
- Next-action owner: the project maintainer/authorized implementation agent. Preserve this dated evidence and record scoped remediation plus actual verification.

Authorship: report prose is AI-generated (100%). The AI-authorship percentage of external source material is not verifiable from the available evidence.
