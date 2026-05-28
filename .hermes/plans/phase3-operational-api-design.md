# Phase 3: Operational API Design — Call Handling, RPA, Training, Landing UI

> Goal: Define the Cloud contracts and Landing UI needed for KELEDON's end-to-end call loop.
> Prime Law: Cloud decides, Browser executes. The Browser is blind and only follows Cloud-issued commands.
> Constraint: additive-only. Existing tables/routes stay; new contracts layer on top.

## Current Foundation

Already present:
- Core tenant hierarchy: `Company -> Brand -> Team -> User/Keledon`.
- Vendor storage: `Vendor` with `teamId`, `name`, `type`, `baseUrl`, encrypted credential fields, and JSON config.
- RPA models: `ManagedInterface`, `Workflow`, `Flow`, `FlowStep`, `FlowRun`, `SubAgentRun`.
- Call/session models: `Session`, `Event`, `EscalationLog`.
- Voice gateway: socket events for call start/end, transcript input, TTS request, active sessions.
- STT/TTS services: Deepgram STT service exists; TTS provider abstraction supports ElevenLabs/OpenAI/mock.
- Landing pages: management vendors, teams, users, sessions/live/history, flows, knowledge/vector pages.

## Canonical End-to-End Call Loop

States:
1. `standby`
2. `call_received`
3. `listening`
4. `transcribing`
5. `thinking`
6. `answer_ready`
7. `speaking`
8. `action_required`
9. `executing_rpa`
10. `waiting_for_vendor`
11. `reporting`
12. `closed`
13. `escalated`
14. `failed`

Transitions:
- `standby -> call_received`: Browser detects incoming call and notifies Cloud.
- `call_received -> listening`: Cloud accepts call and starts audio intake.
- `listening -> transcribing`: Browser or Cloud streams audio to STT.
- `transcribing -> thinking`: Cloud receives text and calls the Brain/RAG layer.
- `thinking -> answer_ready`: Cloud decides a spoken answer.
- `thinking -> action_required`: Cloud decides an RPA command is needed.
- `answer_ready -> speaking`: Cloud asks TTS provider for audio.
- `speaking -> listening`: Browser plays audio and resumes listening.
- `action_required -> executing_rpa`: Cloud emits RPA command bundle to Browser.
- `executing_rpa -> waiting_for_vendor`: Browser is executing a step with external latency.
- `waiting_for_vendor -> thinking`: Browser returns evidence/extracted data.
- `thinking -> reporting`: Cloud generates final call report.
- `reporting -> closed`: Cloud persists report and releases Browser to standby.
- Any state -> `escalated`: Escalation keyword/manual/system rule triggers human transfer.
- Any state -> `failed`: unrecoverable STT/TTS/RPA/provider/device error.

## Session/Event Contract

Use existing `Session` and `Event` tables. Store evolving call state in `Session.status` and `Session.metadata`.

Session metadata shape:
```json
{
  "callId": "call_...",
  "deviceId": "device_...",
  "teamId": "team_...",
  "keledonId": "agent_...",
  "state": "thinking",
  "language": "es-MX",
  "caller": { "phone": "+52...", "name": null },
  "activeVendorId": "vendor-...",
  "activeFlowId": "flow-...",
  "turnCount": 3,
  "startedAt": "2026-...",
  "lastTransitionAt": "2026-..."
}
```

Event types:
- `call.received`
- `call.accepted`
- `audio.chunk.received`
- `stt.transcript.partial`
- `stt.transcript.final`
- `brain.intent.detected`
- `brain.answer.generated`
- `rpa.flow.selected`
- `rpa.command.issued`
- `rpa.step.started`
- `rpa.step.completed`
- `rpa.step.failed`
- `tts.audio.generated`
- `tts.playback.completed`
- `call.report.generated`
- `call.closed`
- `call.escalated`
- `call.failed`

Event payload base:
```json
{
  "schemaVersion": 1,
  "correlationId": "call_...",
  "stateBefore": "thinking",
  "stateAfter": "action_required",
  "source": "cloud|browser|provider",
  "data": {}
}
```

## Cloud API Contract

Call orchestration:
- `POST /api/calls` — create call/session from Browser.
- `GET /api/calls/:sessionId` — current call state.
- `POST /api/calls/:sessionId/events` — append Browser/provider event.
- `POST /api/calls/:sessionId/transcript` — final transcript turn from STT.
- `POST /api/calls/:sessionId/decide` — Cloud Brain decides answer or action.
- `POST /api/calls/:sessionId/close` — close and write final report.
- `POST /api/calls/:sessionId/escalate` — mark escalated and emit transfer instruction.

Browser command pull:
- `GET /api/browser/devices/:deviceId/next-command`
- `POST /api/browser/devices/:deviceId/command-result`

RPA flow serving:
- `GET /api/teams/:teamId/flows`
- `GET /api/flows/:flowId`
- `POST /api/flows/:flowId/run`
- `POST /api/flow-runs/:runId/steps/:stepId/result`

Provider configuration:
- `GET /api/teams/:teamId/vendors`
- `POST /api/teams/:teamId/vendors`
- `PATCH /api/vendors/:vendorId`
- `POST /api/vendors/:vendorId/test-connection`
- `POST /api/vendors/:vendorId/rotate-credentials`

