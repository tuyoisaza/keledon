# Current brief — Windows Meet + Salesforce MVP (2026-10-19)

## Current implementation continuation — 5.7.0 acceptance candidate

The owner explicitly deferred new tests for a few hours and requested the rest of
the MVP plus controls for each layer and a copyable verbose log. Work continues
as implementation; no unexecuted case becomes PASS. Current source candidate adds
independent session/team, remote/file STT, scoped knowledge, Brain, web `/tts/speak`,
local/Meet playback and transport/interrupt controls. Logs project only bounded
timestamps, stage/events, HTTP/safe codes, elapsed times, bytes/counts and generations.

The integrated candidate connects a recognized fictitious case-number goal to an
explicit Salesforce child opened from a persisted active team CRM destination.
Only one/two operator-declared fictitious case numbers, recognized Lightning list
search/exact Case links, status and optional subject are allowed. Current actor,
team and destination are revalidated on every read and answer. Observations remain
untrusted data; responses quote the observed fields deterministically, without
model-driven actions or CRM writes. Unknown layouts/results require assistance.
Interruption cancels pending lookup and old audio; explicit goodbye releases the
session, and a new interaction resets history/turn count. Meet ingress is manual;
ACD alarm detection and universal UI adaptability are not claimed.

Speaches remains the same provider/image, with explicit 10 CPU/10 GB and
`sleepApplication:false` reapplied after a stale deployment was observed sleeping.
The reused-build container slept again; direct authenticated Railway API readback
independently confirmed the false setting. A fresh deployment from current service
configuration, 0f48dadd-9238-4390-80c7-dbf8f1405779, then reported SUCCESS with
`sleepApplication:false`. This is infrastructure readback, not a successful STT test
or proof of remaining permanently awake. [Operational evidence](docs/mvp/meet-salesforce/RAILWAY_REPAIR_20261019.md).

Implementation, publication and acceptance are separate. New conversation/CRM/
diagnostic acceptance is PENDING until the owner returns; previous sample,
preview and transport confirmations below remain valid only within their scope.
No local tests, builds, lint, typecheck or new live product/provider trials in this
continuation. [Current implementation/review](docs/mvp/meet-salesforce/IMPLEMENTATION_5.7.0.md)
and [step-by-step layer runbook](docs/mvp/meet-salesforce/LAYER_ACCEPTANCE_RUNBOOK.md).

The following STT-failure checkpoint is historical; its requirement to obtain
administrator permission is superseded by the owner's explicit repair/resource
instructions and the operational actions above. It is not evidence of success.

## Verified checkpoint — TTS and current audio acceptance

### STT/Brain bridge — live acceptance blocked at STT (2026-10-19)

PR #286 delivered the opt-in Meet receiver-audio → configured server STT → managed Brain voice reply → same-origin web `/tts/speak` bridge. Web/API autodeploy succeeded and production Brain visibly reports 5.6.0. A dedicated current-session/DB-role/team guard preserves normal-user/device assignment checks; no shared guard, CSP, provider or assignment changes. Exact child-window/origin/session and generation checks, aborts, ephemeral bounded audio/history, six-turn/two-minute limits and cleanup are implemented.

Re-entry on 2026-10-19 verified the actual extension0.3.0 controls, opener handshake and selected-team authorization. A fictitious remote phrase reached STT, but its request failed: upstream499 at14.94seconds matched the15-second client timeout during provider startup. PR #288 added safe stage/error diagnostics; PR #289 delivered a45-second STT wait only for Meet,90-second whole-turn bound within the unchanged two-minute/six-turn session, and upstream cancellation on disconnect/interruption. Both existing web/API autodeploys succeeded; production UI visibly reports5.6.2, CSP exactly unchanged. Other STT callers keep15seconds; no provider/settings/auth/spending-cap changes or automatic retries.

After immediate owner readiness, the 09:31–09:32 retest on5.6.2 received two real remote segments. A newer utterance cancelled the first upstream request (499 after9479ms); the current segment then exhausted45seconds (499 after44999ms). API recorded MEET_STT_TIMEOUT. No transcript, Brain reply or TTS output was obtained; full conversation/barge-in acceptance remains BLOCKED. Speaches started again during the window and its one-hour memory maximum reached its3GB configured limit. Resource exhaustion is a supported hypothesis, not a confirmed OOM exit. No provider/resources/settings were changed and no further paid retries are planned while that prerequisite is unresolved.

