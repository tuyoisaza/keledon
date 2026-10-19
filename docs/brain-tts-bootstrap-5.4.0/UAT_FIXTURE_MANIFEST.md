# Actual production synthetic runs — 5.4.1–5.4.3

All operations used protected audited app endpoints. No real accounts were mutated. Each run created exactly three new passwordless .invalid accounts and two fictional Company Co company/brand/team trees. Accounts and fictional tenant records retained for audit, not deleted. All three runs were retired; signed token reuse after retirement verified 401 in runs two and three. Tokens never persisted or printed.

| Run | Candidate | Observed result |
| --- | --- | --- |
| brain-tts-43d868c6-7beb-4e00-8a18-3bf8936f1f9d | 5.4.1 | Created, same-run identity reuse PASS, admin unassigned true; retired; remaining calls blocked by CORS |
| brain-tts-129bd4c1-0d09-4774-96e2-c7828c509e38 | 5.4.2 | All denials PASS; audio HTTP 201 misclassified by UAT panel; retired and token reuse 401 |
| brain-tts-c2b0f86c-3f59-458e-8654-e3d0967c89b1 | 5.4.3 | Created 2026-10-19T04:01:18.835Z, TTL to 04:16:18.835Z; full HTTP/metadata matrix PASS; retired and token reuse 401 |

Selected existing provider team was TuyoMX, ID 0a97649a-741d-4185-b457-5fce8a8e3f45, Speaches/ef_dora as visible in Brain. No existing team/provider configuration change. Exactly two actual short TTS calls occurred (run two discarded by incorrect expectation, run three retained). No automatic retry or new paid service. Exact audio exported with owner assistance, played in Meet and explicitly confirmed remotely: “Sí, la escuché completa y clara”. Acceptance PASS.
