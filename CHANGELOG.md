# 5.9.0 — 2026-10-26
- Implement eleven approved PHDK Check source gaps: positive interface policy, audit-before-publication, bounded armed cycle, account lifecycle and deterministic ephemeral purge.
- Connect typed team voice/profile options to synthesis; translate interface UI; restore compact diagnostics; govern external overlay tokens; split AI/CRUD modules and reconcile current registries.
- Additive PostgreSQL migration for account state/session watermark and team voice selection. Missing policy is observation-only; no CRM writes or provider configuration changes.
- No local tests/build/lint; UAT NOT RUN. Installer, backup/restore and tenant-isolation decision excluded. Existing customized published planner revisions are preserved.

## 5.8.1 — 2026-10-26
- Preserve Spanish/non-ASCII native interface input and observations through explicit UTF-8 stdin/stdout on Windows PowerShell.
- Install OpenSSL explicitly in both active API image stages so Prisma detects the runtime ABI instead of falling back during generation. This addresses the actual Node24 production-build warning; no ORM or provider migration.
- Static syntax/diff checks only; native behavior and audio acceptance remain UAT NOT RUN.

## 5.8.0 — 2026-10-26
- Add team-scoped general interface observation, one-step Brain planning and explicit execution via opt-in browser extension or paired Windows host; Salesforce remains an optional adapter.
- Restrict mutable input/invocation to positively identified search controls; fence stale observations, duplicate device claims and failed-result verification. Native packaging and all live behavior remain unaccepted.
- Adopt PHDK 2.68.0; owner-approved Node 24.22.1 source/runtime migration and compatible security lock updates across seven packages. No local tests/build/lint or UAT run.
- Retain configurable Spanish/provider voice and supported style requirement; missing OS Spanish voice is not the final product constraint.

## 2026-10-23 — PHDK v2.65.1 standards maintenance (v5.7.1)

- Vendor the complete canonical standards manifest from `d4ed10e96f5fd05ebeaa38a664442d7d10d6cf86` and align native entrypoints.
- Preserve project-specific rules and architecture; changes to product files are release metadata only.
- Scope and verification limits: [`docs/phdk/standards/2026-10-23-v2.65.1.md`](docs/phdk/standards/2026-10-23-v2.65.1.md). Required publication gates and the separate Stack Security Review retain their actual evidence status.

## v5.7.0 — 2026-10-19

- Add explicit per-layer session/team, remote/file STT, knowledge, Brain, web TTS and playback controls, plus a bounded copyable verbose metadata log.
- Connect exact-case voice goals to an opt-in, team-authorized read-only Salesforce Lightning surface, quoted status/subject replies, cancellation and explicit close/standby. Unknown layouts/results require assistance; no CRM writes or arbitrary executor commands.
- Extension 0.4.0 adds Salesforce site patterns, aligns visible versions and exposes sanitized transport observations; no CSP, shared guard, provider, account or assignment changes.
- Owner postponed all new functional/security acceptance. Source review and version/JSON/diff checks only; no local tests/build/lint/typecheck or live product trials. Historical audio acceptance is retained separately.

## v5.6.3 — 2026-10-19

- Preserve global5xx redaction while exposing only an allowlisted Meet voice-stage code in a route-specific response header, validated by the web.
- Record actual STT timeout after45seconds, provider restarts and memory reaching the3GB limit; full conversation acceptance remains blocked, without provider/resources/settings changes or local tests/builds/lint.

## v5.6.2 — 2026-10-19

- Allow a bounded45-second STT wait only for Meet turns after observed upstream499 at14.94seconds during provider startup; other STT callers retain15seconds.
- Abort upstream STT when Meet cancels/disconnects; permit90seconds for the complete browser turn within the unchanged two-minute/six-turn session. No automatic retries, provider/settings/auth/CSP or spending-cap changes.

## v5.6.1 — 2026-10-19

- Diagnose failed Meet voice turns with allowlisted stage/error codes (STT, Brain, timeout or upstream HTTP), without logging provider endpoints, error text, credentials, audio or transcript.
- Distinguish initial channel readiness from actual cancellation; preserve authorization, budgets, providers, CSP and request timeouts. No local tests/builds/lint.

## v5.6.0 — 2026-10-18

- Add explicitly linked Meet receiver audio to configured team STT, Brain and web /tts/speak, with bounded ephemeral audio/history and interruption/late-response rejection.
- Route-specific DB-backed team authorization permits current unassigned superadmins while preserving assigned-user and paired-device checks; no shared guard/CSP/provider changes.
- Opt-in opener-bound Meet link has no tokens/keys in Meet, two-minute/six-turn sessions and explicit cleanup. Production acceptance separate; no local tests/builds/lint.

## v5.5.2 — 2026-10-18

- Replace the TTS preview media element with accessible Web Audio controls that decode sample bytes in memory, avoiding the CSP-blocked blob media URL without changing any CSP directive.
- Support play, pause/resume, stop/replay, progress, decoding errors and source/context cleanup, with SHA-256 and completion evidence. Existing audio download remains separate.
- Allow the exact previously generated Spanish sample to be opened in the production preview without upload or another TTS provider call. No auth/provider/settings changes or local tests/builds/lint.

## v5.4.3 — 2026-10-18

## v5.5.1 — 2026-10-18

- Repair two actual production role-selector UAT findings: keep navigation independently scrollable and the test/return footer reachable in short desktop viewports; show persisted Company Co tenant/brand/team names in scoped profiles.
- Accept the API's camelCase profile context alongside legacy snake_case fields and require synthetic tenant context in production API checks.
- Retain first-run evidence: all four UI role switches/returns and 49 API/expiry/revocation checks passed; two visual findings require deployed retest. No local application commands.

## v5.5.0 — 2026-10-18

- Add an explicitly authorized, audited synthetic superadmin session limited to the role selector; preserve the real operator session in its original tab.
- Bind synthetic role sessions to current owner, fixture run and operator grant; deny generic administration, runtime, sockets and TTS, and cap reduced sessions by the originating capability expiry.
- Add finite production role/tenant/return/replay/expiry checks and explicit owned-fixture retirement/revocation verification. Keep test credentials out of URLs and evidence.
- Use same-origin selector requests, preserve the return to synthetic superadmin and keep all acceptance against deployed production. No local application tests/builds/lint/typechecks.

- Correct the production TTS UAT panel to expect the existing Nest POST success status 201; keep strict audio MIME/size and selected-team checks before retaining the sample.
- Record safe content type and SHA-256 for the exact audio artifact sent to Meet. Second synthetic run retired, old session reuse correctly returned 401; final rerun pending. No provider/auth/hosting settings changed and no local tests/builds/lint.

## v5.4.2 — 2026-10-18

- Send Brain HTTP speech, provider tests and synthetic TTS acceptance through the existing web `/tts/speak` proxy, preserving authentication and avoiding the API domain CORS mismatch observed during production UAT.
- No origin allowlist, hosting/provider settings, roles or secrets changed. First synthetic run retired; repeat acceptance on this candidate. No local tests/builds/lint.

## v5.4.1 — 2026-10-18

- Add an explicitly administrator-authorized audited bootstrap for three new short-lived synthetic TTS accounts, including an unassigned platform superadmin, and two isolated fictional tenants. Existing users, roles and provider settings are never changed.
- Issue server-signed TTS-only capabilities held in Brain component memory; deny general authentication/runtime reuse, enforce current DB identity/lifecycle, run ownership, selected provider team, sample length, expiry and retirement.
- Add Brain controls for idempotent preparation, absent/expired authentication, missing/invalid/nonexistent team and cross-team/global-access denials, one Spanish sample via `/tts/speak`, download for Meet, and audited retirement/revocation.
- Existing team TTS providers, secrets and spending limits remain authoritative. No local tests, builds or lint run per owner instruction; production/Meet acceptance is recorded separately.

## Unreleased — 2026-10-18 (MVP preparation only)

## v5.3.0 — 2026-10-18

- Add a visible superadmin “Test as role” selector for synthetic user, agent, admin and coordinator identities, with preparation, error/retry states and return to superadmin.
- Issue audited ten-minute server sessions using persisted roles and fixture tenant membership; restrict previews to reviewed read-only routes and disable runtime sockets. No real-user impersonation or migrations.
- Reuse the bounded two-tenant fixture lifecycle; explicitly renew dedicated role-preview runs and enforce retirement/expiry for preview users. Preserve existing UAT run ownership/lifecycle restrictions.
- Fix authenticated preview reload and expired-session recovery. Production functional/security acceptance is pending; no local application tests, builds or lint ran.