Candidate5.6.3 preserves the global5xx redaction filter and exposes only an allowlisted route-specific error header so the web can show the safe stage code. Next prerequisite: the responsible Speaches/Railway administrator must restore stable Spanish transcription with the configured model/provider after reviewing memory/restarts, then the owner supplies an immediate remote turn for retest. The legacy adapter heading0.2.1 is historical text, not the installed extension version. [Implementation](docs/meet-brain-5.6.0/IMPLEMENTATION.md) and [current UAT](docs/meet-brain-5.6.0/UAT_REPORT.md). No local tests/builds/lint/typecheck run; extension syntax was checked statically with node --check only.

Production Brain 5.5.2: the selected-team Spanish TTS sample is generated through the web `/tts/speak` route; scoped synthetic authorization/denial acceptance and fixture retirement are recorded separately. The 5.136-second sample was received completely and clearly at the remote Meet endpoint (owner confirmation). Its repaired HTML preview also completed and was confirmed audible in production; CSP remained exactly unchanged. See [preview acceptance](docs/tts-preview-5.5.2/UAT_REPORT.md) and implementation PR #283 / evidence PR #284.

These results prove bounded TTS output and preview playback, not a complete bidirectional Brain conversation. The subsequent owner-coordinated real Meet trial accepted receiver-only transport (remote fictitious phrase, incoming RTP activity), complete Spanish playback, three remote-voice cancellations without delayed restart, and complete playback after release/re-arm without manual interruption rescue. Each interruption advanced the counter and cleared active sources/queue; the owner confirmed every cutoff and recovery. Latency was not measured; no STT transcript or general echo-immunity claim. See [current audio acceptance](docs/meet-audio-20261018/UAT_REPORT.md).

The earlier bounded transport trial used local experimental adapter v0.2.1. Its source and the opt-in0.3.0 link were subsequently published in PR #286, but the extension is still owner-loaded locally and no final executor selection is claimed. Current cleanup verified camera/mic off, adapter disarmed, no owned tracks/context/queued audio. No transcript, recording, meeting identifiers or credentials belong in Git. No local application tests/builds/lint.

Pending after this checkpoint: successful acceptance of the implemented STT→Brain/script/knowledge→TTS bridge, Salesforce read-only fictitious-case lookup, full second interaction/standby and executor decision based on real evidence. Historical NOT RUN states below must not erase bounded output acceptance or imply those remaining steps passed.

Real-platform, objective-driven Windows interaction MVP: remote Meet voice, interruption, fictitious Salesforce case lookup, grounded spoken reply and standby. Acoustic alerts trigger observation; UI/context confirms an interaction. Meet is not ACD offer detection.
Executor selection OPEN: Electron vs standard browser + Windows component. Preserve Cloud business authority and tenant/security controls. [Intent](docs/intents/windows-meet-salesforce-mvp-intent.md) · [five PIAs](docs/mvp/meet-salesforce/README.md).

---

## Historical baseline (retained; current scope above takes precedence)

# KELEDON project brief
## Current owner decisions — 2026-10-14
New accounts are unprivileged `user`; an existing superadmin alone grants elevated roles/company assignments; admin/coordinator remain within their company and cannot elevate roles or delete companies. The API derives actor and tenant from current DB state. Secrets are write-only in normal API responses and client-supplied replacement credentials are never echoed. Call/CRM vendors vary by tenant. Private/local CRM origins are accepted only when URL-validated and configured in that tenant's allowlist.

Multi-tenant inbound voice/CRM runtime with Cloud policy, deterministic Electron execution and React operator/admin interfaces.
Users: guest, operator/user/agent, coordinator, admin, superadmin.
Confirmed scope, in order: baseline/versions/PR reconciliation; shared safe diagnostics; voice/cloud/browser/CRM contracts; administration/permissions.
Workflows: launch/pair -> vendor readiness -> voice/decision/action -> summary -> standby; permitted resource administration; safe diagnosis/reset.
Current stage: brownfield Auto. Dependencies: existing NestJS/Prisma/PostgreSQL/vector/provider/vendor/IPC contracts; synthetic isolated tests only.
Constraints: PROJECT_INTENT.md and unchanged V4 canon. No new infra, live migrations or restored bots.
Definition of success: all confirmed commitments verified and integrated on target; external acceptance gaps are explicit, never fake PASS. No open intent question.
