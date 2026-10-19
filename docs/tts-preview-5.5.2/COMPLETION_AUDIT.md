# Scope completion audit

- Fix HTML preview opening: implemented in TtsAudioPreview.tsx, integrated in BrainTtsUatPanel.tsx; complete Spanish playback actually observed and heard in production.
- Preserve CSP: nginx file unchanged; exact production header comparison passed.
- Preserve TTS route/provider/security/spend: existing request unchanged; existing sample imported in memory with no new provider call.
- No local tests/builds/lint: respected; static review and production UAT only.
- Publication separate from acceptance: implementation PR #283 merged before production UAT; evidence published afterward. Unrelated dirty records, audio and experiments preserved.
- No unfinished in-scope commitments. No general PHDK/old-task resumption or delegation.