- Reopen the Windows execution architecture for an owner-directed real Meet + Salesforce MVP, retaining Cloud authority and tenant security.
- Capture the updated intent, five dependency-ordered PIAs, evidence gates and real-platform test prerequisites; no fake telephony/CRM and no operational MVP acceptance claimed.
- Add an experimental profile schema/example and read-only Windows host inventory tool. Product version remains 5.2.21; application runtime is unchanged.

## v5.2.22 — 2026-10-18

- Authorize Brain TTS for current, active database-backed superadmins without tenant assignments using a TTS-only guard and server-resolved team/brand/company scope.
- Preserve ordinary user and paired-device validation; reject explicit foreign-team requests and role-preview tokens before provider execution.
- Keep `/tts/speak`, team-configured providers, secrets and spending controls; return scoped authorization/configuration/budget errors.
- No local application tests, builds or lint. Production security/audio/Meet acceptance remains pending approved synthetic sessions and remote confirmation.

## v5.2.21 — 2026-10-18

- Show the exact KELEDON Browser release beside the authenticated Lounge download action and pin the default installer link to that same release tag.
- When a tenant deployment overrides the download URL, label it as configured; optionally provide `VITE_KELEDON_BROWSER_VERSION` to show its declared installer version.
- Keep Web and Landing download actions consistent. No local application tests/build/lint run under the production-only validation instruction.

## v5.2.20 — 2026-10-18

- Reconcile the PHDK 2.56.0 hybrid value-milestone Plan and PMO to the verified KELEDON 5.2.19 / PR #271 remote-main baseline.
- Add a visible Auto lifecycle entry board and current UAT-156–158 readbacks; keep the four confirmed commitments and all partial/external acceptance gates explicit.
- Static delivery only; no product behavior changed, no local application tests/build/lint, and no new production mutations. The separate Browser logging hardening candidate is excluded from this documentation release.

## v5.2.19 — 2026-10-18

- Reconcile the PHDK Auto milestone plan to KELEDON 5.2.18 remote main and record the PR #270 delivery state.
- Add UAT-154/155 production evidence for the deployed Web version, accessible diagnostic labels, sampled keyboard order and visible focus; leave copy/reset behavior explicitly pending.
- Static lifecycle evidence only; no local application tests/build/lint or production state changes.

## v5.2.18 — 2026-10-18

- Keep the local authentication context intact when the app-owned diagnostic reset fails; only report success and navigate after the reset completes.
- Treat rejected diagnostic-copy adapters as a truthful copy failure and release the pending control state.
- Order KELEDON cache, accessible-cookie and diagnostic-event cleanup before app-owned storage; remove `auth_token` last so earlier failures do not prematurely invalidate the session.
- Keep Web and Landing diagnostic behavior aligned. No local application tests/build/lint run under the owner's production-only restriction. Web/API are deployed; UAT-154/155 are limited production observations. Copy/reset behavior and authenticated acceptance remain pending an authorized disposable synthetic session.

## v5.2.17 — 2026-10-18

- Reconcile the KELEDON Auto Plan and PMO artifacts with PHDK 2.56 value-milestone planning, preserving the four confirmed commitments and production-only acceptance boundaries.
- Reconcile CRUD coverage to the current 41-model Prisma schema by adding 14 role/surface rows for UatFixtureRun; all remain blocked until authenticated production acceptance.
- Synchronize all five application package/lock roots and the Browser renderer to 5.2.17.
- Static verification: PHDK coherence 69/69, current version-root alignment, and diff whitespace check. No local application tests/build/lint run under the owner's restriction.

## v5.2.16 — 2026-10-18

- Add the protected `/admin/interfaces` route to the Web Nginx SPA allowlist so fresh direct links reach the superadmin guard instead of the static 404 page.
- Align the Nginx route regression with the active `@spa` fallback and assert the interface route remains superadmin-protected.
- Synchronize all five application package/lock roots and the Browser renderer to 5.2.16.
- PHDK standards synchronized to canonical 2.56.0; coherence passes 69/69. No local application tests/build/lint run under the owner's production-only restriction.

## v5.2.15 — 2026-10-18

- Add a superadmin-only, company-owned interface catalog with create, list, edit and delete controls; tenant admins keep using their existing scoped team assignment flow.
- Validate managed interface URLs and request fields on the API, require an existing owning company, preserve ownership on edit and never return credentials.
- Redact URL/origin/host/IP/CIDR and credential fields from audit change payloads.
- Delivered through PR #266 and deployed to production; anonymous UI/API checks are recorded in UAT-149. Authenticated acceptance remains pending.

## v5.2.14 — 2026-10-18

- Verify Web nginx HTTPS upstream certificates against an explicit CA bundle and API hostname; remove the three location-level verification bypasses. Validate nginx configuration before serving at container startup.
- Preserve UAT-147 production 5.2.13 liveness/anonymous-denial evidence, including the initial Web-edge 403 observations and corrected API-upstream retest. Authenticated acceptance remains open.

## v5.2.13 — 2026-10-18

- Add a superadmin-only synthetic-fixture lifecycle with transactional audit, two-tenant capacity, 1–24h TTL, reversible retirement and credential-free API/settings UI.
- Expired or retired synthetic accounts lose HTTP/device access; restoration requires fresh normal login and does not resurrect old bearer/device credentials. Existing ordinary accounts preserve their authentication behavior.
- Serialize Browser command claims/results per device across API replicas and commit result/flow/event changes atomically. Explicit command targets override session fallback; result metadata cannot override the resolved device. Permanent at-most-once claims remain; no CRM retry/lease expiration is enabled.
- Add boundary regression sources; these have not been run locally under the owner's production-only acceptance instruction.

## v5.2.12 — 2026-10-18

### Fixed
- Reserve vertical space for the fixed login header so its theme/language controls do not cover the welcome heading on a 320px viewport.

### Verification
- Validate header-to-heading separation and reflow on the deployed production site; do not run application tests, builds, or lint locally.

## v5.2.11 — 2026-10-17

### Fixed
- Meet the PHDK 44px touch-target minimum for the mobile login brand link, email/password fields, and signup toggle.

### Verification
- Accept UAT-142 on the deployed production site at a 320px viewport; do not run application tests, builds, or lint locally.

## v5.2.10 — 2026-10-17

### Fixed
- Localize the static production 404 page using the saved KELEDON language or browser language.

### Verification
- Re-run the 404 and language cases on the deployed production site; do not run application tests, builds, or lint locally.

## v5.2.9 — 2026-10-17

### Fixed
- Serve private SPA routes from an initial noindex shell, keep the public homepage as the sole indexable document, and return a real 404 page for unknown paths.

### Verification
- Production-only acceptance under `PIA-AUTO-SEO-002`; do not run application tests, builds, or lint locally.

## v5.2.8 — 2026-10-17

### Fixed
- Include the existing, factual product overview in the deployed Web document's initial HTML so the public home has a semantic H1 and useful content before JavaScript runs.

### Verification
- Do not run application tests or builds locally. Accept the initial response and React handoff on the production site under `PIA-AUTO-SEO-001`.

## v5.2.7 — 2026-10-17

### Fixed
- Keep API and OAuth hostnames out of copied Landing diagnostics, matching the Web privacy contract.

### Verification
- Added a Landing/Web redaction-contract regression. App tests and builds are not run locally; verify the deployed public copy status in production without reading clipboard contents.

## v5.2.6 — 2026-10-17

### Fixed
- Give the KELEDON home link in the shared Web/Landing mobile header a 44px minimum touch target.

### Verification
- Production UAT-125 found this adjacent header target after the v5.2.5 menu retest. Revalidate all header/menu controls at 320×720 and 375×812 in production.

## v5.2.5 — 2026-10-17

### Fixed
- Meet PHDK's 44px minimum touch target for public mobile navigation links and shared theme/language selectors, and keep authenticated menu actions aligned in Web and Landing.

### Verification
- Production UAT-125 confirms the menu links and preference selectors meet the 44px minimum at 320×720 and 375×812, with no horizontal overflow. The separate KELEDON home-link target remains tracked in UAT-126.

## v5.2.4 — 2026-10-17

- Synchronize the document language metadata with the selected locale in Web and Landing.

## v5.2.3 — 2026-10-17

