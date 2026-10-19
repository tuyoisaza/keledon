# TTS preview correction — 5.5.2

Owner request 2026-10-18: fix HTML TTS preview opening and verify actual Spanish-sample playback in production; do not weaken CSP or run local tests/builds/lint. Current primary checkout only; preserve unrelated records, audio and experiments.

## Cause and change

Native <audio src=blob:> inherits media-src from the current default-src self CSP and reports opening failure. Preserve the entire CSP and nginx file byte for byte. Use Web Audio to decode the exact Blob/ArrayBuffer in memory and connect an owned AudioBufferSourceNode to the browser output, matching the existing Brain Web Audio approach without a media fetch, speechSynthesis, provider switch or policy change. The normal web /tts/speak call and download stay unchanged.

Accessible preview controls: play, pause/resume, stop, replay, progress, clear decode/state errors. AudioContext resume starts from explicit user gesture; no automatic playback. Source/RAF cleanup and generation fences suppress stale async decode/play after replacement/stop/unmount. Close owned contexts on replacement/unmount. Maximum 8 MiB and 60 seconds. Render safe state/duration/position/completion/hash evidence, no credentials.

A local-file input reads an already generated sample in browser memory only, not an upload or server/provider call. Use the previously production-generated Spanish MP3 at docs/audios/brain-tts-es-5.4.3.mp3, 20589 bytes, SHA-256 22e14125a346917f4ddf416a49f20d3a7dfbcf703a1bac2e166b4c8dc3aeda53, previously decoded/accepted in Meet at 5.136 seconds. This tests the same preview component as newly returned TTS Blobs, without new accounts, secrets or spend. No real account, role, assignment, provider or hosting-setting changes.

## Validation and delivery

Static source/diff/security/whitespace and version/dependency-lock checks only. No local application tests, builds, lint or typecheck. Production UAT must verify the deployed candidate, same hash/duration, full play/completion, pause/resume, stop/replay, replacement/cleanup and no native media opening error. CSP readback must exactly match baseline. Browser/actual output evidence cannot be inferred from source. Normal branch/PR/merge/readback; existing GitHub autodeploy only, no direct deployment or hosted CI dispatch. No delegation, Auto, Developer Mode or background work.
