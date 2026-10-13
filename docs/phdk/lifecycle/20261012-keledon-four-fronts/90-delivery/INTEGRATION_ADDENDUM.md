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

At the initial integration checkpoint, the inventory had 32 files over 600 lines and the active BrainPage was 3,726 lines. That snapshot is historical and is superseded by the following remediation follow-up; the current inventory is recorded there.

## BrainPage modularization follow-up — 2026-10-13

The web BrainPage source was split into speech capture/flow, voice socket/output/audio, chat actions, provider tests, cloud status and focused context/provider/audio hooks and UI panels. The remaining page is 565 lines. The callback refs are wired after render and invoked by deferred actions; browser speech recognition remains typed at the browser boundary because the configured DOM library lacks its API types. services/web typecheck, lint, and build pass; browser regressions pass 19/19 and web synthetic UAT passes 10/10. The legacy landing Vite build also passes using the installed workspace Rollup native package through NODE_PATH; its full-project TypeScript check still reports unrelated baseline errors, with no diagnostics in the changed BrainPage, speech hook, or API fetch module.

The current whole-repository source scan is 29 files above 600 lines. This refactor is local and not yet pushed. PR #42 is still draft/open and unmerged. Owner migration approval is recorded; this workspace did not connect to a database or execute the migration.