- Omit configured API and OAuth hostnames from copied diagnostics to avoid disclosing deployment-specific infrastructure details.

## v5.2.2 — 2026-10-17

### Fixed
- Use theme-aware foreground tokens for landing CTA copy and pair the primary action button's semantic background/foreground tokens so it retains contrast in dark, light and corporate themes.

### Verification
- Production UAT-111 on 5.2.1 found low-contrast CTA combinations in dark and corporate themes. Candidate 5.2.2 requires post-deploy production revalidation in all three themes; local application tests/builds are not used.

## v5.2.1 — 2026-10-17

### Fixed
- Ignore stale managed-interface loads and saves when the team editor changes teams or closes, preventing late responses from replacing another team's selection.

### Verification
- Add a focused request-sequence regression for invalidating stale team loads and saves. Web typecheck, lint and production build are run for this release.
- Align API, Cloud, Web, Landing and Browser package/lock roots and the Browser renderer at 5.2.1.

## v5.1.83 — 2026-10-17

### Fixed
- Load `services/web/nginx.conf` in the repository-root Railway Docker build so Nginx receives a server configuration in `conf.d` instead of the repository-level main configuration.

### Verification
- Web SEO/Nginx configuration regression verifies the Dockerfile selects the service-scoped config. Web production build and typecheck pass.

### Deployment note
- Railway Web deployment for 5.1.82 crashed because the root build context copied the main nginx config into `conf.d`; 5.1.83 corrects the source path.

## v5.1.82 — 2026-10-17

### Changed
- Enforce the configured exact-origin allowlist for credentialed HTTP and Socket.IO CORS in API and Cloud; the legacy allow-all flag no longer widens access.
- Replace wildcard CORS defaults in the local container launcher and deployment examples with explicit web origins.

### Verification
- API and Cloud CORS allowlist regressions verify an approved origin is reflected and an unlisted origin receives no CORS grant, even when the legacy flag is set.

### Migration / limitations
- Existing deployment variables were not changed. Browser extensions that connect directly must use their exact published extension origin in the configured allowlist.

## v5.1.81 — keep flow editor data aligned with the selected tenant

- Resolve each flow refresh against the currently selected company, including refreshes resumed after an in-flight write.
- Ignore responses from older refreshes so delayed tenant data cannot replace the active company or legacy view.
- Add a production-built Web UAT race case that delays a Tenant B response while switching to unassigned legacy flows.
- Align all five package/lock roots and Browser renderer at 5.1.81.

### Verification
- Web typecheck and production build pass; the targeted superadmin flow UAT passes repeatedly with the delayed-response race enabled.
- Full production-built Web UAT passes 8/8; standalone admin-settings, theme-template and AI-admin UAT pass.
- PHDK 2.52.2 coherence passes 63/63. Exact candidate delivery/readback is pending.

## v5.1.80 — report integration health only after a real check

- Initialize default integration telemetry without a check timestamp, successful requests, a false 100% uptime claim, or synthetic zero-valued connection metrics; preserve missing last-sync time.
- Render response time, uptime and error rate as unmeasured in Web and Landing until a real provider check records metrics.
- Add API and Cloud service contracts for unmeasured and subsequently measured integration health.
- Align all five product package/lock roots and Browser renderer at 5.1.80.

### Verification
- API/Cloud integration-health service contracts pass 2/2 each; shared health-model tests pass 2/2; focused ESLint passes.
- API/Cloud regressions pass 42/42 and 19/19; API/Cloud/Web/Landing/Browser production builds pass; Web/Landing typechecks pass.
- Latest full production-built Web UAT run passes 7/8; the superadmin flow-editor test times out only in the combined suite and passes 1/1 in isolation. Standalone admin-settings, theme-template and AI-admin UAT pass; Browser renderer version sync is `v5.1.80`; PHDK coherence passes 63/63.

## v5.1.78 — managed Cloud AI runtime parity

- Route Cloud Brain and decision-engine calls through the persisted, revisioned AI workflow catalog; validate bounded inputs and JSON-schema outputs before using results.
- Resolve the provider and credentials from the database-bound team, attribute usage to the prompt revision, and retain per-actor/runtime AI budget controls.
- Add the shared managed-AI schema and migration history to Cloud, with cross-backend contract tests.
- Synchronize the vendored PHDK standards to 2.52.2 and align all five product package/lock roots plus the Browser renderer at 5.1.78.
- Repair the Web monorepo Docker build context so its canonical shared theme tokens are included; Railway's live root-directory setting still needs an owner change before redeploy can succeed.

### Verification
- Cloud managed AI contract 6/6, Cloud regression 19/19, typecheck/build, Prisma validation and scoped lint pass.
- API managed-AI contract 9/9 and regression 42/42; focused persisted-role guard 3/3; Web typecheck and all five package builds pass. Prisma validate/generate used a placeholder URL and did not connect to a database.
- Runtime migration/restart and provider/customer acceptance remain unverified; whole PHDK Auto remains partial.

## v5.1.77 — compact diagnostics controls with 4px spacing

- Align the Web, Landing and Browser diagnostics tiles to a visible 4px gap while preserving independent 44×44px hit targets.
- Add production-built Web geometry assertions and keep Browser renderer geometry covered by its focused contract test.
- Correct malformed metadata in the 5.1.75 Check report without removing its history.
- Align all five app package/lock roots and the Browser renderer at 5.1.77.

### Verification
- Web diagnostics component: 19/19; Browser widget/renderer-boundary tests: 4/4.
- Full production-built Web UAT 7/7 plus admin-settings, theme-template and AI-admin; Landing desktop/mobile geometry UAT passes.
- Web/Landing builds and typechecks, changed Web test ESLint, Web/Landing SEO 1/1 each, PHDK 2.51.5 coherence 61/61, and `git diff --check` pass. Remote PR delivery is pending.

## v5.1.76 — preserve Check lifecycle history

- Restore the complete historical Check handoff while retaining the 5.1.75 candidate recheck at the top.
- Align all five app package/lock roots and the Browser renderer at 5.1.76 for this corrective documentation release.
## v5.1.75 — 2026-10-17 (accessible, localized team voice settings)

- Associate labels with every team voice setting, announce loading and save results, restore visible keyboard focus, and make the controls at least 44px tall.
- Translate the Team Settings page, provider options, Vosk model list and save feedback into English, Spanish and Portuguese.
- Extend production-built Web UAT with role boundaries, three-locale labels, keyboard focus, touch-target sizes, light-theme field contrast, and successful/failed save announcements; make the superadmin legacy-flow locator tolerate its full accessible name.
- Align all five app package/lock roots and the Browser renderer at 5.1.75.

### Verification
- Web typecheck and production build pass; Web UAT passes 7/7 suites plus admin settings, theme-template and AI-admin UAT.
- Team Settings UAT passes 47 scoped assertions; focused ESLint passes. Contrast covers the five fields in the default light theme only; no screen-reader session was run.
- PHDK remains 2.51.5 and coherence is 61/61. Whole PHDK Auto remains partial.

## v5.1.74 — 2026-10-17 (tenant admin routing and audit attribution)

- Align admin settings and team settings routes with the approved admin/coordinator/superadmin policy; ordinary users remain denied, and translate settings/theme editor copy in English, Spanish and Portuguese.
- Attribute API and Cloud audit events only to the authenticated actor, capture tenant before handlers, and verify role-aware admin settings with synthetic Web UAT.
- Fix the superadmin flow UAT selector to account for the button's accessible category/status text; align all five app package/lock roots and the Browser renderer at 5.1.74.

### Verification
- API build/regression 42/42; Cloud build/regression 18/18; API/Cloud audit query/redaction 4/4 and denied-attribution/interceptor 10/10.
- Web production build, typecheck, 7/7 UAT suites and standalone admin-settings, theme-template and AI-admin UAT pass. PHDK v2.51.5 coherence 61/61. Whole PHDK Auto remains partial; no deployment is claimed.

## v5.1.73 — 2026-10-15 (restrict orphan session cleanup)

- Limit API and Cloud orphan-session counts/deletes to ended records with no owner references, metadata, Events, FlowRuns, or SubAgents, preventing cleanup from matching active or otherwise meaningful sessions.
- Preserve FlowRunEvidence as dormant schema-only capability; it has no active writer or reader and is not required by current flow execution.
- Align all five app package/lock roots and the Browser renderer at 5.1.73.

