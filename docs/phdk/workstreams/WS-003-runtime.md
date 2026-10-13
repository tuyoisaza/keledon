# WS-003 — Runtime contract inspection and bounded repair

Run: 20261012-keledon-four-fronts. PHDK 2.50.8; local candidate only. Worker scope: voice / Cloud / Browser / CRM, deterministic inspection and isolated diagnostics. No git writes, providers, browser, live database, paid calls, dependencies or migrations executed.

## Repaired and reproduced

`browser/src/command-poller.ts` previously parsed `readResponseBody(res)`, a diagnostic preview capped at 200 characters. Any realistic multi-step CRM queue command could be dequeued then fail JSON parsing without execution/result. Successful responses now use complete JSON, reject malformed command envelopes before handlers, preserve explicit failure for unknown command names, and reject pending responses after stop/restart. A single in-flight poll spans fetch, execution and result reporting, preventing interval ticks from overlapping actions in the same browser.

`browser/tests/command-poller.test.cjs` loads the actual production TypeScript through transpilation, with fake fetch, fake interval callbacks and synthetic handlers. It verifies a >500-character fill payload survives intact, concurrent ticks do not start another poll while a handler awaits, success results are reported, malformed envelopes never invoke handlers, unknown commands report failed, and stopped/restarted generations cannot execute stale responses.

Evidence: `node browser/tests/command-poller.test.cjs` PASS. Running the identical harness against `git show HEAD:browser/src/command-poller.ts` fails at the first assertion: expected one long command executed, observed zero. No external operation was involved. Whole-candidate typecheck/build belongs to root integration.

## Integrated source trace and unresolved findings

1. Pairing connects `/ws/runtime`, emits session:start and sends configured vendor goals (cloud-connection.ts / DeviceGateway). DeviceGateway validates the token against DeviceService at connection, but session:start accepts client team/session context for vendor selection. Root/admin notified; no policy/auth changes made here.
2. VoiceWSClient connects `/ws/voice`, emits call:start, forwards audio/reply/end events. VoiceGateway checks only token presence in handleConnection, trusts caller team context, broadcasts call metadata and transcript on namespace-wide events, and voice:sessions lists all sessions. Root/admin notified for established identity/tenant policy remediation; this is a security finding, not a passing contract.
3. Browser transcript events send voice:transcript to DeviceGateway; it invokes DecisionEngine and sends say/ui_steps. The separate VoiceGateway uses its own LLM/provider path. Source presence does not establish one correlated live call loop.
4. WebRTC incoming-track callback in VoiceGateway.handleWebRTCOffer explicitly leaves STT wiring as Phase 2. Received data-channel transcript is echoed as voice:brain:reply, not processed through the decision engine there. This is a real integrated implementation gap, not merely missing external evidence.
5. Cloud polling goal_execute/rpa_execute invokes local planGoalActions. WebSocket AutoBrowse executeGoal calls planGoalActionsWithAI, which prefers/falls back to local heuristics. This violates the strict V4 Cloud-decides / Browser-executes contract for arbitrary goals. A safe fix requires converging both command paths on cloud-issued validated plans and explicit failure rather than inventing browser business actions; no silent redesign was attempted.
6. WebSocket goalExecutionLock currently logs queueing but does not wait/return, so different goal IDs can concurrently execute on the shared active BrowserView. Poller serialization repaired above does not fix this distinct socket path. It needs its own serialized bounded command/evidence tests.
7. call-handler.closeCall stops capture and clears in-memory call context; no configured CRM summary/disposition writeback is established in that path. VoiceClient also starts a call on every socket connect. V4 full finalization/readiness must remain unresolved until actual correlated call/CRM lifecycle is implemented and accepted.

## Acceptance limits and exact external UAT prerequisite

Local queue transport case: PASS with synthetic production-module test. V4 real-call case: BLOCKED / implementation incomplete; do not label complete from this repair. First resolve findings 1–7 under root integration and security review. Then owner/operator supplies an authorized local or dedicated staging client/team/device and configured call + CRM surfaces, safe test identities, STT/TTS provider settings and bounded metered-call permission. In scoped Auto UAT, place one synthetic inbound call, record matching session/decision/action IDs, audio STT→Cloud→TTS results, cloud-approved CRM steps, final notes/disposition result and standby evidence. Redact credentials, customer content and tokens. Production data/provider operations remain excluded. Resume cue after those prerequisites: PHDK uat for UAT-003/UAT-005.

## Exact changed paths

- browser/src/command-poller.ts
- browser/tests/command-poller.test.cjs
- docs/phdk/workstreams/WS-003-runtime.md

No API/auth, version, lockfile or lifecycle-document writes by this worker. Publication unverified / local only; root owns integration and delivery.


## Continued implementation after initial inspection (current evidence)

The initial findings above are historical and have now been remediated as follows:

