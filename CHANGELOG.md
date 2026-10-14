## v5.1.17 — 2026-10-13 (PHDK Auto continuation)

- Localize KELEDON and Voice Profiles administration in English, Spanish and Portuguese; add labeled fields, accessible modal confirmation, loading/error/retry and honest HTTP failure feedback.
- Derive Voice Profile tenant scope from the API actor and send the API's camelCase contract; test that caller company IDs cannot widen tenant scope.
- Add localized tenant-safe Voice Profile detail/edit; API responses for list/detail/create/update expose only display fields and omit provider/config secrets.
- Send KELEDON interface selections as arrays to avoid double-serialization, validate stored interface JSON, and test admin selectors and payload scope.
- Align all five app package and lock roots at 5.1.17.

### Verification
- Pending integrated UAT, build, regression and Check for this candidate.

### Limitations
- Database-persisted CRUD/migration, native device/audio, broader app accessibility/localization, and deployed SEO/AEO acceptance remain open.

## v5.1.16 — 2026-10-13 (PHDK Auto continuation)

- Localize profile, device and Keledon launcher/session-detail journeys in English, Spanish and Portuguese, including locale-aware profile dates and device status/empty/error copy.
- Use semantic theme colors and announce device loading and request failures; validate device response shapes before rendering.
- Route device users into the existing authorized launcher instead of issuing an incomplete pairing request; add list-error retry and synthetic navigation coverage.

## v5.1.15 — 2026-10-13 (PHDK Auto candidate)

- Localize the authenticated dashboard's copy, known session statuses and feedback in English, Spanish and Portuguese.
- Localize the live/history session journeys and call-monitor preview; label filter/refresh controls and translate session statuses.
- Add accessible captions and scoped column headers to dashboard/session tables; extend synthetic local SPA UAT across all three locales and session states.
- Align all five app package and lock roots at 5.1.15.

## v5.1.14 — 2026-10-13 (PHDK Auto delivery)

- Localize company, brand, team, user and vendor management screens, including CRUD feedback and vendor type/status labels; display country names in the active locale.
- Expand local web UAT for the Spanish administration flows; align all five app package and lock roots at 5.1.14.

## v5.1.13 — 2026-10-13 (PHDK Auto candidate)

- Localize the provider-management interface, provider descriptions, key states, and save feedback in English, Spanish, and Portuguese.
- Extend local web UAT to verify the Spanish provider screen and preserve write-only key behavior; align all five app package and lock roots at 5.1.13.

## v5.1.12 — 2026-10-13 (PHDK Auto candidate)

- Apply light and corporate semantic palette variables to descendant controls, so buttons and form elements actually render their selected theme colors.
- Extend local web UAT to assert theme-token propagation, button colors, login text contrast, and 200/400% viewport reflow.
- Align all five app package and lock roots at 5.1.12.

### Verification
- Web and Landing builds pass; Web typecheck, 18 diagnostics/version tests, local UAT 1/1 and SEO header test pass.
- API lint/build and 14/14 regression suites pass; Cloud build/regression 8/8 pass; Browser build and 29/29 CJS regression checks pass; Landing typecheck/lint pass; PHDK coherence 52/52.

### Limitations
- Persisted CRUD/migration, native Electron/device/audio, broad manual accessibility/localization, and deployed SEO/AEO acceptance remain open.

## v5.1.11 — 2026-10-13 (PHDK Auto candidate)

- Add protected, process-window metered provider diagnostics for LLM, speech-to-text and text-to-speech calls, with safe provider/failure/correlation summaries, explicit retry counts, request-budget caps and AI/voice kill-switch states.
- Restrict aggregate process usage diagnostics to the current database superadmin; include allowlisted feature-flag states and keep tenant provider credentials and identifiers private.
- Add API and report regression coverage for aggregation, privacy, role gating and outcome reporting; align all five app package/lock roots at 5.1.11.

## v5.1.10 — 2026-10-13 (PHDK Auto candidate)

- Replace blanket Electron permission grants with secure-origin, per-session microphone/camera consent; deny other permission types and skip update checks in unpackaged development runs.
- Add localized permission-policy regressions and align all five app package/lock roots at 5.1.10.

## v5.1.9 — 2026-10-13 (PHDK Auto candidate)

- Derive escalation reads and acknowledgements from the current database actor and constrain team/session access to the actor's company and own identity; protect global analytics, dashboard and RBAC operations with the current-database superadmin role.
- Require an authenticated DB-backed actor for listening-session APIs, strengthen session capabilities to UUIDs, and enforce their one-hour expiry.
- Add operational tenant-boundary regressions and align all five app package/lock roots at 5.1.9.

## v5.1.8 — 2026-10-13 (PHDK Auto candidate)

- Reject client-supplied password hashes on user creation and update; credential hashes remain owned by the authentication flow.
- Add admin/superadmin regression coverage and align all five app package/lock roots at 5.1.8.