### Verification
- API regressions 40/40; Cloud regressions 18/18; API and Cloud TypeScript builds pass.
- API/Cloud regression 47 verifies predicate parity; UAT-068 exercises authenticated API and Cloud count/delete routes against disposable PostgreSQL 16.15, preserving active, metadata-bearing, Event-, FlowRun- and SubAgent-bearing sessions. Synthetic fixtures were removed; no production cleanup was performed. Whole PHDK Auto remains partial.

## v5.1.72 — 2026-10-15 (close PHDK Auto integration and contrast findings)

- Remove stale API/Cloud local proof-script entries and add a regression that verifies every remaining local proof script target exists.
- Fix selected Web text-contrast defects across management, session/device status, actions, and missing provider-key messages; make the browser contrast scanner composite alpha and opacity correctly and skip disabled controls.
- Synchronize the vendored PHDK v2.51.2 standards and refresh the four owner-approved PHDK Auto workstreams and stage evidence.

### Verification
- API 40/40 suites; Cloud 18/18; production-built Web UAT 6/6 plus AI-admin; Web diagnostics 19/19; Browser widget checks 3/3; Web/Landing SEO 1/1 each.
- PHDK v2.51.2 coherence 56/56; all checks use synthetic fixtures where applicable. Whole PHDK Auto remains partial for manual and external acceptance.

## v5.1.70 — 2026-10-15 (record owner-approved dormant feature flags)

- Keep the FeatureFlag schema and unregistered service dormant by owner decision; grant no roles and expose no route, module, UI, or caller.
- Reclassify its 14 model-role-surface rows as NOT APPLICABLE to active product surfaces; add an inventory regression to prevent accidental exposure.
- CRUD inventory remains 39 Prisma models / 546 model-role-surface rows; decision-needed count falls from 31 to 17.

### Verification
- API regression 39/39; Cloud regression 18/18; CRUD inventory 39 models / 546 model-role-surface rows / 168 core rows.
- Five builds, five lint checks, four dedicated typechecks, Browser TypeScript build, and PHDK v2.51.2 coherence 56/56 pass.
- UAT-064 is owner-decision and source-inventory evidence only; no migration or persisted database behavior was exercised. UAT tally: 62 PASS, 1 BLOCKED, 1 MANUAL; whole PHDK Auto remains partial.

## v5.1.69 — 2026-10-15 (reconcile nested CRUD scope evidence)

- Add API/Cloud regression cases for tenant company country updates, direct nested route denial, and foreign-company country updates.
- Reconcile the CRUD matrix: CompanyCountry and TeamInterface are nested relations; provider/voice scope is source-tested but remains partial pending persistence and audit acceptance.
- Align all five app package/lock roots and Browser renderer at 5.1.69.

### Verification
- API regression passes 39/39; Cloud passes 18/18; CRUD model inventory checks all 39 models and 546 role/surface rows.
- UAT-063 is source/guard evidence only. No live database or customer identity was used; whole PHDK Auto remains partial.

## v5.1.68 — 2026-10-15 (verify actor-derived provider tenant scope)

- Extend API/Cloud authorization regressions to verify tenant-provider-config and voice-profile reads and writes derive `companyId` from the current database actor.
- Preserve negative coverage for cross-company batches, direct IDs and low-role mutations; align all five app package/lock roots and Browser renderer at 5.1.68.

### Verification
- API policy and full regression pass 39/39; Cloud policy and full regression pass 18/18. All five production builds and lint checks pass; API/Cloud/Web/Landing typechecks and Browser `tsc` build pass; PHDK v2.51.2 coherence passes 56/56.
- UAT-062 is source-guard evidence only; no live database or customer identity was used. Whole PHDK Auto remains partial.

## v5.1.67 — 2026-10-15 (fail closed on API flow-search scope)

- Require a tenant team and non-empty query before API flow-vector searches or listings; always constrain results to the requesting team.
- Bound API flow-search result limits to 1–50, reject failed Qdrant responses, and discard malformed result rows to match Cloud behavior.
- Add API unit coverage for missing-team denial, scoped listings, result bounds and malformed responses; align all five app package/lock roots and the Browser renderer at 5.1.67.

### Verification
- API FlowService Jest 12/12; Cloud FlowService parity Jest 10/10; API regression 39/39; all five production builds pass.
- API/Cloud full TypeScript checks, Web/Landing typechecks, and all five package lints pass. The 5.1.67 change is source-level; live Qdrant/tenant DB acceptance remains external.

## v5.1.66 — 2026-10-15 (persist tenant flow configuration)

- Replace the shared JSON flow editor store with PostgreSQL-backed tenant definitions, version history, company permissions and intent mappings in API and Cloud.
- Add idempotent legacy JSON import, immutable company ownership after assignment, draft-only version updates and a composite foreign key that rejects cross-company flow permissions.
- Keep the management flow editor tenant-scoped and improve its mobile shell with a compact top navigation and full-width form; cover keyboard and 390px layouts in local UAT.
- Upgrade PHDK standards to canonical v2.51.2; align all five product package/lock roots and the Browser renderer at 5.1.66.

### Verification
- API regression 39/39 and Cloud regression 18/18; Prisma validation, both backend builds and applicable lint pass; Web UAT 6/6 plus AI-admin journey, diagnostics 19/19 and Browser offline suite 43/43 pass. Five-product build/lint/typecheck and public SEO source tests are revalidated at the final candidate.
- Isolated PostgreSQL migration execution and restart-persistence UAT remain blocked because this workstation has no PostgreSQL service, `psql` or Docker. Whole Auto remains partial for database execution, native device/audio, broad accessibility/localization, deployed SEO/AEO and tenant-selected live integration acceptance.

## v5.1.65 — 2026-10-15 (scope legacy flow definitions by company)

- Convert legacy flow definitions into company-owned configuration with a tenant management editor, draft/version lifecycle, company availability and intent routing.
- Derive admin/coordinator tenant scope from the current database actor; prevent cross-company flow references; retain approved versions and deactivate definitions without hard deletion.
- Add superadmin assignment for legacy definitions without company ownership and a synthetic browser UAT for the editor.
- Upgrade installed PHDK standards from 2.50.10 to canonical 2.51.2 using the official updater.
- Align all five application package/lock roots and Browser renderer at 5.1.65.

### Verification
- API regression suite passes 38/38; Cloud regressions pass 17/17; API, Cloud, Web, Landing and Browser builds pass; Cloud/Web targeted lint and Web typecheck pass; PHDK 2.51.2 coherence 56/56; targeted flow editor UAT and full Web `test:uat` pass (6/6 browser cases plus AI-admin UAT). Browser traffic is local with synthetic API fixtures and external requests blocked.
- Durable JSON-store concurrency/multi-instance behavior, live database acceptance, and the broader Auto portfolio remain open.

## v5.1.64 — 2026-10-15 (meet diagnostics touch-target minimum)

- Give the two icon-only diagnostics actions 44×44px interactive hit targets while keeping their visible tiles 28×28px and separating targets by 4px.
- Extend Web component and production-browser UAT to verify pointer target geometry, non-overlap, accessible names, and desktop/mobile retention.
- Align all five application package/lock roots and Browser renderer at 5.1.64.

### Verification
- Web diagnostics/debug-mode/version-actions pass 19/19; Browser offline suite passes 28/28 including native widget geometry contract.
- Production-built Landing UAT-056 passes 1/1 at desktop and mobile with external traffic blocked; five builds, Web/Landing lint/typechecks and PHDK coherence 52/52 pass.
- Native Browser CSS is source-tested only; packaged Electron remains unverified and whole PHDK Auto remains partial.

## v5.1.63 — 2026-10-15 (place public diagnostics directly below the product name)

- Stack the version/copy/reset row below the KELEDON brand in both public navigation bars, matching the mandatory PHDK top-left placement while preserving the compact 12px/28px/14px/4px geometry.
- Add exact-browser geometry assertions for the brand-to-widget position, hero clearance and mobile visibility; make Landing UAT evidence versioned and optionally isolated.
- Align all five application package/lock roots and Browser renderer at 5.1.63.

### Verification
- Web component/diagnostic handler tests, Landing/Web builds and targeted local browser UAT are required for this positioning change; full portfolio acceptance remains partial.

## v5.1.62 — 2026-10-15 (require AI administration acceptance in release gates)

- Add the AI prompt/usage contract suite to the mandatory API regression runner and the existing synthetic AI-admin journey to Web UAT.
- Reconcile AI prompt, FeatureFlag, and DebugMode CRUD coverage so active, unreachable, and browser-local surfaces are described accurately.
- Synchronize the Browser request-scope test fixture with the current bridge API and align all five application package/lock roots and Browser renderer at 5.1.62.

