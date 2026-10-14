# Remediation handoff — `20261013-1900-phdk-auto`

## Current 5.1.24 source fix

Private/local CRM destinations are allowed only as normalized, tenant-configured origins; vendor flows guard initial loads and redirects, and tenant configuration/credentials do not leak through ordinary API or pairing responses. API/Cloud safe-projection and allowlist regressions, Browser security tests, builds and exact-SHA synthetic Web UAT pass. Full Cloud ESLint, native Electron/device/audio, persisted DB and client-specific live CRM/call acceptance remain unverified.

## 5.1.23 PHDK source-boundary fix

Both live app files over the PHDK 600-line maximum are split into cohesive modules. Public Web data-shape exports and API health-report behavior are preserved. Focused regression/build/typecheck/lint and exact-SHA Company Co synthetic UAT pass. The Browser's renderer version is synchronized to the five 5.1.23 app roots. No change claims persisted CRUD, broad route coverage, live providers or native-device acceptance.

## Current continuation — 2026-10-14

Merged source remediations: PR #89 removes transcript, prompt, agent-command and raw upstream error disclosure; repairs Browser version drift, diagnostic report/reset, debug-console defaults and private IPC metadata; and makes anonymous Web/Landing reset reload after the success interval. PR #90 removes the renderer capability to change debug mode after main-process startup. Browser tests 5/5, Web widget/diagnostics 17/17, API 18/18, Cloud 9/9, configured builds, Web/Landing typecheck/build, synthetic Web UAT 1/1, SEO tests 1/1 each and PHDK coherence 52/52 pass. PR #89 and #90 are integrated on main; see the 90-delivery handoff.

The full 35-model matrix and route-level UX gaps still contain source work, while persistence/migration, native device/audio and deployed SEO/AEO need external environments. This handoff closes only the current validated source candidate.

Authorized source remediation for Check finding CHK-001 is implemented and validated. Voice Profiles now has localized safe detail/edit controls. API list/detail/create/update responses select only `id`, `name`, `providerId`, `language`, `isEnabled`, and `isDefault`, omitting `config` and provider relation material. The UI submits only the editable display fields and never supplies a tenant ID or credential. Regression and synthetic UAT cover tenant filters, safe projections, visible 403 handling, and successful edits.

A pre-existing web typecheck error was also resolved by replacing `String.replaceAll` with equivalent ES2020-compatible `split/join` interpolation in `ManagementDebugPage.tsx`.

Validation: API regression 14/14 suites; web typecheck/build; focused ESLint; diagnostics 18/18; locale key parity 734/734/734; Browser build; Cloud build; landing SEO test 1/1 and build; built-SPA local Edge UAT 1/1; PHDK coherence 52/52; source-size audit 0 files ≥600 lines. No persistent DB or native device/audio test is claimed.

Remaining source/external gaps remain tracked in `PHDK_CHECK_REPORT.md`; no broad CRUD matrix or runtime acceptance is inferred. Next stage: review and commit the full 5.1.17 candidate, rerun UAT against the exact commit SHA, then normal PR delivery and remote readback.
