# PHDK Check — 5.1.8 integrated source; acceptance partial

Date: 2026-10-13 America/Mexico_City · PHDK 2.50.10 · Auto goal `20261012-keledon-four-fronts`.

## 2026-10-13 follow-up source audit — candidate 5.1.8

The role/tenant CRUD review found a credential-integrity gap: `/api/crud/users` accepted a client-provided `passwordHash` and forwarded it directly to Prisma. An in-company manager could therefore choose the bcrypt hash for a newly created user's password. PR #56 now integrates the fix at `f44f76a8bfb46e4ef60bfbe99982a8d787bc00a6`, version 5.1.8. The guard rejects that field on both POST and PUT for all roles, and service input types no longer expose it. `services/api/test/regression/25-approved-management-policy.test.js` covers admin/coordinator create/update and superadmin create attempts. API typecheck and all 11 API regression suites pass; full API typed ESLint exits 0 with 0 errors/139 warnings. PR #55 was closed without merge due to stale squash ancestry; PR #56 is the clean-based merged delivery.

The previous 5.1.7 baseline was PR #54 at `a854ca7634307538305cd9b5ad1f91f8a066b1a1`; the latest 5.1.8 source audit fix is PR #56 at `f44f76a8bfb46e4ef60bfbe99982a8d787bc00a6`. All five app package/lock roots report 5.1.8. PR #55 was closed without merge; no required hosted checks/review or branch protection applied to #56. No deployment is claimed.

## Current source evidence

- API typed ESLint passes 184 source files (0 errors/139 warnings); API full-source typecheck, production/C13 build and regression 11/11 pass.
- Cloud build/regression 8/8, web typecheck/build, diagnostics 18/18 and SEO 1/1, Landing typecheck/build/lint, Browser regressions 19/19 pass. PHDK coherence passes 52/52.
- Fresh local Edge UAT on the 5.1.7 tree passes 1/1 suite with synthetic Company Co fixtures and intercepted APIs. See root `UAT_REPORT.md` and `docs/phdk/evidence/uat-local-web.json`.
- API startup removes automatic migration rollback, fails closed on migration/company-count errors and Docker invokes the checked-in entrypoint. Full details are retained below and in `docs/phdk/lifecycle/20261012-keledon-four-fronts/70-check/PHDK_CHECK_REPORT_5.1.7.md`.

## Open applicable findings

- Full persisted CRUD by resource × role × tenant × operation × surface, direct-ID DB-backed sessions and deployed migration ledger/runtime are unverified. No local Docker/PostgreSQL service was available; no production DB/migration was accessed.
- Native Electron rendering/device/microphone/audio requires Windows device acceptance.
- Broad route/theme/locale/accessibility, zoom, contrast and screen-reader acceptance remains incomplete; current local UAT covers only specified flows and viewports.
- Deployed SEO headers and AEO/GEO visibility remain unverified. Source SEO test is not deployed evidence.
- Client-selected integrations remain provider-independent in source; no live vendor was contacted.

Check: **SOURCE CHECKS PASS; ACCEPTANCE PARTIAL.** Gate evidence is machine PASS for stated checks, but the full Auto portfolio remains **PARTIALLY DELIVERED** until the open acceptance is collected or explicitly dispositioned. Exact next actions are in `UAT_REPORT.md` and `PHDK_COMPLETION_AUDIT.md`.

---

## Remediation verified

- API startup no longer issues unconditional `prisma migrate resolve --rolled-back` commands. Docker copies and runs checked-in `services/api/start.sh` instead of generating a divergent script.
- After five failed `migrate deploy` attempts the API refuses to start, before seeds. If the company-count query fails, startup refuses to seed or start rather than treating the error as an empty database.
- API lint is non-mutating; typed lint rules remain enabled through TypeScript Project Service and the canonical API tsconfig includes all `src/**/*.ts` files. The missing Prettier peer is now explicitly pinned at 3.9.9; API formatting follows the existing `.prettierrc`.
- API production/C13 build PASS; regression suite PASS 11/11; startup success/migration-failure/count-failure/Docker-wiring regression PASS; shell and harness syntax PASS; ESLint config resolution PASS.
- Cloud production/C13 build and regression PASS 8/8. `services/web` typecheck/build PASS, diagnostics 18/18 and SEO 1/1 PASS; lint exits 0 with 134 warnings. Landing typecheck/build/lint PASS. Browser regressions PASS 19/19. Frontend builds report large minified chunks (699 kB and 577 kB).
- Full-source API typecheck initially showed eight errors; all now pass. The final broken import was in duplicate, unreferenced legacy `MinimalCloudServer` entrypoints/manifests. Repository history shows their CloudServer dependency had already been removed during the Supabase-only migration; production Docker uses Nest `dist/main`, so stale entrypoints/manifests and TS references were retired.