### Verification
- API/Cloud regression suites pass 38/38 and 17/17; Browser offline suite passes 42/42; Web diagnostics 19/19 and UAT 5/5 plus 12 synthetic AI-admin journeys pass.
- All five production builds and applicable API/Cloud/Web/Landing lint, Web/Landing typecheck and SEO checks pass; PHDK coherence passes 52/52.
- Browser ESLint was unavailable in the checkout. UAT is synthetic for AI administration; persisted permissions and whole Auto remain incomplete.

## v5.1.61 — 2026-10-15 (keep public navigation preferences clear and responsive)

- Move theme and language controls into the desktop navigation row and expandable mobile menu in both Web apps, eliminating the Landing hero overlap at 1280px.
- Add exact local browser UAT for Landing desktop geometry and mobile preference access, plus matching Web layout assertions.
- Align all five application package/lock roots and Browser renderer at 5.1.61.

### Verification
- Web UAT suite 5/5, Web diagnostics/version-actions 19/19, Browser version-actions/security policy 15/15, API regression 37/37, Cloud regression 17/17, all five builds, applicable lint/typecheck, Web/Landing SEO 1/1 each, and PHDK coherence 52/52 pass.
- UAT-052 uses a local production build with external requests blocked; no deployment or customer system is claimed.
- Whole PHDK Auto remains partial for exhaustive persisted operations/concurrency, native device/audio, broad accessibility/localization, deployed SEO/AEO and customer-selected call/CRM acceptance.

## v5.1.60 — 2026-10-15 (verify diagnostics mounts in both Web apps)

- Extend the shared version/actions route regression to verify the public Landing page, login, app shell and admin mounts as well as the authenticated Web app.
- Keep runtime behavior unchanged; record that the mounted-component source checks apply independently to both Vite applications.
- Align all five application package/lock roots and Browser renderer at 5.1.60.

### Verification
- Web diagnostics/version-actions tests, Browser version-actions tests, applicable builds/lints, version alignment and PHDK coherence are required before delivery.
- No browser session, live endpoint, customer data, database or physical device is used by this source-only acceptance slice.
- Whole PHDK Auto remains partial for exhaustive persisted operations/concurrency, native device/audio, broad accessibility/localization, deployed SEO/AEO and per-customer call/CRM acceptance.

## v5.1.59 — 2026-10-15 (preserve tenant request scope while closing CRM tabs)

- Stop pending navigation on a closing vendor BrowserView while its tenant origin allowlist remains active; release that scope only from the WebContents `destroyed` event.
- Keep the active request-scope registry from strongly retaining closed WebContents while preserving the per-session service-worker allowlist.
- Add a regression that ensures pending page requests cannot lose tenant enforcement during tab close.
- Align all five application package/lock roots and Browser renderer at 5.1.59.

### Verification
- Browser security/call/event tests, lint and build pass; API/Cloud regression suites and all five production builds pass; PHDK coherence is 52/52.
- UAT-050 is source-contract evidence only. No live CRM, private endpoint, database or packaged Electron UI was exercised.
- PHDK Auto remains partial; tenant-specific integrations, broad persisted CRUD acceptance, native device/audio, accessibility/localization, and deployed SEO/AEO remain open.

## v5.1.58 — 2026-10-15 (enforce tenant-bound integrations and device pairing)

- Require Cloud device registration retries to match the DB-derived user and company already bound to the machine.
- Deny device registration when the current DB actor has no company.
- Require complete stored tenant/device bindings before Cloud pairing; atomically consume only a still-pending, matching, unexpired code.
- Return a generic public pairing error so database/internal exception details are not disclosed.
- Bind configured vendor BrowserViews to the tenant origin allowlist for their lifetime and through AutoBrowse goals, including AI-planned actions and subresources; restore the prior scope after execution and clear it when the view closes.
- Remove unreachable API/Cloud DebugMode services; keep the active Web debug capture explicitly local-only and classify the dormant persisted model as NOT APPLICABLE pending an approved schema migration.
- Add focused Cloud/Browser/API regressions and map scoped source evidence while keeping live device/persistence acceptance BLOCKED.
- Align all five application package/lock roots and Browser renderer at 5.1.58.

### Verification
- API regression 37/37, Cloud regression 17/17, Browser security/call/event tests 15/15, five production builds and PHDK coherence 52/52 pass; all six version roots align at 5.1.58.
- UAT-047 and UAT-048 are source-level only; no live DB, device, pairing code, vendor or customer endpoint was used.
- PHDK Auto remains partial; live persisted device acceptance and native device/audio remain open.

## v5.1.57 — 2026-10-14 (trace persisted UAT in the CRUD matrix)

- Link the four exercised Company/User API role rows to UAT-045 without claiming exhaustive persistence coverage.
- Extend regression 33 to require the evidence citations and retain BLOCKED until full model-role-operation acceptance.
- Record UAT-046 as documentation/evidence integrity only; runtime behavior is unchanged.
- Align all five application package/lock roots and the Browser renderer at 5.1.57.

### Verification
- API regression 33 verifies the 35-model inventory, 490 role/surface rows and scoped UAT evidence mapping.
- Full API regression, five product builds, PHDK coherence and exact version alignment are recorded in the candidate check report.
- PHDK Auto remains partial; exhaustive persisted operations and native/deployed acceptance gates remain open.

## v5.1.56 — 2026-10-15 (persisted role and migration acceptance)

- Record exact-source PostgreSQL UAT for identity defaults, superadmin role assignment, tenant boundaries and migration idempotency.
- Reconcile current UAT-009/010 status with disposable PostgreSQL evidence and retain the exhaustive 35-model matrix as open.
- Align all five application package/lock roots and the Browser renderer at 5.1.56.

### Verification
- API build and regression pass 36/36; eight migrations are current after repeated deploy.
- Exact 5.1.55 API UAT: same-tenant read allowed; cross-tenant read, admin role escalation and company deletion denied; synthetic fixtures cleaned.
- Whole PHDK Auto remains partial for exhaustive persisted operations, native device/audio, broad accessibility/localization and deployed SEO/AEO.

## v5.1.55 — 2026-10-15 (preserve the model inventory table schema)

- Restore the separate 35-row model-to-surface inventory to its documented three-column shape after the CRUD capability matrix expansion.
- Strengthen regression 33 to validate the narrative inventory header and every row, in addition to all 490 model-role-surface tuples.
- Record a post-merge integrity correction for 5.1.54 and align all five application package/lock roots plus the Browser renderer at 5.1.55.

### Verification
- API regression 33 passes: 35/35 Prisma models, 490 unique model-role-surface rows, 168 established resource rows, and 35 correctly shaped inventory rows. PHDK coherence passes 52/52.
- This correction repairs documentation/test integrity; persisted role/tenant authorization, product decisions and external/manual Auto acceptance remain open.

## v5.1.54 — 2026-10-14 (map every persisted model by role and surface)

- Expand the CRUD crosswalk from the core resource groups to every Prisma model × role × API/Web surface, preserving explicit blocked, gap, not-applicable, and decision-needed states.
- Map legacy flow, AI administration, runtime, audit, and nested relation behavior from current route and guard sources; keep the unresolved feature-flag/debug-mode and persistence cases visible.
- Extend the regression so it requires all 490 model-role-surface combinations and asserts sensitive catalog, flow, and AI policy boundaries.
- Align all five application package/lock roots and the Browser renderer version at 5.1.54.

### Verification
- API standalone regression 33 passes: 35/35 Prisma models, 490 unique model-role-surface rows, and 168 established resource rows. PHDK coherence passes 52/52; git diff check passes.
- Persisted DB authorization, the Flow/legacy/API-Web gaps, and remaining decisions are explicitly open; no database, CRM, provider, customer data, or deployment was used.

## v5.1.53 — 2026-10-14 (serve the public overview without JavaScript)

- Render the public landing page's existing, client-configured product overview into the initial HTML so crawlers and non-JavaScript users receive a semantic H1 and direct architecture context.
- Keep the static overview visually styled only while the no-JavaScript fallback is active; the React application replaces it after startup.
- Align all five application package/lock roots and the Browser diagnostics version at 5.1.53.

