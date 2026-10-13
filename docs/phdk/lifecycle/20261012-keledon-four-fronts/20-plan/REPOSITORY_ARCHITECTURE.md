# Repository architecture
services/web: current React app from root Dockerfile; public/login/operator/admin.
services/api: API voice/planner/CRUD/guards/Prisma and local service Dockerfile.
browser: deterministic Electron executor/IPC/command transport/vendor bootstrap.
cloud, landing, agent: existing compatibility/alternative trees; preserve until migration evidence.
contracts and docs/specs: immutable/canonical contracts, read without rewriting.
phdk-standards and AGENTS.md: exact canonical standards/rules.
docs/phdk/lifecycle/20261012-keledon-four-fronts: historical stage snapshots.
Existing Vite/Nest/Electron topology is a documented brownfield exception to default scaffold. Root owns docs/UI/version/integration; runtime/admin workers own disjoint areas. No parallel floor restoration.