Training / Qdrant:
- `POST /api/knowledge-bases`
- `POST /api/knowledge-bases/:id/documents`
- `POST /api/knowledge-bases/:id/ingest`
- `POST /api/knowledge/search`
- `GET /api/vector-store/collections`
- `GET /api/vector-store/collections/:name/stats`

## Browser Command Contract

Cloud-issued command:
```json
{
  "id": "cmd_...",
  "sessionId": "session_...",
  "flowRunId": "run_...",
  "type": "rpa.executeFlow|tts.play|call.close|call.transfer",
  "priority": "normal|high|urgent",
  "expiresAt": "2026-...",
  "payload": {}
}
```

Browser result:
```json
{
  "commandId": "cmd_...",
  "status": "completed|failed|partial",
  "startedAt": "2026-...",
  "completedAt": "2026-...",
  "evidence": [
    { "type": "screenshot", "ref": "..." },
    { "type": "text", "content": "Order shipped" }
  ],
  "extracted": { "orderStatus": "shipped" },
  "error": null
}
```

## RPA Step Format

Existing `FlowStep` maps to this canonical schema:
```json
{
  "id": "step_1",
  "order": 1,
  "type": "login|navigate|click|input|extract|wait|decision|speak|close",
  "selector": "#search-input",
  "selectorType": "css|xpath|text|aria",
  "value": "{{call.orderNumber}}",
  "extract": "orderStatus",
  "waitFor": ".results",
  "condition": "{{orderStatus}} != null",
  "timeout": 10000,
  "optional": false,
  "onError": "fail|skip|escalate|retry",
  "maxRetries": 2,
  "redact": ["password", "apiKey"]
}
```

Required step types for v0.3.0:
- `login`: Browser authenticates to vendor using Cloud-provided credential reference.
- `navigate`: go to URL.
- `click`: click selector.
- `input`: fill selector with resolved value.
- `extract`: read text/value into variable.
- `wait`: fixed wait or selector wait.
- `decision`: branch based on variables.
- `speak`: ask Cloud/TTS to say template.
- `close`: clean up vendor tab/session.

## Training Data Format

Knowledge document:
```json
{
  "id": "doc_...",
  "knowledgeBaseId": "kb_...",
  "title": "Return Policy MX",
  "content": "...",
  "metadata": {
    "companyId": "...",
    "teamId": "...",
    "brandId": "...",
    "country": "MX",
    "category": "policy|faq|script|vendor-guide",
    "source": "upload|manual|seed",
    "language": "es-MX",
    "effectiveDate": "2026-..."
  }
}
```

Qdrant point payload:
```json
{
  "documentId": "doc_...",
  "chunkId": "chunk_...",
  "companyId": "...",
  "teamId": "...",
  "brandId": "...",
  "country": "MX",
  "category": "policy",
  "language": "es-MX",
  "text": "chunk text",
  "source": "upload"
}
```

Search request:
```json
{
  "query": "customer asks about refund",
  "teamId": "team_...",
  "language": "es-MX",
  "limit": 5,
  "filters": { "country": "MX", "category": ["policy", "faq"] }
}
```

## Landing UI Wireframes

### Team Configuration
Route: `/management/teams`
- Left: company/brand selector.
- Main: team cards with country, providers, active vendors, active Keledons.
- Right drawer: edit team provider defaults, escalation triggers, language.

### Vendor Management
Route: `/management/vendors`
- Existing page remains.
- Add connection status badge and `Test connection` action.
- Add credential rotation modal.
- Add vendor config JSON advanced editor behind collapsible panel.
- Add team filter and vendor type filter.

### RPA Flow Builder
Route: `/flows`
- Left: flow list grouped by team/vendor.
- Center: ordered step timeline.
- Right: step editor.
- Top actions: Test flow, Publish version, Disable, Duplicate.
- Test mode shows Browser command preview and expected extracted variables.

### Training Data Upload
Route: `/knowledge/upload`
- Dropzone for PDF/CSV/TXT/Markdown.
- Metadata form: company, brand, team, country, language, category.
- Preview chunking before ingestion.
- Ingest button writes `KnowledgeDocument` and Qdrant points.

### Call Monitoring Dashboard
Route: `/sessions/live`
- Active call cards with state, caller, team, agent, duration.
- State timeline per call.
- Transcript panel.
- Current Brain decision panel.
- Current RPA step/evidence panel.
- Escalate/close controls for admins.

### Qdrant Management
Route: `/vector-store`
- Collection stats.
- Document list by team/category.
- Search tester.
- Reingest selected document.
- Soft-disable document/chunk; do not hard delete under Hard Rule #1.

## Implementation Order

1. Add call orchestration service/controller using existing `Session` and `Event` tables.
2. Add Browser command queue model or encode pending commands in session/event stream if avoiding schema change.
3. Add flow-serving endpoints for Browser.
4. Add Landing UI for vendor test + flow builder skeleton.
5. Add knowledge ingestion API and UI.
6. Wire Deepgram streaming in voice gateway.
7. Wire Browser executor to pull commands and post results.

## Acceptance Criteria

Phase 3 design is complete when:
- Cloud call state machine is documented.
- API contracts exist for call events, Browser commands, RPA serving, provider config, and knowledge ingestion.
- RPA step schema is canonical and maps to current `FlowStep` model.
- Training/Qdrant payload schema is canonical.
- Landing UI wireframes define all Phase 4 screens.
