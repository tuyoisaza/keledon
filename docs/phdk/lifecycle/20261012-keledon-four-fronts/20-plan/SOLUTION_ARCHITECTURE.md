# Solution architecture — brownfield
Goals: INT-001/002/003, confirmed four fronts. V4 Cloud-decides/Browser-executes invariant.
Current: services/web React/Vite (root Dockerfile copies it), services/api NestJS/Prisma/voice/planner/CRUD, Electron browser. cloud/landing/agent alternatives remain retained; Dockerfiles do not prove live topology.
KEEP: contracts, roles/tenant hierarchy, schema, configured STT/TTS/LLM/vector/vendor interfaces and IPC. EVOLVE: shared diagnostics, bounded runtime validation and evidenced authorization. UNKNOWN: live health/vendors/media/releases.
Target: incremental existing-service repairs; reusable diagnostics; deterministic execution; established server policy tested/fixed without widening rights.
Data: Prisma/PostgreSQL existing models; isolated fixtures, no live migrations. AI/integrations: cloud-configured providers, HTTP/WS/IPC boundaries validated, fake provider tests only.
Security/observability: bounded redacted client buffers, no privileged anonymous fetch/history, honest errors. Deployment: normal branch/PR/main only; preserve watch paths, no provider/settings/CI writes.
Risk: historical plan/source cannot prove live calls. External prerequisites produce explicit blockers.
