# Implementation / source review — Meet Brain 5.6.0

Owner mandate: connect remote Meet audio to configured STT → Brain → TTS, verify real interruption, retain team authorization; no local tests/build/lint. Primary workspace only, no delegation/Auto/hosting administration.

## Implementation

BrainMeetPanel opens a user-entered private Meet URL from the authenticated Brain tab. The child MAIN-world adapter and parent exchange only bounded audio and lifecycle events through exact origin AND exact window-reference checks, per-link random session and monotonic generation. Neither token, key, tenant authority nor arbitrary API command is supplied to Meet. User explicitly links in Meet, starts authorized session in Brain, then starts capture in Meet. An arbitrary existing Meet tab cannot attach. User URL is memory-only and cleared after open.

Meet v0.3.0 captures only the adapter's owned clone of RTCRtpReceiver mix. In-memory VAD/preroll segments mono PCM WAV, ≤12 seconds/384044 bytes; sends to parent after silence. No physical microphone, recorder persistence or TTS monitor mix. Remote onset cancels adapter audio AND parent fetch; original generation on every result prevents late STT/Brain/TTS playback. Two-minute/six-turn limits on both windows; explicit stop, pagehide, team-change and unmount cleanup. No automatic reconnect or provider fallback.

Dedicated /api/brain/meet/:teamId scope/turn route uses BrainMeetGuard. Validate current session through LocalAuthService, DB role/account lifecycle; only current DB superadmin can select a team without assignments. Other sessions/devices still go through unchanged RuntimeActorGuard with exact assigned-team intersection. Deny role previews and TTS-only synthetic capabilities. Resolve team/brand/company names and IDs in DB, overwrite runtime context server-side. Existing chat/STT/shared guards remain unchanged.

Server validates exact 16kHz mono PCM WAV header/length and bounded history. Configured server STT only; Spanish Speaches multilingual model normalization matches existing transcription path. Reuse Brain's managed voice-reply prompt/knowledge/LLM and budget controls. Minimal audit event contains actor/team/audio-byte-count/language, never audio/transcript/history. Check disconnect between provider stages. TTS stays a separate same-origin web /tts/speak request with response-team check and existing cost/secret controls. Upstream operation already in progress may finish after browser abort; no retry or claim of reversing provider spend.

## Source review / allowed validation

Manual full outgoing source/security review and git whitespace/version/lock metadata checks. Five roots plus Browser renderer 5.6.0, dependency entries unchanged. CSP/nginx/shared RuntimeActorGuard unchanged. No local application tests, builds, lint or typecheck. Existing local adapter text source now included explicitly; exclude generated WAVs, preparation scripts, unrelated dirty evidence and audio downloads. Not a final executor selection.

## Publication versus acceptance

Implementation is a candidate until normal PR/merge/remote readback and existing web/API autodeploy. Extension reload is an explicit owner UI step (no manifest host-permission expansion). Functional acceptance must exercise actual browser/window access, current team scope, STT transcript and spoken Brain result, remote interruption and no stale restart, follow-up and cleanup. Old transport/preview PASS cannot substitute for this conversation trial. No provider settings writes/direct deployment, new infrastructure, CI dispatch, raw recordings or meeting identifiers in Git. Provider-backed conversation is explicitly requested by owner; bounded existing configured providers only.
