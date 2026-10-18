# UAT retest status — 5.2.12 header spacing (2026-10-18)

UAT-142 is **PARTIAL** on production v5.2.11: all four targets pass at 44 px and the page has no horizontal overflow, but the fixed header overlays the H1 by 29.3 px at 320×720. Candidate source repair reserves additional top spacing (`pt-40`).

UAT-145 is **PENDING_DEPLOYMENT** for production v5.2.12. Required: fresh anonymous `/login`, measure header bottom and `#login-heading`, confirm no rectangle intersection, retake the four control sizes and document width, inspect AX names/screenshot, reset viewport. Do not submit forms, log in, activate OAuth, diagnostics or cache controls. Evidence for the finding: `../../../../50-uat/evidence/uat-142-production-login-mobile-2026-10-18.json`.

---

# UAT retest — run `20261014-0007-phdk-auto-completion`

## Candidate v5.2.11 — UAT-141 mobile login target-size remediation

UAT-141 found four undersized controls on anonymous production `/login` at 320×720 (brand link 40px, email 41px, password 41px, signup toggle 20px); layout reflow passed. Candidate source applies 44px minimum height to the home link and signup toggle and 44px height to both fields. UAT-142 has not run: it requires reviewed merge and deployment of the candidate, then a production-only geometry and no-overflow retest. No local application tests, build or lint were run. Evidence: `../50-uat/evidence/uat-141-production-login-mobile-320-2026-10-17.json`.

## Latest retest — Knowledge document/base delete on 5.1.52

Sequential deletion retest passes against disposable PostgreSQL 16.15 and loopback Qdrant 1.19.2 with synthetic data. Document API delete removed the document row and matching points; base API delete removed the collection and base/cascaded document rows. Read-only SQL was used to verify the base rows because individual base GET is denied (403) to this test role. Evidence: `../50-uat/evidence/uat-qdrant-delete-5.1.52.json`. Concurrency with reindex was not tested; this is scoped pass, not a closure of the complete CRUD matrix.

The overall formal tally is **40 PASS, 0 BLOCKED, 1 MANUAL**. The remaining manual item is native Electron/device/audio; broad accessibility/localization and deployed SEO/AEO are not yet accepted.

Date: 2026-10-14. Candidate: 5.1.26 on `fix/audited-uat-test-profiles`, based on `8dfc1fca7de253a017acb6f291ff278699915beb`.

- `services/web npm run test:uat`: PASS, one built-SPA suite; UAT-008 selects a configured synthetic profile, displays bounded temporary mode and returns to original admin session. Mocked API; no live login.
- `services/api npm run test:regression`: PASS, 20/20 suites; includes policy/service/AuthGuard and in-process Nest HTTP tests for current-superadmin authority, allowlist/role checks, audited start/end, expiry, token revocation and return. Tests use isolated fixtures, not a persistent DB.
- `npx eslint` on changed web files: 0 errors, 1 existing Fast Refresh warning.

UAT-008 is PASS within this scope. UAT-009 and UAT-010 remain BLOCKED; UAT-006 remains MANUAL/BLOCKED. Whole-product UAT remains NOT ACCEPTED. The browser evidence uses intercepted APIs and synthetic tenants; no deployment, customer data, production DB, real identity, audio device or provider was used.
