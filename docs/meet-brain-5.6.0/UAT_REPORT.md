# UAT report — Meet STT/Brain/TTS 5.6.0

PARTIALLY DELIVERED / functional conversation BLOCKED on actual extension reload. Source merged PR #286 and web/API deployment verified. See UAT_ACCESS_REPORT.md for actual browser readiness, 401 denial evidence, exact CSP equality and the single owner host step. No new conversation, transcript, generated reply, barge-in or second-turn PASS is claimed. Old sample/transport tests do not prove the new bridge.

## Results

- DEPLOY: PASS (actual 5.6.0 UI and existing autodeploy success).
- AUTH anonymous/invalid bearer: PASS (three real production requests, each 401, no provider calls).
- AUTH expired/normal-user cross-team: BLOCKED pending approved current synthetic capability fixtures; no habitual identity substitution.
- CSP: PASS exact production header unchanged, nginx source unchanged.
- LINK: BLOCKED (new child Meet visibly still loads adapter 0.2.1; 0.3.0 source awaits owner extension reload).
- TURN/BARGE/follow-up: BLOCKED by LINK; not run, no provider requests or new audio capture.
- Prepared-window safety: camera/mic off, adapter disarmed; user meeting retained. Existing Brain authentication remains in its original tab; no token copied to Meet.

## Next executable action

Owner: Chrome Extensions → existing KELEDON Meet audio experiment → Reload, canonical directory experiments/meet-audio, verify manifest version 0.3.0, then reply “extensión recargada”. Assistant resumes from the prepared windows: actual handshake, team-scope check, coordinated fictitious remote turn, audible Brain reply, real interruption with no stale replay and cleanup. No tests/build/lint locally; no settings/provider/assignment changes. Do not declare completion until these acceptance cases run.

## 2026-10-19 real conversation attempt (09:13–09:18 America/Mexico_City)

Owner confirmed remote readiness in the same private meeting. Extension 0.3.0 bridge controls are now present. Legacy adapter heading still says 0.2.1 because it is a fixed historical label; it is not evidence of the installed manifest version. New Meet child opened from authenticated Brain; exact-window/origin/session handshake succeeded, Brain enabled start, and selected-team scope authorization succeeded. Camera and physical agent mic off before capture; generated sender binding enabled only generated output.

First requested phrase: no incoming packets, no turn sent; owner reported no reply. After owner enabled the second-device microphone and repeated the fictitious phrase, received transport reached 26084 bytes / 353 packets; bridge emitted two segments (later utterance cancelled an earlier pending request: cancelled1/discarded1). STT/Brain request returned HTTP502; no transcript/reply or TTS bytes were returned, no conversation/barge-in PASS. Error path released all owned audio resources.

Bounded read-only diagnostics: API logs show configured team STT=speaches/TTS=speaches/LLM=openai and multilingual STT initialization. Speaches was starting in the same time window and subsequently reported online; this is temporal evidence, not established root cause. No provider settings, secrets or hosting writes. One reattempt session was armed after provider online, but no additional voice segment arrived before its two-minute timeout; no second STT call was made. UI verified automatic release, context absent/tracks0/queue0/mic off/camera off.

Candidate5.6.1 adds safe stage-specific failure codes and distinguishes initial ready signal from detected/cancelled speech. It preserves existing timeouts/providers/budgets/authorization/CSP; no extension reload is required for this API/web diagnostic patch. Full real conversation remains FAIL/PENDING repair, not accepted. Source checks: whitespace/manual review/five-root versions and unchanged dependency entries; no local tests/build/lint/typecheck. A previous node --check of the extension file was static syntax-only, not execution or application acceptance.

## Scoped cold-start repair — 5.6.2

Bounded read-only Speaches HTTP metadata for the actual failed turn: /v1/audio/transcriptions returned499 at2026-10-19T15:15:10.929Z after14940ms. Combined with the existing15-second adapter timeout and contemporaneous container startup, this establishes client cancellation at that timeout; it does not establish how long a completed transcription would take. No raw request/audio/credentials captured.

Repair: new Meet entrypoint opts into45-second STT wait; all other callers keep15seconds. Browser entire-turn deadline90seconds, still bounded by the unchanged120-second/six-turn session. No automatic retries or provider switch. Response close/remote interruption aborts upstream STT via combined AbortSignal; discarded generations still cannot speak. Existing LLM/TTS spending/managed-prompt/secret controls untouched. Source/security review and version/lock/whitespace checks only, no local application tests/build/lint/typecheck. Actual conversation acceptance remains pending production retest.
