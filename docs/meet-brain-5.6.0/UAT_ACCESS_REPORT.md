# Production conversation UAT cases — 5.6.0

Implementation PR #286 main 4876f6e5412b7f92db924c2b6ed5096f9b07ee63. Scoped current owner instruction; no local application tests/build/lint/typecheck. Existing Chrome 3 production Brain tab is authenticated; harmless real AX read returned 5.5.2 pending deploy. Browser ACTIVE_UAT_EXCEPTION / AVAILABLE_VERIFIED. Reload extension 0.3.0 is pending owner UI response. No new host-permission pattern; owner-approved existing Meet, fictitious phrases only. Private meeting URL omitted. Existing configured provider calls are expressly requested for the live conversation; no new service/settings/credentials purchased or changed.

| Case | Required actual evidence | State |
|---|---|---|
| DEPLOY | Actual web/API autodeploy and visible 5.6.0 | PENDING |
| LINK | New Meet window from authenticated Brain, exact opener handshake, explicit selected-team start | PENDING |
| AUTH | Anonymous/invalid bearer denial; selected nonexistent team denial without provider call | PENDING |
| TURN | Remote fictitious phrase transcribed by configured STT, contextual Brain reply, configured TTS heard remotely | PENDING |
| BARGE | Remote voice cancels generated reply and pending result; no stale restart for five seconds, second utterance answered | PENDING |
| CLEANUP | Explicit stop leaves adapter tracks/source/queue/context zero, capture stopped, mic/camera off | PENDING |

Negative normal-user cross-team and expired-session journeys require independently available current approved synthetic credentials for this capability. Do not repurpose TTS-only capabilities or habitual owner session as a missing normal-user fixture; source review preserves RuntimeActorGuard/assigned-team intersection and existing TTS denial evidence is historical only. No new normal-user acceptance is inferred. Full MVP/CRM remains outside this slice.

## Verified deployment/readiness checkpoint

Existing API/web autodeploy statuses both success for 4876f6e5412b7f92db924c2b6ed5096f9b07ee63. Production Brain reload visibly reports 5.6.0 with new panel and current TuyoMX context. Exact production CSP equals the previous baseline (CSP_PRODUCTION.txt). No shared guard/nginx changes.

Anonymous scope GET, invalid-bearer scope GET and anonymous turn POST each returned 401 through production web; AUTH_ANONYMOUS.json. No provider call involved. Actual expired-session and normal-user cross-team acceptance remain unexecuted without suitable current synthetic capabilities; owner habitual session is not substituted for missing security fixtures. Live operator-requested fictitious conversation is a separate explicitly authorized product journey.

Opened new dedicated child Meet from Brain via its panel. Real Meet prejoin UI loaded, camera and physical microphone explicitly turned off. It still renders audio experiment v0.2.1 and has no Conectar con Brain control. Therefore actual extension runtime is not yet 0.3.0 even though the reviewed source/manifest is. Exact missing host prerequisite: owner opens Chrome Extensions and reloads the existing unpacked KELEDON Meet audio experiment from the canonical experiments/meet-audio directory; same host patterns, no new permission. The browser tool rejects chrome:// navigation; no alternate transport or workaround attempted. Owner question is pending. Keep both prepared windows for resume; no STT/LLM/TTS provider call or audio capture performed by the new link.

Resume: after owner confirms extension 0.3.0, reload only the prepared child Meet (preserving opener), verify Conectar con Brain, join with camera/physical mic off, handshake, authorize team in Brain, start generated audio in Meet, then coordinate fictitious phrase and actual barge-in. If opener is unavailable, diagnose from actual UI and repair in scope; never invent a connected link or remote confirmation. Full circuit still PENDING, not PASS.

## Re-entry 2026-10-19

Browser ACTIVE_UAT_EXCEPTION / AVAILABLE_VERIFIED: current real Meet roster two participants, extension new link controls0.3.0 actually visible, production Brain5.6.0. Exact opener handshake and current selected-team scope passed. No stale heading/version inference. Live fictitious audio reached configured STT; server returned502 before any reply. Owner readiness/audio confirmation recorded in UAT_REPORT.md; failed journey is not PASS. First microphone issue corrected at remote device, later reattempt expired with no new segment. All audio released, camera/mic off. Bounded provider logs/status only, no provider/hosting writes or new permissions. Current required next step: publish safe diagnostics patch5.6.1 through normal PR/autodeploy, reload Brain and reopen/handshake child, then one coordinated fictitious turn. No credentials, private meeting address or raw audio persisted.
