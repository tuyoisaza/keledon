# Source integration review — 5.2.16 admin interface deep-link repair

## Finding and repair

Production UAT-150 on 5.2.15 proved `/admin/interfaces` returned the static 404 while the existing `/management/teams` route loaded the SPA and redirected to login. The current app bundle and `AppRouter.tsx` contain the catalog route and a `superadmin` `ProtectedRoute`. The actual gap was `services/web/nginx.conf`: its explicit `known_spa_route` allowlist did not include the new path, so Nginx returned 404 before React Router could enforce the role guard.

The 5.2.16 candidate adds the exact `/admin/interfaces` path to that allowlist. It does not broaden the matcher or make new paths public. The `AppRouter.tsx` superadmin guard remains the application authorization boundary. The Nginx route regression now asserts the existing `@spa` fallback and the catalog allowlist/guard relationship.

## Review result

PASS for bounded source repair and route security shape. Unknown/unlisted paths still receive the static 404; the new path is forwarded through the existing noindex SPA fallback. No API, credentials, tenant ownership or database behavior changed. Static `git diff --check` and PHDK coherence were performed; application tests/build/lint were not run under the owner's explicit production-only restriction. The test source is authored but not executed locally.

## Production retest

Pending normal PR merge and Web autodeploy. Repeat anonymous navigation to `https://keledon.tuyoisaza.com/admin/interfaces`; expected: SPA loads and its superadmin guard redirects to `/login`. Authenticated superadmin CRUD, tenant denial and persistence remain separate acceptance cases requiring an existing approved superadmin session and synthetic tenant fixture.