### Verification
- Landing `test:seo` passes 1/1; Landing lint and both TypeScript projects pass; production build passes with the existing 580.27 kB main-chunk advisory; PHDK coherence passes 52/52.
- The built `landing/dist/index.html` retains the semantic H1 and substantive client-configured overview in its initial HTML. No deployed recrawl, customer CRM or hosting-provider action was performed.

## v5.1.50 — 2026-10-14 (close Web ESLint warnings)

- Replace the remaining `any` annotations in legacy dashboard and administration components with explicit UI/data contracts; validate role values before invoking user impersonation.
- Record intentional provider-plus-hook exports so the Fast Refresh lint rule does not report false positives.
- Bring full Web ESLint to 0 warnings and 0 errors; align all five package/lock roots and Browser diagnostics at 5.1.50.

### Verification
- All five production builds pass; Web lint/typecheck pass; Web diagnostics 19/19, SEO 1/1 and synthetic production-SPA UAT 4/4 pass; PHDK coherence 52/52.
- UAT uses isolated Company Co fixtures, mocked API and blocked external traffic; no live DB, customer integration, native device/audio or deployment was tested.

## v5.1.49 — 2026-10-14 (tighten Web data contracts)

- Replace implicit `any` types with explicit API, session, administration, flow, Vector Store, agent, and Brain speech/audio contracts across active Web paths.
- Safely extract API error messages, normalize optional session status, and correct country-code handling for company country fallbacks.
- Reduce Web ESLint warnings from 95 to 14 with zero errors; remaining warnings are isolated to unused legacy components and three Fast Refresh context exports.
- Align all five application package/lock roots and the Browser diagnostics widget at 5.1.49.

### Verification
- API, Cloud, Browser, Web, and Landing builds pass; Web typecheck passes; exact-source full Web UAT passes 4/4 with synthetic APIs and external traffic blocked.

## v5.1.48 — 2026-10-14 (make provider status safe and close Web hook warnings)

- Read provider-key presence only from the API's safe `*Set`/`hasApiKey` flags; secret placeholders stay blank in Brain's write-only credential flow.
- Ignore stale provider-config responses after switching teams or refreshing, so one tenant's configuration cannot overwrite another team's visible status.
- Close all 12 Web `react-hooks/exhaustive-deps` warnings, remove the remaining 5 synchronous-effect state warnings, and make active-loop duration rendering pure. Full Web lint falls from 119 to 95 warnings with 0 errors; no React Hooks/purity warnings remain.
- Align all five application package/lock roots and the Browser diagnostics version at 5.1.48.

### Verification
- All five builds, Web typecheck, API/Cloud regression (36/16 suites), Browser offline tests (27/27), Web synthetic UAT (4/4), Web/Landing SEO (1/1 each), diagnostics (19/19), and PHDK coherence (52/52) pass. Whole Auto remains partial for persistence/native/deployed gates.

## v5.1.47 — 2026-10-15 (handle asynchronous API failures explicitly)

- Await session-room membership and dashboard flow/provider operations so gateway handlers catch asynchronous failures.
- Log failures from scheduled security cleanup, disk storage initialization, and the Speaches TTS stop path instead of leaving rejected promises unhandled.
- Remove all 17 API `no-floating-promises` warnings; API full lint debt falls from 135 to 118 warnings, with no errors.
- Align all five application package/lock roots and the Browser diagnostics version at 5.1.47.

### Verification
- API build and regression suites pass; full API ESLint has 118 warnings/0 errors, including 0 floating promises. PHDK coherence is recorded after source checks. Whole Auto remains partial for its database/native/deployed acceptance gates.

## v5.1.46 — 2026-10-15 (keep global interface catalog hidden)

- Remove the unmounted legacy InterfacesManager UI; customer-selected CRM/call configuration remains in tenant-scoped Vendor settings with validated origin allowlists.
- Preserve the global ManagedInterface APIs as superadmin-only legacy paths; document TeamInterface as a company-scoped nested Team relation and strengthen policy/inventory regressions.
- Align all five application package/lock roots and Browser renderer at 5.1.46.

### Verification
- API/Cloud policy, team-interface, and matrix regressions pass; full API/Cloud/browser/Web/Landing verification is recorded in the active PHDK Auto lifecycle.
- This source change does not certify persisted PostgreSQL, native device/audio, or deployed SEO/AEO; whole PHDK Auto remains partial.

## v5.1.45 — 2026-10-15 (enable Browser lint and close source issues)

- Add an ESLint 10 flat configuration and a zero-warning lint command for Browser TypeScript; remove unused source and correct empty best-effort handlers.
- Unsubscribe call transcript listeners when stopped, measure event timers, and provide only completed action types to planner replanning context.
- Align all five application package/lock roots and the Browser diagnostics version at 5.1.45.

### Verification
- Browser lint/build and offline suite (40/40), API/Cloud regressions (36/36, 16/16), all five app builds, synthetic Web UAT (4/4 suites), Web/Landing SEO (1/1 each) and PHDK coherence (52/52) pass; evidence is recorded in the active PHDK Auto lifecycle.
- Delivery is pending PR and remote readback; whole Auto acceptance remains partial.

## v5.1.44 — 2026-10-15 (scope BrowserView resource requests to tenant origins)

- Enforce the active Cloud-derived RPA tenant-origin allowlist on BrowserView HTTP(S)/WebSocket resource requests as well as navigation.
- Preserve configured private CRM origins while denying requests to unlisted origins during RPA.
- Align all five application package/lock roots and the Browser renderer at 5.1.44.

### Verification
- Offline policy, Browser RPA, Electron wiring, build and PHDK evidence are recorded in the active lifecycle.

## v5.1.43 — 2026-10-15 (apply active tenant scope to BrowserView navigation)

- Apply the trusted Cloud-derived RPA tenant-origin allowlist to Electron navigation, frame, redirect, popup, and `tabs:navigate` guards for the duration of each flow; restore the prior tab scope afterward.
- Keep explicitly configured private CRM origins available and reject destinations outside the flow scope at both the executor and BrowserView boundary.
- Align all five application package/lock roots and the Browser renderer at 5.1.43.

### Verification
- Browser offline tests, TypeScript build, PHDK coherence and exact-source tenant-scope UAT are recorded in the active PHDK Auto lifecycle.

## v5.1.42 — 2026-10-14 (require tenant scope for Browser RPA)

- Fail closed when a Browser RPA flow lacks its configured tenant origin allowlist.
- Keep validated, explicitly allowlisted private CRM origins available to RPA navigation.

## v5.1.41 — 2026-10-14 (scope vendor frame navigation by tenant)

### Changed
- Enforce the configured tenant vendor-origin allowlist for Electron frame navigations, redirects, and the trusted `tabs:navigate` IPC; allow `about:blank` frames to inherit the already-scoped parent origin.
- Keep explicitly configured private HTTP(S) CRM origins available to that tenant while rejecting unconfigured origins, metadata-service addresses, credentials, and non-web schemes from frame navigation.
- Record the owner-approved client-specific private-destination policy and the PR #122 UAT-036 remote readback in the active PHDK Auto artifacts.
- Align all five application package/lock roots and the Browser renderer at 5.1.41.

### Verification
- API/Cloud regressions pass 36/36 and 16/16; all five product builds pass; Web typecheck, UAT (4/4 files), diagnostics (19/19) and SEO pass; Browser build and offline suite pass 35/35; Landing SEO passes; PHDK coherence is 52/52.
- Browser ESLint could not start: the installed ESLint 10 requires `eslint.config.*`, while this package has no flat config. No lint result is claimed.

### Migration / limitations
- No database migration is required. Real private CRM reachability remains tenant/customer-specific and was not exercised; PostgreSQL identities/persistence, native device/audio, broad accessibility/localization, deployed SEO/AEO, and full CRUD matrix acceptance remain open.

## v5.1.40 — 2026-10-14 (align protected diagnostics route roles)

- Make protected routes support explicit role allowlists in addition to minimum-role checks.
- Restrict `/management/debug` to the roles already authorized by the diagnostics API (`admin`, `superadmin`), so coordinators no longer enter a page whose backend requests are forbidden.
- Add isolated built-SPA UAT for coordinator redirection and administrator access; API responses are synthetic and external requests are blocked.
- Keep API role enforcement unchanged; all five application package/lock roots and Browser renderer align at 5.1.40.

## v5.1.39 — 2026-10-14 (MVP store write contracts and actor attribution)

