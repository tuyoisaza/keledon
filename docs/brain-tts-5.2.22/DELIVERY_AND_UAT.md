# Brain TTS 5.2.22 — scoped delivery and acceptance

Owner request: 2026-10-18, fix Brain `/tts/speak` for an authenticated active superadmin without company/team assignments. No shared guard exception, assignment/role/provider changes, local tests/builds/lint, or unrelated work.

## Implementation

TtsActorGuard validates the existing signed session with LocalAuthService (expiry, DB user/role and lifecycle), rejects role previews, permits only DB superadmins to select an arbitrary team, otherwise delegates authentication to unchanged RuntimeActorGuard. An omitted team still resolves the assigned team for ordinary users/devices; an explicit foreign team is denied. Selected team, brand and company are loaded from DB and only the server-resolved team reaches TTSService. ResourceScopeGuard remains in place and unchanged. Team provider configuration, secrets, request limits, kill switches and retries remain unchanged. Missing auth is 401; invalid/missing superadmin teamId 400; nonexistent team 404; foreign team 403; exhausted budget 429; missing/unavailable team configuration 503; unexpected provider errors sanitized.

Assistant source/security review: reviewed the complete TTS diff against committed main, including existing LocalAuthService, RuntimeActorGuard, ResourceScopeGuard and TTSService. No dependency on concurrent uncommitted auth changes. Owner approval covers the specific superadmin behavior requested; no independent human inspection claimed. Static whitespace check passed. Five package/lock roots and Browser display aligned at 5.2.22. Local tests, builds, lint and application acceptance were NOT RUN per owner policy.

## Publication

Target main via scoped branch/PR. Initial remote main 9e3f11bfef384952b0ce33bff8607fa4a3de463e. Main reports unprotected and no repository rulesets; no non-sample local hooks/core.hooksPath observed. Publish only the TTS files, required versions/changelog and this evidence directory. Preserve all other dirty files. A merge is source publication, not proof of deployment or acceptance.

## Production-only acceptance plan

Use the existing audited synthetic Company Co fixture/session path, never owner/customer identity. No role/assignment/provider settings changes. Candidate deployment must match merged revision before execution. Call only through the web `/tts/speak`; no direct TTS provider call or local acceptance.

| Case | Expected | Execution |
| --- | --- | --- |
| TTS-01 no bearer | 401, no provider invocation | PENDING |
| TTS-02 expired synthetic session | 401, no provider invocation | PENDING |
| TTS-03 active synthetic superadmin, no assignments, nonexistent team | 404, no provider invocation | PENDING |
| TTS-04 synthetic ordinary user selecting another team | 403, no provider invocation | PENDING |
| TTS-05 active synthetic superadmin, no assignments, approved selected team | audio from configured team provider; matching team header | PENDING |
| TTS-06 ordinary user/paired device, own team | preserved authorized behavior | PENDING |
| TTS-07 missing/invalid team and role preview | 400 / 403, no provider invocation | PENDING |
| TTS-08 Spanish production sample and Meet | Spanish audio generated through web, played into Meet, remote interlocutor explicitly confirms hearing it | PENDING |

Sample: “Hola, esta es una prueba de voz de Brain en español. ¿Puedes confirmar que me escuchas con claridad?” One short authorized sample, existing configured provider and spending caps, no automatic retries. Record exact revision, target, timestamp, redacted status/content type/bytes and remote confirmation. Hearing audio locally or receiving a blob does not prove Meet delivery.

Required access: approved active synthetic unassigned superadmin and ordinary user sessions, approved team IDs and an existing authenticated audited fixture path; an authorized Meet session with an available remote interlocutor. Never request passwords/tokens in chat, manufacture credentials, provision through unapproved paths, or infer PASS. Any unavailable prerequisite remains BLOCKED with its exact cause.
