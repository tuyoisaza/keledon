# UAT authentication plan — KELEDON

## Candidate and authentication architecture

- Candidate: 5.1.78, pull request #198, local source candidate. No deployed candidate or database-backed UAT target is configured for this run.
- Product is multi-tenant. The API authenticates a proprietary two-part HMAC-SHA256 bearer credential; it is **not a JSON Web Token** and must not be described as JWT. Normal sign-in issues seven-day tokens. The API now resolves the token subject, email, and role from the current user row on every protected request. Tenant and resource guards must continue to resolve effective company/team scope from persistence.
- Email/password and Google OAuth are the supported login paths. Google verifies the provider ID token, verified email, state, and nonce. The callback now exchanges the provider result for a short-lived, single-use opaque code, returned in the URL fragment; the browser removes the fragment and exchanges the code by POST. Only a hash of that one-use code is persisted. The resulting application token is returned in the POST response and held in tab-scoped `sessionStorage` as before.
- `KELEDON_AUTH_SECRET` signs application tokens and OAuth state. Production startup fails if it is absent. It must remain in the host secret facility and must never be copied into this plan, test output, browser state, or chat.

## Synthetic identity and role mapping

Use only already provisioned Company Co and Other Co synthetic accounts with reserved `.invalid` emails. Map personas to actual database records and effective memberships at run time; do not infer privileges from fixture names or token claims.

| Persona | Source role / scope | Required proof |
| --- | --- | --- |
| Platform administrator | `superadmin`, current DB role | Login or authorized test-profile bootstrap, global action, audit attribution, return to original actor |
| Tenant administrator | `admin`, one company | Tenant-owned administration allowed; foreign company and role elevation denied |
| Coordinator | `coordinator`, assigned team/company | Assigned scope allowed; forged role/company claims and foreign records denied |
| Ordinary staff | `user` or `agent`, assigned account/team | Ordinary permitted journeys and all administrative actions denied |
| Anonymous / suspended or deleted identity | No valid current actor | Protected route denied; deleted identity loses access before its signed token expiry |

Do not provision a persona unless its synthetic account and membership already exist in the isolated target. No email or bulk notification is part of this plan.

## UAT bootstrap, isolation, and lifecycle

1. Prefer a dedicated non-production identity-provider tenant and real supported login when one is configured.
2. The existing UAT-only `Ver como` facility may be used only when `KELEDON_ENABLE_UAT_TEST_PROFILES=true`, deployment is explicitly `development` or `staging`, the allowlisted profile IDs identify reserved `.invalid` users, and the current actor is a database-confirmed superadmin. It issues a ten-minute reduced-profile token, records actor/session boundaries, and checks actor, target, expiry, and revocation on each request. Production is excluded by code.
3. This candidate has no configured authorized provider test tenant, disposable PostgreSQL target, or browser-authenticated environment. Therefore real login, persistence-backed persona coverage, provider SSO, and database migration are BLOCKED; no synthetic token is hand-authored to claim those cases.
4. Source tests use in-process persistence fixtures. Browser UAT uses the local production Web build, synthetic response fixtures, loopback only, and blocks outbound HTTP/WebSocket traffic. The Google callback exchange is tested with a synthetic code and intercepted API response; it does not contact Google or authenticate a real account.
5. End a UAT profile through the guarded return route; verify its audit end event. Close browser contexts, remove temporary auth state, and do not save tokens, cookies, or storage state as evidence.

## Required negative cases and proof

- Reject malformed, tampered, and expired application tokens; reject deleted users; derive current role/email from the database even when signed claims are stale or forged.
- Google OAuth requires a valid browser-bound state cookie, nonce, and verified provider email. Its callback must not put an application bearer token in a query string. The exchange code is short lived, stored only as a hash, and redeemable once even under concurrent exchange attempts.
- UAT profile selection requires a current database superadmin, explicit non-production enablement, a configured profile allowlist, and an eligible synthetic target. Verify expired and ended profile tokens fail, tenant boundaries remain enforced, and return restores the original actor.
- Never mark any persona PASS from source inspection or intercepted browser fixtures alone. Record exact revision, case, synthetic subject, tenant, mechanism, verdict, cleanup, and redacted evidence reference in `UAT_ACCESS_REPORT.md` / `UAT_AUTH_EVIDENCE.md`.

## Candidate result

The source-level regressions cover current-database actor resolution, OAuth state/nonce/verified-email validation, one-use exchange-code expiry and replay, and test-profile policy. The local browser case covers fragment removal, POST exchange, and session handoff using intercepted synthetic responses. No live OAuth provider, isolated account, PostgreSQL-backed login, deployed URL, native session, or customer data was used. Those external cases remain BLOCKED or MANUAL until an authorized non-production target is available; the current backend candidate does not require them to validate the Cloud managed-AI route.