- Replace untyped API/Cloud MVP configuration bodies with model-specific input contracts and runtime field/type validation.
- Prevent interface and flow-version updates from overwriting IDs, creation times, relationships, and other server-owned fields.
- Derive FlowVersion creator attribution from the current DB actor populated by the resource guard.
- Add mirrored API/Cloud regressions for rejected server-owned fields, invalid values, and actor attribution. Full Auto remains partially delivered.

## v5.1.38 — 2026-10-14 (Cloud escalation actor and tenant parity)

- Align Cloud escalation routes with API: resolve the actor from the current database record, restrict tenant reads/mutations to assigned company teams and sessions, and ignore client-supplied acknowledgement identities.
- Pass the authorized team set into aggregate escalation queries so tenant stats and active lists cannot become global reads.
- Add mirrored API/Cloud regressions for current-DB actor attribution, foreign-tenant denial, role restrictions, and aggregate filtering.
- Cloud build and regressions, API operational tenant regression, and focused Cloud ESLint pass. Persisted database acceptance remains open; PHDK Auto remains partially delivered.
- Align all five application package/lock roots and the Browser renderer at 5.1.38.

## v5.1.37 — 2026-10-14 (typed CRUD request boundaries and Cloud parity)

- Replace untyped CRUD request bodies and actor context with service-derived contracts across API and Cloud.
- Remove Cloud's unused duplicate session-data provider and retire its general audit-log write route to match API's append-only surface.
- Normalize Cloud TTS stream chunks before concatenation; full Cloud lint is clean.
- API build/regressions pass 35/35; Cloud build/regressions pass 14/14. Persistent database acceptance remains open; PHDK Auto remains partially delivered.
- Align all five application package/lock roots and the Browser renderer at 5.1.37.

## v5.1.36 — 2026-10-14 (tenant-scoped device revoke and registration binding)

- Bind pending device registration to the authenticated database actor and require an assigned company; reject client-supplied identity binding and orphan registrations.
- Add a localized, accessible, confirmed device revoke action for tenant managers; keep user and agent pages read-only and preserve safe device summaries.
- Add Device role/API/Web matrix rows, guard assertions, and isolated browser UAT for role visibility, cancel, failure, and successful revoke.
- API DB persistence and live pairing remain unverified; PHDK Auto remains partially delivered.
- Align all five application package/lock roots and the Browser renderer at 5.1.36.

## v5.1.35 — 2026-10-14 (complete Knowledge Base manager CRUD)

- Add company-scoped Knowledge Base detail and update routes in API and Cloud, with input validation and an allowlist limited to name and description.
- Add a localized administration UI for listing, inspecting, creating, editing, and deleting bases; ordinary users remain read-only.
- Add API/Cloud tenant-isolation regressions and extend the synthetic SPA UAT across the management lifecycle.
- API regression 35/35, Cloud 14/14, Web typecheck/build, focused lint, and synthetic SPA UAT pass. Persisted database and live Qdrant acceptance remain open.
- Align all five application package/lock roots and the Browser renderer at 5.1.35.

## v5.1.34 — 2026-10-14 (reconcile current PHDK acceptance evidence)

- Reconcile the active lifecycle, CRUD matrix, and Check report with the merged 5.1.33 Knowledge vector cleanup; distinguish mocked source verification from still-open PostgreSQL, live-Qdrant, and concurrency acceptance.
- Keep the overall PHDK Auto status partial and preserve earlier candidate records as history.
- Align all five application package/lock roots and the Browser renderer at 5.1.34.

## v5.1.33 — 2026-10-14 (remove stale knowledge vectors on CRUD deletion)

- Clean Qdrant vectors by document payload before deleting KnowledgeDocument rows, and remove a knowledge-base collection before deleting its relational record, in both API and Cloud. Qdrant failures preserve the database record.
- Add API/Cloud mirror regression coverage for deletion ordering, missing collections, and Qdrant failure behavior.
- API and Cloud regressions/builds, changed-source lint, and focused tests pass; PostgreSQL persistence and delete/reindex concurrency remain unverified.

## v5.1.32 — 2026-10-14 (truthful and localized tenant knowledge view)

- Remove the fabricated live call transcript, intent/confidence values, and sample RAG matches from the Knowledge page; the screen now shows only API-backed tenant document/status data.
- Localize the Knowledge page and its safe user-facing errors across Spanish, English, and Portuguese; accessible source dialogs use the shared native modal with labeled controls and focus restoration.
- Keep regular users read-only and add synthetic browser acceptance for tenant document visibility, role controls, all three locales, and the dialog keyboard flow.
- Align all five application package/lock roots and the Browser renderer at 5.1.32.

## v5.1.31 — 2026-10-14 (retire shared-secret runtime seed and migration endpoints)

- Retire the shared-secret CRUD webhook and runtime `/api/crud/seed` and `/api/crud/migrate` mutation paths from API and Cloud; legacy routes now return HTTP 410 and direct operators to reviewed Prisma migrations or isolated synthetic regression fixtures.
- Remove seed/migration services, webhook guards and a dormant handler-name bypass in `CrudAccessGuard` that could circumvent DB-derived actor and tenant authorization.
- Add API and Cloud in-process HTTP assertions that retired endpoints return 410, plus cross-backend coverage for deleted alternate write paths.
- Align Cloud CRUD with API policy: reject client-provided user password hashes and deny generic audit-log writes; remove `passwordHash` from Cloud service contracts.
- Align all five application package/lock roots and the Browser renderer at 5.1.31.
- API and Cloud builds pass; API regression 24/24 and Cloud regression 11/11 pass.

## v5.1.30 — 2026-10-14 (default-deny Supabase access and safe fixture provisioning)

- Remove permissive Supabase row policies and auto-seeded sample/superadmin accounts from setup/bootstrap SQL; retire unsafe customer/RBAC/session/CRM fixtures and their guide, make Auth synchronization assign only `user`, gate provider-catalog seeding to an exact nonproduction target, and add an idempotent API/Cloud migration that enables RLS on application-owned public tables and removes legacy broad policies.
- Replace fixed-password synthetic account setup with an explicit nonproduction-only, exact-target-pinned fixture that accepts `@example.test` identities and always assigns role `user`.
- Add static regression coverage for policy absence, API/Cloud mirror parity, and least-privilege fixture configuration.
- Align all five application package/lock roots and the Browser renderer at 5.1.30.
- API regression 22/22 and build pass; Cloud regression 11/11 and build pass; Browser build, Web typecheck/build/diagnostics 19/19, Landing typecheck/build/SEO 1/1, PHDK coherence 52/52, and PHDK remote-baseline gate pass.

## v5.1.29 — 2026-10-14 (redact device configuration from lists)

- Strip provider-bearing RPA configuration and remote Chrome DevTools URLs from normal device-list responses; return presence flags only.
- Extend the in-process Nest HTTP regression to verify safe device projections while preserving the paired-device-only RPA configuration endpoint.

## v5.1.28 — 2026-10-14 (write-only device configuration secrets)

- Restrict raw RPA provider configuration reads to the currently paired device whose runtime token is bound to the requested device ID.
- Deny human user, tenant-admin, coordinator, and superadmin sessions from reading device configuration that may contain provider credentials; keep authorized device provisioning functional.
- Add in-process Nest HTTP regressions for anonymous/human denial, wrong-device denial, and paired-device access.

## v5.1.27 — 2026-10-14 (CRUD scope and flow-step integrity)

- Validate API and Cloud flow-step reorders against the complete, unique set of step IDs belonging to that flow inside one serializable transaction; reject malformed, partial, duplicate and foreign IDs before any update.
- Add matching API/Cloud regression coverage and enforce the 35-model Prisma inventory plus the 126 core resource-role-surface matrix in tests.

## v5.1.26 — 2026-10-14 (audited non-production UAT profiles)

- Add a superadmin-only selector for explicitly allowlisted synthetic UAT accounts in development or staging environments.
- Issue 10-minute profile tokens backed by database audit records; profile changes are revocable, role-limited, and rejected when the operator or profile no longer meets policy.
- Keep test profiles disabled by default and fail closed outside explicit development/staging configuration.
- Add localized Web controls to switch profiles and return to the original superadmin session.

## v5.1.25 — 2026-10-14 (PHDK Auto runtime and tenant security)

