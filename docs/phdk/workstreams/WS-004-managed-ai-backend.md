# WS-004 extension — managed AI backend

Owner requests full applicable PHDK code conformity; root bounded this extension under current AI/provider administration. Implemented AiAdminModule/Controller/Service, defaults/schema validator, three additive Prisma models and SQL migration source only. Root integrates modules/packages; runtime worker integrates call sites; admin worker owns UI/routes. No database, provider, paid API, browser, git publication or secret-value operation executed.

## Contracts

- `src/ai-admin/ai-admin.service.ts`: prepare(feature, optional team context) resolves persistent enabled revision; validateOutput accepts parsed JSON and validates without coercion; recordUsage stores revision/feature/team/provider/requested+response model/measured tokens/latency/safe error code only. No prompts/customer input/output/keys in usage.
- prepare seeds four persistent managed defaults via upsert update:{} (brain-chat, browser-planner, voice-reply, decision-engine); it never overwrites admin edits. Missing tables/storage fail closed before provider call; no hardcoded production fallback. This is application data bootstrap, never migration execution.
- `/api/admin/ai/prompts` GET array, `/:id` GET detail plus latest50 revision metadata, `/:id` PUT mutable name/personality/execution/schema/enabled only with required expectedRevision. Each service admin method resolves current DB superadmin before persistence/bootstrap, not token role. No create/delete unrelated definitions or provider override API.
- Updates use transaction + revision-conditioned updateMany and record actor/from/to/changed field SHA256 before/after fingerprints; stale editors receive409. No confidential prompt text in revision history. Stable IDs remain unchanged.
- Schema: existing Ajv8, strict/no coercion/defaulting/removal, object schema max32KiB/depth16; disallow references/async/regex/format/content keywords, no remote retrieval or schema-controlled regex. Output JSON max128KiB. Action schemas also constrain known command types/counts and type-specific required fields; downstream runtime action policy remains authoritative.
- Consumption is superadmin-only, latest1..200 records, totals explicitly limited to that returned window. Unknown token/cost values remain null; no pricing source installed or guessed. Metadata distinguishes unavailable pricing. Safe error codes only `[A-Z0-9_]{1,64}`, never messages.

## Additive data review and risk

`prisma/migrations/20261012000000_add_managed_ai/migration.sql` creates only ai_prompt_definitions, ai_prompt_revisions, ai_call_usage, indexes and restrictive prompt foreign keys. It changes no existing records/roles/tenant bindings/keys. SQL reviewed against authored Prisma model fields: JSONB, text IDs, integer counters/revisions, nullable measured fields, timestamps, Prisma-generated UUIDs for audit/usage. No DB execution, live validation or rollback performed.

Unavoidable runtime prerequisite: owner/deployment process must apply this reviewed migration before managed AI calls/admin persistence can work. The code fails closed when storage is unavailable. Additive migration preserves old data; a code rollback can leave the unused additive tables in place, rather than destructive automatic drops. Actual provider prices/cost reconciliation remain unavailable, not fake zero.

## Local evidence

`node --test test/ai-admin-contract.test.cjs`:6/6 PASS with actual production service/schema/default imports and fake Prisma. Covers current-DB role negatives, persistent bootstrap/no overwrite, field validation/optimistic revision/audit, remote-reference rejection, output/no-coercion and command required fields, disabled/missing-storage failclosed, usage attribution/unknowns/limit/mismatch. API `npx tsc -p tsconfig.mvp.json --noEmit`:PASS after implementation. SQL consistency source review and git diff-check PASS. Tests do not establish live DB transaction isolation or migration application; revision-conditioned update is the source concurrency defense.

Root must finalize integration and affected tests after runtime/UI wiring. Module export: AiAdminModule / AiAdminService; types PreparedAiPrompt, AiUsageInput; AiFeature in defaults. Root direct Ajv dependency/lock and local client codegen remain central responsibilities. Local uncommitted evidence; no delivery claim.
