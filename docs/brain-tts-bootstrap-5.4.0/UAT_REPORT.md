# Production TTS + Meet acceptance — 5.4.2

Owner authorization: implement/operate audited synthetic bootstrap, never modify real accounts, execute production web TTS and Meet with actual remote acknowledgment; no local tests/builds/lint. PHDK 2.56.0; ordinary scoped implementation/UAT, no Auto/Developer/PMO.

## Delivery

Bootstrap PR #277 merged to main 3a491e78abc014117c27104218b793a1691ba3bb at 5.4.1. API and Web GitHub-connected autodeploy success observed; real Brain displayed 5.4.1. UAT exposed cross-origin CORS refusal before any provider request. First run brain-tts-43d868c6-7beb-4e00-8a18-3bf8936f1f9d was actually provisioned, idempotent second bootstrap PASS, admin null assignments visible; then retired through audited app API. Remote post-retirement HTTP verification blocked by same CORS failure, not claimed PASS. No real account/provider/settings mutation.

Repair PR https://github.com/tuyoisaza/keledon/pull/278 merged to main 7ad1ca877138ca4eb0a4ee69114e5ee6ce22f78c, 5.4.2, source readback matches reviewed tree. Brain HTTP TTS now uses protected existing same-origin /tts/speak. No CORS allowlist relaxation or proxy-settings change. Final candidate deployment and second-run cases pending.

## Actual browser readiness

Existing Chrome AVAILABLE_VERIFIED; operator administrative session retained, not a TTS persona. Three new TTS-only accounts per run have real DB identities/current roles and server-signed audited short-lived capabilities. No raw credentials in artifacts. Created/retired only through protected application routes, no direct DB/provider access. Meet open iaz-fkaw-twx, 2 participants. Owner explicitly replied remote is connected. Prepared the pre-existing experimental generated audio port: running AudioContext, generated output sender bound, camera off, physical input excluded by the existing adapter; no spoken sample sent yet. Remote confirmation NOT_RUN. No installation or external paid browser service; existing selected team TTS sample explicitly authorized, normal budgets remain effective.

## Checks

Source/security and whitespace review completed. Five root versions and lock roots aligned; all dependency entries identical to prior main. Local application tests/builds/lint/typechecks NOT RUN by owner policy. No simulated PASS. This evidence is scoped only to requested Brain TTS/bootstrap/Meet; no product-wide UAT claim.

## Acceptance

Final case results, audio properties, exact run IDs/timestamps, retirement and remote acknowledgment will be appended only after actual observation. Current status IN PROGRESS; no completion claim.

## Observed second run and UAT criterion repair

Brain 5.4.2 created second run brain-tts-129bd4c1-0d09-4774-96e2-c7828c509e38 at 2026-10-19T03:56:21Z, expiry 04:11:21Z. Same-run reuse PASS. Web /tts/speak yielded absent auth 401, missing team 400, invalid team 400, nonexistent UUID 404, ordinary A to B 403, synthetic admin unapproved team 403, generic admin route 401, genuine expired signed probe 401. Each recorded expected/actual status matched. One actual configured-team TTS call yielded HTTP 201, 20589 bytes, team 0a97649a-741d-4185-b457-5fce8a8e3f45. The harness expected 200 and marked FAIL/discarded the blob; no remote sample playback occurred. This is a real UAT criterion defect, not a provider/auth failure. Standard Nest POST success is 201 and existing code uses res.ok. Retired second run through audited route; original token returned 401, PASS. No real account mutations.

5.4.3 only corrects the panel's expected positive status to the existing 201 and adds safe contentType/SHA-256 evidence for the exact downloaded audio. All auth/provider/backend behavior unchanged. Final third bounded run will repeat the complete cases and generate a retained Spanish sample for Meet. No local application command was run.