# Changelog
## v5.1.7 — 2026-10-13 (PHDK Auto candidate)

- Remove automatic migration-history rollbacks from API startup and fail closed when Prisma cannot apply migrations after bounded retries.
- Refuse database seeding or API startup when the empty-database check cannot be verified; make API lint non-mutating and scope its typed project to source files.
- Pin Prettier 3.9.9, required by the configured ESLint plugin, and align API source with the existing `.prettierrc`; full typed lint passes without disabling rules.
- Correct Analytics constructor visibility and Nest gateway lifecycle interfaces; remove unreachable AI-loop success reporting and unreferenced broken/obsolete duplicate runtime modules. Full API source typing passes; legacy runtime manifests whose CloudServer dependency was removed in the Supabase migration are retired.
- Keep all five app package/lock roots aligned at 5.1.7.

## v5.1.6 — 2026-10-13 (PHDK Auto candidate)

- Repair Speaches provider columns to target Prisma's mapped `teams` table, with an idempotent forward migration for previously recorded installs.
- Align all five app package/lock roots at 5.1.6.


## v5.1.5 — 2026-10-13 (PHDK Auto candidate)

- Make the local production-SPA UAT read the candidate version from the web package instead of asserting an obsolete release string; keep the diagnostics fixture and generated evidence version-aligned.
- Align all five app package/lock roots at 5.1.5.

## v5.1.4 — 2026-10-13 (PHDK Auto candidate)

- Remove all production audit findings from API and compatibility Cloud by pinning patched transitive YAML and UUID dependencies and upgrading the direct UUID API to v11.
- Align all five app package/lock versions at 5.1.4; retain the remaining moderate findings in development/build-only dependency trees for separately scoped toolchain review.

## v5.1.3 — 2026-10-13 (PHDK Auto candidate)

- Isolate customer browser tabs from privileged Electron APIs and restore renderer sandbox and web security.
- Fail closed when Cloud AI reasoning is unavailable; retain explicit deterministic stop/mode safety commands.
- Apply compatible dependency fixes, declare the Nest runtime's `reflect-metadata` dependency, upgrade the Electron build toolchain, and align all five app package/lock versions.
- Record remaining transitive API and Electron toolchain advisories and external runtime acceptance gaps in the PHDK evidence; no forced major upgrades or deployment.

## v5.1.2 — 2026-10-13 (local candidate, PHDK Auto)

- Give managers' fixed company context a native fieldset/legend accessible name and verify it in rendered UAT.
- Keep all five app package/lock versions and visible browser diagnostics aligned at 5.1.2.

## v5.1.1 — 2026-10-13 (local candidate, PHDK Auto)

- Remove raw error-buffer and cloud URL disclosure from privileged CRUD health diagnostics.
- Allow admins and coordinators to reassign users only among teams in their DB-derived company; keep role and company changes superadmin-only.
- Align management UI controls and payloads with the tenant policy, with synthetic SPA and Nest guard regression coverage.
- PHDK Check remains partial; see `PHDK_CHECK_REPORT.md`.

## v5.1.0 — 2026-10-13 (local candidate, PHDK Auto)

- Add a protected, dynamically discovered API endpoint diagnostics registry with explicit safe probe modes and sanitized examples.
- Keep public health checks to local liveness; protect dependency/deep health behind persisted-role authorization and add bounded, correlated probe evidence.
- Add request correlation IDs and sanitized API error responses; extend the shared diagnostics widget/report and app-owned reset behavior across the web and landing shells.
- Add focused API and browser-side regression coverage. PHDK Check remains partial; see `PHDK_CHECK_REPORT.md`.

## v5.0.54 — 2026-10-12 (local candidate, acceptance/publication pending)

- Install canonical PHDK 2.50.8 and reconstruct owner-confirmed four-front baseline.
- Align five package/lock versions; reconcile stale workflow and PR records without restoring automation.
- Reusable safe diagnostic actions on public/login/app/admin and native Browser, bounded privacy-safe reports, owned-state reset.
- Validate launch handoff without false handler detection or automatic download.
- Apply owner-approved DB-backed role/tenant administration, least-privilege registration, write-only provider keys and safe record details.
- Add protected managed AI prompts/revisions/output schemas/usage with write-only admin UX; reviewed additive migration remains unapplied pending owner release decision.
- Add shared dark/light/corporate theme, reduced-motion tokens, truthful tenant-configurable public claims and functional public navigation.
- Repair deterministic cloud/runtime queue transport, authenticated session isolation, bounded WebRTC/STT wiring and failure reporting.
- Repair existing web typecheck/runtime contracts without relaxing strict checks.
- Client-specific integrations are configured per tenant; live vendor/call/CRM acceptance is outside this code-review scope. Final remote delivery is not yet performed; no production success claim.