- Added `gateways/runtime-identity.ts`: stored valid paired/disconnected device token plus matching device ID, linked active Keledon, stored user/team/brand/company consistency. `RuntimeDeviceGuard` protects browser queue routes and enforces path device ID. `RuntimeActorGuard` supports existing signed assigned user sessions and paired devices for Brain/Planner while deriving tenant context from DB; @Public only skips the old global guard and every exception has the mandatory replacement guard. Browser service rejects absent actors and filters sessions by owner/team.
- Device session:start checks stored session owner/team before joining rooms/vendor lookup. Agent namespace now authenticates stored identity, creates owner/team sessions, checks incoming event/evidence session ownership, and emits command events to session rooms. Sidepanel and disconnect events no longer broadcast namespace-wide payloads. Voice handshake ignores supplied JSON context, derives context from stored identity, rejects foreign call sessions, emits lifecycle/transcript metadata only to the connected client, and lists only own voice sessions. Voice status route checks own DB session.
- Cloud goals use a bounded serial queue (20 including running) with pending-ID dedup, rejection on saturation, recovery after failures, and generation invalidation on logout. Polling and socket goal paths call the existing Cloud planner; `planGoalActionsWithAI` no longer prefers or falls back to local business heuristics. Cloud response actions are validated; endpoint input/output validation rejects malformed plans. Only local input names go to Cloud; explicit `${key}` values are resolved locally, with unavailable references rejected and credential descriptions suppressed. Configured target URL is supplied as planner context.
- Queue transport additionally adapts the API's actual nested `command:{id,type,payload}` envelope and posts actual `commandId`/`completed` result DTO fields. This repairs a second integrated contract mismatch beyond truncated JSON.
- WebRTC incoming audio uses the already-installed wrtc RTCAudioSink, bounded 16-bit PCM segmentation (silence/10-second maximum), WAV encoding, the configured Speaches STT adapter, then the existing VoiceGateway.handleTranscript→Brain→streamed TTS path. No hardcoded provider endpoint is introduced; missing configured server STT reports a voice error. Processing is single-flight with explicit overload diagnostics, 120-turn cap, a kill switch `KELEDON_VOICE_DISABLED=true`, no retries, STT 15-second and Brain 20-second timeouts. Peer cleanup stops sinks and releases PCM buffers. Data-channel final transcripts now enter Brain processing instead of being echoed as replies. Direct transcript path also caps 120 turns per call.
- Actual runtime disconnect stops polling/heartbeats, disconnects all sockets, cancels queued goals, signals running goal abort, closes call capture, and clears the auth token. It does not delete vendor cookies/global browser state.

### Added verification

`node browser/tests/command-poller.test.cjs`: PASS full JSON, nested production API envelope/result DTO, serial polls, malformed/unknown envelopes and stop/restart stale response boundary.

`node browser/tests/cloud-goal-queue.test.cjs`: PASS serial scheduling, pending dedup, queue cap, failure recovery, logout cancellation.

`node browser/tests/runtime-contracts.test.cjs`: PASS actual transpiled planner and runtime identity/session guard plus actual VoiceGateway connection/callStart/disconnect/WebRTC callback with fake DB/STT/RTC. Confirms no secret values in planner request, no heuristic on offline Cloud, malformed action rejection, foreign identity/session/path rejection, spoofed handshake/call context ignored, client-only events, no other session listing, synthetic WAV→configured STT→final transcript forwarding, and valid PCM/WAV segmentation. No real provider or browser was used.

Browser TypeScript `--noEmit -p browser/tsconfig.json`: PASS after cloud-only planning/queue/IPC edits. API TypeScript attempted once: BLOCKED by incomplete existing dependency/client preparation (PrismaService missing generated model properties across repository; elevenlabs module unavailable). Root must finish local existing dependency preparation/generate Prisma client and rerun; no live database/migration is needed for generation. Focused diff whitespace check: PASS.

### Remaining concrete contract boundary

Initial findings 1–6 have implementation above; final live acceptance remains unexecuted. Initial finding 7 remains partially unresolved: CallsService.close persists final report metadata, but it does not define a configured vendor CRM summary/disposition UI flow. A general click/fill executor cannot infer the correct customer record, vendor-specific disposition values, or answer-call selectors. Existing vendor configuration/approved workflows and a synthetic local or dedicated staging fixture must supply those exact surfaces/actions, then UAT must verify a complete call and writeback. No invented Genesys/Salesforce assumptions or fabricated finalization success were added. Root owns the explicit remaining acceptance/decision and overall delivery status.

### Current worker changed paths (supersedes initial list)

