# Scoped confirmed commitments

| Commitment | Evidence | State |
| --- | --- | --- |
| Audited bootstrap of new synthetic accounts, no real account changes | Protected app routes, transactional manifest, real provision/reuse/retire, three bounded runs | DELIVERED |
| Restricted real DB-backed TTS synthetic superadmin with null assignments | Visible null assignments, approved-team audio, generic/admin/foreign team denial | DELIVERED |
| Current auth/expiry/team/cross-tenant negative acceptance | production-http-evidence.json, 11 observed HTTP/metadata cases | PASS |
| Source publication and deployment | PR #277, #278, #279 merged; main 56ba614a; API/Web statuses SUCCESS | DELIVERED |
| Actual Spanish provider sample through web /tts/speak | HTTP 201, audio/mpeg, 20589 bytes, matching team and SHA-256 | PASS |
| Actual Meet decode/transmission of exact sample | 5.136s mono/48kHz, 0 interruptions, RTP evidence, user-provided file hash matches | PASS |
| Remote participant hearing acknowledgment | Explicit post-playback response: “Sí, la escuché completa y clara” | PASS |
| Cleanup | All runs retired, token reuse 401, Meet generated tracks released and mic off | PASS |

No Auto/PMO activated and no unrelated backlog resumed. No local tests/builds/lint/typechecks. Optional native HTML audio preview shows CSP-related open error; no claim of its local playback. Final scoped outcome DELIVERED/ACCEPTED; no pending scope commitments. Native HTML preview limitation is documented separately from accepted Meet playback.
