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
- Web/Landing production builds complete with the existing large-chunk warning. No customer endpoint, private CRM, database, native device, or deployment was used; whole Auto remains partially delivered.