browser/src/autobrowse-bridge.ts; browser/src/cloud-command-polling.ts; browser/src/cloud-connection.ts; browser/src/cloud-goal-queue.ts; browser/src/command-poller.ts; browser/src/goal-planner.ts; browser/src/ipc-handlers.ts; browser/tests/command-poller.test.cjs; browser/tests/cloud-goal-queue.test.cjs; browser/tests/runtime-contracts.test.cjs; services/api/src/browser-commands/browser-commands.controller.ts; services/api/src/browser-commands/browser-commands.service.ts; services/api/src/controllers/brain.controller.ts; services/api/src/controllers/planner.controller.ts; services/api/src/gateways/agent.gateway.ts; services/api/src/gateways/device.gateway.ts; services/api/src/gateways/runtime-identity.ts; services/api/src/voice/voice.gateway.ts; services/api/src/voice/voice.types.ts; services/api/src/voice/voice-provider.controller.ts; services/api/src/voice/providers/stt/speaches-stt.adapter.ts; services/api/src/voice/webrtc/webrtc.service.ts; services/api/src/voice/webrtc/pcm-utterance-buffer.ts; this report.

Publication remains root-owned/local uncommitted; worker made no git/version/lockfile/renderer writes.


### Integration follow-up

After root completed local dependency preparation and Prisma client generation, worker fixed VoiceProviderController Prisma constructor injection and ran `node services/api/node_modules/typescript/bin/tsc --noEmit -p services/api/tsconfig.mvp.json`: PASS (2026-10-12). This supersedes the initial preparation blocker; no database/migration/provider operation occurred.

Exact remaining non-secret vendor contract needed: Company Co test team/vendor configuration and an approved Workflow/FlowDefinition specifying ring detector, answer action, customer-record match, summary field, disposition allowed value, save confirmation and hangup action. `Vendor.config` is currently untyped JSON and `startGoal` only supplies bootstrap instructions; neither establishes a call lifecycle. Root can request an existing fixture/config location or owner permission to define a synthetic fixture contract at `docs/phdk/fixtures/company-co-runtime.json`. No credentials are required in chat. A fixture may establish deterministic local acceptance but cannot prove real vendor behavior without staging UAT.


### Synthetic lifecycle and production safety follow-up

Added clearly non-production `docs/phdk/fixtures/company-co-runtime.json`: SYNTHETIC Company Co cloud-issued command sequence using existing call_start / call_transcript / call_decide / rpa_flow / call_close commands; answer, customer guard, summary/disposition/save confirmation, hangup and standby. No new command API or dead orchestration helper was introduced. `browser/tests/company-co-lifecycle.test.cjs` invokes actual production registered command handlers and call state logic with a synthetic RPA adapter. Happy sequence passes; failed finalization, no active call and wrong synthetic surface fail. This is an isolated contract journey, not browser/vendor/audio acceptance.

Production call_close now rejects a failed/partial latest RPA result and leaves the call active. Actual call RPA execution derives permitted origins from paired runtime vendor configuration; missing configuration fails explicitly, and the executor rejects actions outside configured origins. Unknown surfaces cannot silently write on the active tab. Actual RPA assert now checks an expected value when supplied, failed guard/navigation stops subsequent writes, submit with no control fails, and non-HTTP(S) navigation fails. `browser/tests/rpa-safety.test.cjs` runs actual transpiled production RPA code with fake WebContents/provider and verifies these negative boundaries. Both new suites PASS. Existing CallsService `rpa.executeFlow` command names, camel-case flowId, `fill_field`, and post_condition now adapt to existing browser RPA flow/assert steps, rather than being unknown/dropped.

Additional changed paths: browser/src/call-handler.ts; browser/src/rpa-executor.ts; browser/tests/company-co-lifecycle.test.cjs; browser/tests/rpa-safety.test.cjs; docs/phdk/fixtures/company-co-runtime.json. Browser TypeScript rerun after these changes PASS. Root owns final integrated checks/review and publication.

Remaining unsafe/non-removable boundary: no repository evidence identifies actual owner-approved inbound ring/answer/customer match/summary/disposition/save/hangup workflow for the selected tenant and real vendor UI. Supplying arbitrary selectors or treating local speaker playback as proof of in-call audio would fabricate V4 acceptance. The owner needs to identify the configured Company Co test team, call platform and CRM plus existing non-secret workflow/config location; staging account/provider permission and controlled synthetic call remain separate UAT prerequisites. The synthetic contract is never loaded as a production default. Full V4 delivery must not be claimed from these isolated PASS results.

### Owner scope correction and integrated runtime readback — 2026-10-12

The earlier request for one Company Co live vendor/CRM prerequisite is SUPERSEDED by owner clarification: each client chooses its own platforms; this task reviews code against PHDK. This workstream accepts provider-independent contracts, explicit tenant-configured origin/vendor capabilities and synthetic Company Co tests; live vendor/audio/CRM execution is out of scope and NOT EXECUTED. No identity or credential request remains open.

Integrated runtime includes stored DB device/user/team/keledon/session identity; an authenticated agent connected acknowledgement triggers session.create and only its returned DB session starts device/voice session; bounded Cloud-only plans and output contracts, queue/timeout/budget, local secret placeholders with explicit vendor scope, PCM/STT pathway and deterministic close/standby. All 18 Browser regression checks pass, including deep-link Cloud trust boundaries. Synthetic handlers exercise actual command paths. This evidence does not prove production calls or a given client adapter.
