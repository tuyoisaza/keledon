# Production TTS and Meet cases — 5.4.1

| ID | Operation | Required evidence |
| --- | --- | --- |
| BT-01 | Audited bootstrap and identical run reuse | Same three DB identities, synthetic admin null company/team, 201 |
| BT-02 | No bearer /tts/speak | 401 |
| BT-03 | Genuine signed probe after five-second expiry | 401 |
| BT-04 | Superadmin missing/invalid team | 400 / 400 |
| BT-05 | Superadmin nonexistent UUID | 404 |
| BT-06 | Ordinary user A selecting B's team | 403 |
| BT-07 | Synthetic admin selecting unapproved existing fixture team | 403 |
| BT-08 | Synthetic admin generic /api/crud/users | 401 |
| BT-09 | Unassigned synthetic admin Spanish sample, selected TuyoMX provider | 200, audio MIME, >200 bytes, exact server team header |
| BT-10 | Audited retirement and original token reuse | 201 retire, 401 reuse |
| BT-11 | Send downloaded exact Spanish audio through existing Meet generated stream | Decoded matching audio and outgoing RTP evidence |
| BT-12 | Remote participant acknowledgment | Explicit acknowledgment of hearing complete Spanish phrase, no local playback inference |

These are acceptance cases, not local application tests. All start PENDING until observed. No local tests/builds/lint/typechecks.
