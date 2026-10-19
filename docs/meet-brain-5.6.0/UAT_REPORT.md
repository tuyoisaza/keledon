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
