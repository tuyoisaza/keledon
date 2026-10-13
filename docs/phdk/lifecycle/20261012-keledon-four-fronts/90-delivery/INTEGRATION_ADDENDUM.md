# Integration addendum — 2026-10-13

The owner approved the additive managed-AI schema migration for inclusion and merge through the normal database migration procedure. This workspace did not run it against any database.

To meet the PHDK 600-line module limit on the active integration paths, the native Browser renderer now loads two stylesheets and two ordered classic scripts; FlowsPage is split into its page, form modal, recording modal, and shared types; voice brain/TTS processing and voice-session access live in focused modules; and agent execution evidence processing and socket types live outside AgentGateway. The unused historical SettingsTab-ORIG source was removed; git history preserves it.

Verification after these changes:

- API `npm run build`: passed, including the C13 regression sentinel.
- API `npm run test:regression`: 8/8 suites passed.
- Browser source regression tests: 19/19 passed, including renderer asset/order and size checks.
- Web typecheck and lint: passed; production Vite build completed.
- Browser renderer scripts: `node --check` passed; Browser TypeScript project compilation passed.
- PHDK coherence checker: v2.50.8, all 50 manifest mappings passed.

The full repository inventory still has 32 source files above the PHDK 600-line limit. BrainPage.tsx is 3,726 lines and remains changed by this PR, so the strict file-size gate is not complete. PR #42 remains draft and unmerged pending that remediation. No production release is claimed.
