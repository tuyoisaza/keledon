## Current workflow delta — 5.9.0
| Workflow | Input / authority | Output / next hop | Evidence boundary |
|---|---|---|---|
| interface-planner | Bounded objective + current observed refs/rule metadata, team Brain config | Typed one-action / needs_assistance / goal_observed → server policy gate → authorized executor → fresh observation | Managed schema validation + usage metadata; observed is not business success |
| voice-reply (interface) | Current bounded observation and objective | Grounded reply → existing TTS audio route | Generation/revision rechecked, no external action from reply |
| brain greeting | Explicitly armed confirmed interaction, team script/RAG | Team Brain greeting → existing audio output | Generation/arm rechecked; no invented customer identity |
| automatic foreground orchestrator | UI-confirmed incoming plus optional recent Meet acoustic candidate | At most4 planning steps/objective,12 actions/session; cancel/attention/end→standby | Not a model and not a scheduler; does not bypass planner admin/security |
Persisted operator-authored prompt revisions are preserved. New default planner supports call effect, but existing customized published schemas may reject it safely until explicitly revised via normal AI administration. Mapped incoming accept-call is server-policy authorized independently. No silent prompt overwrite occurs. No LLM/TTS call was made for this source remediation.

---

# KELEDON AI Workflow Catalog — source inventory

**Audit basis:** PHDK 2.53.1 and candidate source 5.2.1. KELEDON uses actual model-backed workflows, so the AI administration and workflow-catalog standards apply. This file maps existing definitions and callsites; no prompt was executed and no model/provider data was accessed.

## Managed workflows

| Stable ID | Purpose / owning feature | Callsite | Input and sensitivity | Output / next hop | Runtime source status |
|---|---|---|---|---|---|
| `brain-chat` | Respond to user request in Brain; feature `brain-chat` | `POST /api/brain/chat` | `context` string, sourced from authenticated product request, `user-content`; runtime delimits user input and untrusted context | Reply returned to Brain UI; `nextHops=[]` in defaults | Managed published prompt, output schema validation and usage linkage in `llm.service.ts`; source only. |
| `browser-planner` | Produce bounded steps for configured browser workflow; feature `browser-planner` | `POST /api/planner/execute` | Authenticated request context, user content | `steps` schema with max 20; Browser Commands service; user approval required before execution; `nextHops=[]` in defaults | Planner controller and bounded Browser command gates exist; exact deployed, tenant-origin and user-approval journey not accepted by this record. |
| `voice-reply` | Produce a concise spoken response for a call session; feature `voice-reply` | `POST /api/brain/chat` with voice mode | Authenticated session/request context; user content | `reply` schema to call-session audio response; `nextHops=[]` in defaults | Managed prompt/runtime callsite exists; actual selected telephony/provider workflow is client-specific and untested. |
| `decision-engine` | Select next safe response or UI action; feature `decision-engine` | `DecisionEngineService.evaluate` | Authenticated call/product context; user content | Typed result (`say`, `ui_steps`, `mode`, `stop`, `ask`) to call orchestration state machine; `nextHops=[]` in defaults | Managed prompt and output schema validation exist. UI actions are bounded by runtime policy; real call execution remains customer-specific. |

## Registry and runtime

`AiPromptDefinition` stores stable ID, name, personality/execution prompts, input/output schemas, owning feature, callsite, destination, `nextHops`, current/published revisions and snapshot. `AiPromptRevision` records actor, revision, changed fields and snapshots. `AiCallUsage` links prompt revision, feature, Team, provider/model, tokens, latency, optional cost/pricing metadata and errors. Defaults are bootstrap definitions in `services/api/src/ai-admin/ai-prompt.defaults.ts`; runtime is in `services/api/src/ai-admin/ai-admin.service.ts` and `services/api/src/llm/llm.service.ts`.

The administration page `services/web/src/pages/AdminPromptsPage.tsx` edits purpose, owning feature, callsite, schemas, destination and graph-edge JSON, shows a workflow relationship view, and requires explicit publish semantics. Server validation restricts registered agent IDs and input/output contract shapes. Runtime loads only the published revision and validates schema before application use. These are source observations, not current DB or UI acceptance.

## Graph and acceptance gaps

The shipped defaults list four named workflows but set all `nextHops` empty. The runtime callsites currently invoke them independently; this catalog must not invent edges to make a diagram look complete. Tenant-specific voice/browser/CRM work is a configured product execution path rather than a universal AI-agent chain. The Prompt page exposes edge metadata, but this source inventory does not establish that the graph is complete, readable/accessible, cycle-safe for every proposed mapping, or exercised with synthetic inputs/replay.

Before claiming full AI-admin conformity, map every invocation and destination against the exact current source, validate any intended graph edges and termination/budget controls, exercise schema-invalid and publish/rollback behavior with isolated provider doubles, and establish measured usage/retention semantics. No secret, personal prompt input, live customer content, provider call or cost value belongs in this catalog.
