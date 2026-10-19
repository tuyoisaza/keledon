# Current brief — Windows Meet + Salesforce MVP (2026-10-18)
## Verified checkpoint — TTS and current audio acceptance

### STT/Brain bridge implementation — 5.6.0, acceptance pending

PR #286 delivered the opt-in Meet receiver-audio → configured server STT → managed Brain voice reply → same-origin web `/tts/speak` bridge. Web/API autodeploy succeeded and production Brain visibly reports 5.6.0. A dedicated current-session/DB-role/team guard preserves normal-user/device assignment checks; no shared guard, CSP, provider or assignment changes. Exact child-window/origin/session and generation checks, aborts, ephemeral bounded audio/history, six-turn/two-minute limits and cleanup are implemented.

This does not yet prove a real STT/Brain conversation. The dedicated Meet window still loaded adapter 0.2.1 during readiness; owner reload to 0.3.0 is required for its explicit link controls. Live conversation/interruption acceptance is pending that real host step; prior sample/transport acceptance below remains independently valid. [Implementation](docs/meet-brain-5.6.0/IMPLEMENTATION.md) and [UAT access](docs/meet-brain-5.6.0/UAT_ACCESS_REPORT.md). No local tests/builds/lint/typecheck run.

Production Brain 5.5.2: the selected-team Spanish TTS sample is generated through the web `/tts/speak` route; scoped synthetic authorization/denial acceptance and fixture retirement are recorded separately. The 5.136-second sample was received completely and clearly at the remote Meet endpoint (owner confirmation). Its repaired HTML preview also completed and was confirmed audible in production; CSP remained exactly unchanged. See [preview acceptance](docs/tts-preview-5.5.2/UAT_REPORT.md) and implementation PR #283 / evidence PR #284.

These results prove bounded TTS output and preview playback, not a complete bidirectional Brain conversation. The subsequent owner-coordinated real Meet trial accepted receiver-only transport (remote fictitious phrase, incoming RTP activity), complete Spanish playback, three remote-voice cancellations without delayed restart, and complete playback after release/re-arm without manual interruption rescue. Each interruption advanced the counter and cleared active sources/queue; the owner confirmed every cutoff and recovery. Latency was not measured; no STT transcript or general echo-immunity claim. See [current audio acceptance](docs/meet-audio-20261018/UAT_REPORT.md).

The existing experimental Meet adapter v0.2.1 is locally loaded and remains unpublished; this documentation delivery does not publish or select it as the final executor. Any STT/Brain bridge remains distinct from deployed web code. Cleanup verified mic/camera off, adapter disarmed, no owned tracks/context/queued audio. No transcript, recording, meeting identifiers or credentials belong in Git. No local application tests/builds/lint.

Pending after this checkpoint: configured STT→Brain/script/knowledge→TTS integration, Salesforce read-only fictitious-case lookup, full second interaction/standby and executor decision based on real evidence. Historical NOT RUN states below must not erase this bounded output acceptance or imply those remaining steps passed.

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
