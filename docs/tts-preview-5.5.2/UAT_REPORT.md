# Production UAT — TTS HTML preview 5.5.2

ACCEPTED, 2026-10-18 (America/Mexico_City). Implementation merged separately in PR #283, main 0d89a4bcfc8d42bbb11396878c4674e00619bd62. Existing web/API autodeploy statuses success; browser visibly reports 5.5.2 at https://keledon.tuyoisaza.com/brain. Browser permission ACTIVE_UAT_EXCEPTION, actual Chrome access AVAILABLE_VERIFIED (see UAT_ACCESS_REPORT.md).

| Case | Result | Actual evidence |
|---|---|---|
| Published preview opens | PASS | Accessible preview controls rendered; no native media opening failure |
| Exact Spanish production sample | PASS | 20589-byte previously generated MP3; SHA-256 22e14125a346917f4ddf416a49f20d3a7dfbcf703a1bac2e166b4c8dc3aeda53; decoded duration 5.136 s |
| Complete playback | PASS | Web Audio playing at 0.2106667 s, then ended at 5.136 s; completedPlaybacks 1 |
| Audible acceptance | PASS | Owner response to this production playback: “Sí, completa y clara” |
| Pause/resume/replay | PASS | Repeated, paused at 0.9600000 s, resumed at 1.2000000 s, ended at 5.136 s; completedPlaybacks 2 |
| Stop | PASS | Stopped repeat resets position 0, ready, completion count remains 2; no false completion |
| Replace during playback | PASS | Reselect same sample while playing resets state/duration/hash/count to ready/0; next play decodes same hash/duration and runs normally |
| CSP unchanged | PASS | Production header before/after exactly equal; nginx source unchanged (CSP_BASELINE.txt, CSP_AFTER.txt) |
| Scope and cost | PASS | No provider call, upload, account/role/assignment/configuration write; only bytes of approved sample in browser memory |

No local tests, builds, lint or application typecheck run. Static source/security review, whitespace and five package/lock version/dependency-entry coherence checks passed. No dependency changes. /tts/speak web route, TTS provider, authorization, cost/secret controls unchanged. No Meet re-test claimed here; the prior remote confirmation belongs to the earlier TTS acceptance. Current acceptance covers the repaired production HTML preview and actual local output confirmed by owner.

Remaining required cases: none. Ended playback suspends the owned context and clears source/animation. Errors are explicit; no speechSynthesis/provider fallback or CSP exception.