- Enforce least-privilege identity and tenant scoping across API, Cloud, Browser, and realtime runtimes; new users default to `user`, with elevated roles derived from the database.
- Encrypt vendor credentials at rest and keep normal responses write-only for secrets; allow private CRM origins only when URL-validated and explicitly allowlisted for the tenant.
- Require authenticated database-backed superadmin access for the global dashboard stream; validate socket/session ownership and fail closed for unregistered named route middleware.
- Remove simulated live-provider success, unsafe synthetic administrator defaults, and an unused schema script that did not apply migrations.
- Align all five application package/lock roots and the Browser renderer at 5.1.25.

### Verification and acceptance
- API/Cloud configured builds and Cloud full typecheck pass; Cloud regression 10/10, API Jest 10/10 suites (31 tests), Browser tests 27/27, Web diagnostics 19/19, SEO source tests 1/1 per app, PHDK v2.50.10 coherence 52/52.
- API/Cloud ESLint: 0 errors (138/25 warnings). Synthetic Web UAT: 1/1 suite, 15 grouped assertions, bound to commit `e7de35752dbb2ed3e9bd3d33fb59cb649cf3c157`.
- Whole-product acceptance remains partial: no disposable DB/migration, native device/audio, broad route accessibility review, deployed SEO/AEO measurement, or owner disposition for audited test-profile selection.

## v5.1.22 — 2026-10-13 (PHDK Auto voice and provider privacy)

- Redact voice transcripts, agent commands, LLM prompt snippets, and provider/decision error details from API/Cloud logs and voice responses.
- Keep diagnostic value with character counts and generic provider failure messages; use a content-free LLM fallback.
- Align all five app package and lock roots at 5.1.22.
- API regression 18/18; Cloud regression 9/9; API/Cloud configured builds; Web typecheck/build; Browser build; Landing typecheck/build; PHDK coherence 52/52.

## v5.1.21 — 2026-10-14 (PHDK Auto tenant-scoped vector writes)

### Changed
- Reject caller-supplied Qdrant point IDs for admin/coordinator vector document creation, preventing an `upsert` from overwriting another tenant's point.
- Preserve server-generated IDs and DB-derived company/team metadata for tenant-scoped document creation; retain superadmin cross-tenant maintenance.
- Add API and Cloud regression coverage for denied direct-ID overwrites and allowed tenant-scoped creation.
- Align all five app package and lock roots at 5.1.21.

### Verification
- API and Cloud resource-scope regressions; full API 15/15 and Cloud 9/9 regressions and configured builds; Web typecheck/build; Browser/Landing builds; PHDK coherence 52/52.
- Focused API ESLint produced no output and was stopped; this check remains unverified.

### Migration / limitations
- No migration required. Qdrant persisted ownership cannot be verified without an owner-managed disposable vector store; no live vector service was contacted.

## v5.1.20 — 2026-10-14 (PHDK Auto listening-session security)

### Changed
- Require a DB-derived assigned runtime identity before creating Cloud listening sessions.
- Use a full UUID capability for websocket admission and enforce the advertised one-hour expiry, removing expired entries as sessions are created.
- Stop logging listening-session capability IDs in Cloud/API worker logs and Web diagnostics.
- Add Cloud regression coverage for authenticated session creation contract, capability entropy and expiry.
- Align all five app package and lock roots at 5.1.20.

### Verification
- Cloud regression 9/9 and configured build; API regression 15/15, configured build and focused ESLint; Web typecheck/build and diagnostics 18/18; Browser and Landing builds; PHDK coherence 52/52.
- Standalone Cloud `build:typescript` still fails on 20 pre-existing errors outside this change; the configured Cloud build passes.

### Migration / limitations
- No migration required. Listening sessions remain in-memory process-local capabilities; deployed multi-instance behavior and client-specific audio acceptance remain external runtime checks.

## v5.1.19 — 2026-10-13 (PHDK Auto privacy fix)

### Changed
- Restrict provider/RPA catalogs and detailed runtime diagnostics to company managers and superadmins; ordinary user, agent and guest roles are denied.
- Return only service availability to admin/coordinator; reserve uptime, Node version, memory, stack and dependency details for superadmin.
- Hide detailed diagnostics panels in the management UI when the API reports the reduced projection; add HTTP and synthetic UI role regressions.
- Align all five app package and lock roots at 5.1.19.

### Verification
- API and Cloud regression (15/15 and 8/8) and builds; Web typecheck/build, diagnostics 18/18 and mocked local UAT 1/1; Browser and Landing builds, Landing SEO 1/1; PHDK coherence 52/52. Focused ESLint passes on the API source copy.

### Migration / limitations
- No migration required. UAT uses mocked APIs; live persistence, native acceptance, broad accessibility and deployed SEO/AEO remain open.

## v5.1.18 — 2026-10-13 (PHDK Auto security fix)

### Changed
- Make audit logs append-only through the CRUD surface: remove the unused general-purpose POST endpoint and reject every non-GET audit-log request in the API guard.
- Preserve trusted audit writes from the request interceptor and internal domain services; keep audit-log listing superadmin-only.
- Add regression coverage for the forged-write denial and document the source exception in the PHDK CRUD matrix.
- Align all five app package and lock roots at 5.1.18.

### Verification
- API regression 15/15 suites and build; Cloud, Web, Browser and Landing builds; Web typecheck, diagnostics 18/18 and mocked local UAT 1/1; Landing SEO 1/1; PHDK coherence 52/52.

### Migration / limitations
- No migration required. Full persisted CRUD, native runtime, broad accessibility and deployed SEO/AEO acceptance remain open.

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
# v5.1.51 — remove false API integration and execution success

- Remove mock Browser/CRM/voice step successes from the API SubAgent flow runner; only supported local decision/wait steps execute, unsupported tenant adapter steps fail closed, and each run records its completed/failed result.
- Make the in-memory integration health catalog report failure when no tenant provider adapter is configured; remove synthetic connection/sync success and background health timers.
- Report only the current Node process from API process monitoring rather than fabricated system processes.
- Close the remaining API ESLint baseline: full `services/api` lint passes with 0 warnings and 0 errors, including unused-variable and redundant-union cleanup.
- Align API, Cloud, Browser, Web, Landing package/lock versions and Browser renderer to 5.1.51.

### Verification

- API and Cloud builds and regressions pass (API 36/36, Cloud 16/16); all five product builds pass.
- API full lint, Web and Landing typecheck/lint, Browser lint, Browser offline tests 27/27, diagnostics 19/19, synthetic Web UAT 4/4, Web/Landing SEO 1/1 each, and PHDK coherence 52/52 pass.
- Web/Landing production builds complete with the existing large-chunk warning. No customer endpoint, private CRM, database, native device, or deployment was used; whole Auto remains partially delivered.\n
## v5.1.79 — report unmeasured dependency health truthfully

- Replace unconditional `ready` responses for unprobed TTS, STT and AI health with `unknown` in API and Cloud monitoring, and keep overall health unknown until dependency probes exist.
- Initialize Web and Landing monitoring state as unknown so the dashboard does not imply readiness before the first server report.
- Align the five application package/lock roots and Browser renderer at 5.1.79.

### Verification
- API and Cloud monitoring unit tests pass 2/2 each; full regression runners pass API 42/42 and Cloud 19/19.
- Targeted API/Cloud ESLint, API/Cloud production builds, Web/Landing typechecks and production builds, full Web UAT (8 suites plus admin-settings/theme-template/AI-admin), Browser build/version sync and Browser renderer tests 4/4 pass.
- PHDK coherence passes 63/63; all five package/lock roots and Browser renderer align at 5.1.79.

### Migration / limitations
- TTS/STT/AI health probes remain unimplemented. Their status is intentionally `unknown` until measured; this change does not claim runtime health or persistence acceptance.
## v5.2.0 — 2026-10-17

### Added
- Add tenant-owned managed interface catalogs and an Admin/Coordinator team selector. Catalog reads, interface assignments and team targets are derived from the authenticated database company; tenant users cannot read the platform catalog, assign foreign interfaces or teams, or see credential values. Existing global assignments remain managed by superadmin.
- Add a guarded Company Co UAT Prep seeder for synthetic role/tenant identities and authentication checks. The seeder requires explicit confirmation, development/test mode, a dedicated loopback PostgreSQL database and ownership-safe cleanup.

### Verification
- API regressions 45/45 and Cloud regressions 21/21; API and Cloud builds/typechecks pass.
- Prisma API/Cloud schemas validate and clients generate; Web lint/build pass.
- Live database migration/seeding and browser UAT remain blocked by the unavailable isolated PostgreSQL runtime and are not claimed as passed.

\n
