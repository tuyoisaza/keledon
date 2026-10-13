# UAT report — KELEDON 5.1.5 candidate

Status: **SCOPED LOCAL ACCEPTANCE PASS; FULL ACCEPTANCE INCOMPLETE**

- Candidate source revision: `fc114099cd805dd90d8ba1f3bdcddbcb54d464ba` (verified remote `main`, product PR #49 merged).
- Target: built production SPA in local headless Edge/Chromium at `http://127.0.0.1`; external network blocked; Company Co and Other Co fixtures used; all API routes intercepted with synthetic responses.
- Result: `npm run test:uat` passed 1/1 suite and nine scoped browser journeys. It covers candidate version/copy behavior, login and responsive layout, clipboard feedback, app-owned reset, theme persistence, synthetic admin/coordinator/superadmin views, same-company team assignment, write-only provider keys, guest denial, and safe diagnostics. See `docs/phdk/evidence/uat-local-web.json` and the `uat-login-*.png`, `uat-admin-*.png`, and `uat-coordinator-*.png` screenshots in the same directory.
- The UAT test now reads the expected app version from `services/web/package.json`; a guest-redirect race was repaired and the final run passed on the source commit above.

This is not live backend or DB acceptance: API calls were intercepted. Persisted CRUD/migration, production authentication, actual Electron rendering/device/audio, full-app accessibility/localization, deployed SEO/AEO, and client-specific call/CRM behavior remain unverified. Separate API security tests cover selected server guards but do not close the persisted resource matrix. No production data, migration, paid provider call, application deployment, or production endpoint was used.
