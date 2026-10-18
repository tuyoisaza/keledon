# Source integration review — 5.2.16 admin interface deep-link repair

## Finding and repair

Production UAT-150 on 5.2.15 proved `/admin/interfaces` returned the static 404 while the existing `/management/teams` route loaded the SPA and redirected to login. The current app bundle and `AppRouter.tsx` contain the catalog route and a `superadmin` `ProtectedRoute`. The actual gap was `services/web/nginx.conf`: its explicit `known_spa_route` allowlist did not include the new path, so Nginx returned 404 before React Router could enforce the role guard.

The 5.2.16 candidate adds the exact `/admin/interfaces` path to that allowlist. It does not broaden the matcher or make new paths public. The `AppRouter.tsx` superadmin guard remains the application authorization boundary. The Nginx route regression now asserts the existing `@spa` fallback and the catalog allowlist/guard relationship.

## Review result

PASS for bounded source repair and route security shape. Unknown/unlisted paths still receive the static 404; the new path is forwarded through the existing noindex SPA fallback. No API, credentials, tenant ownership or database behavior changed. Static `git diff --check` and PHDK coherence were performed; application tests/build/lint were not run under the owner's explicit production-only restriction. The test source is authored but not executed locally.

## Production retest

PR #267 is merged as `ac5d91867105773bf02f5ba41b23263b87256aa7`; Web deployment `5c158bc5-99c2-43d3-80d2-650f42dcba00` is `SUCCESS`. Production retest on a fresh anonymous Chrome tab navigated directly to `https://keledon.tuyoisaza.com/admin/interfaces`, loaded the SPA, resolved to `/login`, and displayed v5.2.16. UAT-150 passes this scoped route/guard check. Authenticated superadmin CRUD, tenant denial and persistence remain separate acceptance cases requiring an existing approved superadmin session and synthetic tenant fixture.
