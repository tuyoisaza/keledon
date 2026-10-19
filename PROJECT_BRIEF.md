# Current brief — Windows Meet + Salesforce MVP (2026-10-18)
## Verified checkpoint — TTS and current audio acceptance

### STT/Brain bridge — 5.6.2 deployed, conversation acceptance pending (2026-10-19)

PR #286 delivered the opt-in Meet receiver-audio → configured server STT → managed Brain voice reply → same-origin web `/tts/speak` bridge. Web/API autodeploy succeeded and production Brain visibly reports 5.6.0. A dedicated current-session/DB-role/team guard preserves normal-user/device assignment checks; no shared guard, CSP, provider or assignment changes. Exact child-window/origin/session and generation checks, aborts, ephemeral bounded audio/history, six-turn/two-minute limits and cleanup are implemented.

Re-entry on 2026-10-19 verified the actual extension0.3.0 controls, opener handshake and selected-team authorization. A fictitious remote phrase reached STT, but its request failed: upstream499 at14.94seconds matched the15-second client timeout during provider startup. PR #288 added safe stage/error diagnostics; PR #289 delivered a45-second STT wait only for Meet,90-second whole-turn bound within the unchanged two-minute/six-turn session, and upstream cancellation on disconnect/interruption. Both existing web/API autodeploys succeeded; production UI visibly reports5.6.2, CSP exactly unchanged. Other STT callers keep15seconds; no provider/settings/auth/spending-cap changes or automatic retries.

This does not yet prove a successful STT/Brain conversation. The subsequent5.6.2 session received no new remote packets/turn, so no provider request was made; it was explicitly stopped and resources released while awaiting immediate remote-microphone readiness. Full spoken Brain reply/interruption/follow-up remains pending that coordinated turn. The legacy adapter heading0.2.1 is hardcoded historical text, not the installed extension version. [Implementation](docs/meet-brain-5.6.0/IMPLEMENTATION.md) and [current UAT](docs/meet-brain-5.6.0/UAT_REPORT.md). No local tests/builds/lint/typecheck run; extension syntax was checked statically with node --check only.

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