## Check blockers and limits

- API full typed ESLint now **PASSES** over all 184 source files with 0 errors and 139 warnings. The prior stall came from `eslint-plugin-prettier` requiring Prettier as a peer when the API package did not install it. Pinning Prettier 3.9.9 and applying the existing `.prettierrc` resolved the stall; no lint rules were disabled. Nine surfaced rule errors were corrected in source.
- Existing synthetic 5.1.6 browser/PostgreSQL UAT is not 5.1.7 deployed runtime proof. The 5.1.7 startup shell is exercised only with isolated synthetic command mocks.
- Exhaustive persisted CRUD by resource × role × tenant × operation × surface, production database migration ledger/runtime, native Electron/device/audio, broad accessibility/localization, and deployed SEO/AEO remain incomplete. Client-selected integrations remain provider-independent in source; no live vendor was called.
- Bounded Railway logs for the base deployment reported seven migrations/no pending work and showed the old startup marking `20260529220000_add_rpa_provider_config` rolled back. Logs are not a direct database read; no production DB or migration was accessed.

Check: **SOURCE CHECKS PASS; ACCEPTANCE PARTIAL.** API typed ESLint and available automated source gates pass. Remaining persisted CRUD, native runtime and deployed acceptance evidence stays open; deliver the code through a versioned PR and keep PHDK Auto **PARTIALLY DELIVERED** until those items are verified. Detailed evidence: `docs/phdk/lifecycle/20261012-keledon-four-fronts/70-check/PHDK_CHECK_REPORT_5.1.7.md`.

---

# Historical PHDK Check report — KELEDON 5.1.5 / PHDK 2.50.10

Date: 2026-10-13 America/Mexico_City. Run: `20261012-keledon-four-fronts`. Product PR #49 merged on KELEDON `main` at `fc114099cd805dd90d8ba1f3bdcddbcb54d464ba`; all five app package/lock roots are 5.1.5. PHDK central v2.50.10 and all 52 installed coherence mappings pass.

The four owner-confirmed fronts remain in scope. Voice/CRM providers vary by tenant. The restrictive DB-derived role/tenant and write-only-secret policy is owner-approved and remains in force.

## Verified code and checks

- API and Cloud production builds pass; API regression is 10/10 and AI-unavailable-path tests are 3/3. Cloud bcrypt hash/verify and UUID v4 smoke checks pass.
- Web build/typecheck pass; diagnostics tests 18/18 and SEO source test 1/1 pass. Browser security tests pass 5/5; Windows x64 Squirrel package generation succeeds.
- Local built-SPA UAT on verified revision `fc114099cd805dd90d8ba1f3bdcddbcb54d464ba` passes 1/1 suite and nine synthetic browser journeys. Evidence includes candidate version, responsive login, copy/reset behavior, theme persistence, role views, tenant-scoped assignment, write-only key behavior, guest denial and explicit safe diagnostics. API calls were intercepted.
- Production `npm audit --omit=dev` reports zero vulnerabilities in Browser, Cloud, landing, API and web. Moderate advisories remain in development/build-only trees.
- PHDK v2.50.10 is installed; all 52 manifest mappings match canonical upstream byte-for-byte. Coherence passes. The current physical-line inventory covers 1,077 source/test files with none at or above 600 lines.
- ESLint passes for the changed UAT test, web (0 errors/134 warnings), and landing. API-wide ESLint produced no output in a bounded run and remains BLOCKED.

## Open acceptance findings

- Persisted resource × role × surface × CRUD and database/migration runtime remain unverified. Docker/Postgres were unavailable locally; no production DB was used.
- Native Electron rendering, device/microphone/audio, broad route/theme/locale/screen-reader acceptance and full-app contrast remain unverified.
- Deployed SEO headers/canonical behavior and external AEO/GEO visibility remain unverified. Client-specific live provider calls were not attempted.

## Gate conclusion

The local production-SPA acceptance and production dependency audits pass; the full PHDK gate remains BLOCKED by API-wide lint and the acceptance findings above. No production database, customer data, live provider, application probe or deployment was used.

Overall status: **PARTIALLY DELIVERED**. Product PR #49 and the previous standards/readback PRs are merged; no full live acceptance or deployment is claimed.
