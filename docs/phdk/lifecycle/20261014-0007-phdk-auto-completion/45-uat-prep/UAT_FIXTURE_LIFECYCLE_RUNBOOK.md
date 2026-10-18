# Audited production fixture lifecycle — 5.2.13 candidate

Status: implementation present; authenticated production acceptance NOT RUN. No production fixture has been created by this change. The older PHDK-only security-review label does not block implementation under the current explicit Auto Force mandate. Source infrastructure does not prove runtime acceptance.

## Contract and authority

Only an existing active DB superadmin operates `/api/admin/uat-fixtures` through the normal authenticated API or the superadmin section of `/admin/settings`. There is no production test-as, bypass token, privileged synthetic user, invitation, email send, provider setting write or scheduler. The server rereads actor authority inside the mutation transaction. New lifecycle fields are additive and NULL for ordinary accounts.

Normal first-party registration/login remains the sole synthetic-user authentication mechanism. Prepare exactly two unused regular accounts with reserved identifiers `phdk-uat-<unique-suffix>@example.invalid`, without actual mailboxes/customer data. Keep their credentials entirely in the authorized browser/password store; never in chat, logs or evidence. Account creation is not safe to execute until the administering session and retirement path are available. The service accepts only reserved identifiers, password-backed accounts, no prior tenant/run assignment and no existing devices/sessions/agents. It neither creates nor returns credentials.

Create input: `{runId: "phdk-uat-<UUIDv4>", userIds: ["synthetic-user-A-ID", "synthetic-user-B-ID"], ttlHours: 1}`. Only these fields are accepted; TTL is an integer 1..24 hours, default UI proposal is one hour. Generate/preserve the same runId across retries. A matching retry returns the original manifest without extending TTL or creating anything. A DB lock and serializable transaction protect capacity, ownership, resources and durable audit. Audit failure rolls back the transaction; PostgreSQL concurrency conflicts must not be interpreted as success.

The entire retained set is capped at one two-tenant run. A retired/expired run still occupies that capacity; do not create replacements to bypass the owner-approved two-tenant bound. Physical deletion/reuse needs a separately reconciled safe cleanup procedure. No hard delete is implemented or executed.

Each tenant receives minimal Company/Brand/Team, its regular user, one inactive agent and one pending Browser device with no token/pairing code. Only Team A receives one inactive, empty/no-PII Flow. No vendor/CRM/private origin, provider credential or live action is configured. Team provider defaults are not exercised. Fixture account bindings and roles cannot be changed through generic user CRUD.

## Operator sequence and required evidence

1. After verified deployment, use the existing superadmin session to open `/admin/settings`; no elevated testing identity is provisioned. Supply the two existing regular synthetic user IDs, retain the runId and select one hour. Check the synthetic-account confirmation and choose Prepare environment. No password or token is entered in this panel.
2. Consult the same runId after a timeout before retrying. Record only generated resource IDs, expiry/status and the durable `UAT_FIXTURE_CREATED` audit action. Verify exactly two tenants, two regular users, two devices and one inactive flow on A.
3. Log into each synthetic account normally after preparation. Pre-provisioning bearer tokens are rejected. Exercise approved tenant negatives/inert cases only; no voice, CRM mutation, private egress, invitation or customer data. Explicitly record which cases run and which remain blocked.
4. POST `:runId/retire` or use Retire and revoke access. It marks accounts retired, rotates their auth boundary, revokes device tokens/codes, deactivates agents/flow and writes `UAT_FIXTURE_RETIRED` in one transaction. Repeat is idempotent. Records remain isolated for reversible retirement and auditing.
5. Confirm old HTTP tokens, normal login, device-token validation/pairing and runtime actions are denied. Already in-flight effects are not claimed cancelled by a TTL check. No live effects are authorized for these inert fixtures.
6. Before original expiry, POST `:runId/restore` or use Restore accounts. It does not extend TTL, restore device secrets or reactivate agents/flow. A fresh normal login is mandatory; an old bearer must remain rejected. Expired runs cannot be restored. Retire again immediately after acceptance and verify the logical cleanup.
7. Verify expiry denies new account/device/runtime access without a scheduler. Do not call a successful deploy or an anonymous 401 proof of these authenticated cases.

Remaining prerequisite: an authenticated existing superadmin able to prepare/retire the reserved synthetic identities. Do not request personal passwords or bearer tokens in chat, use a customer's data/identity as the fixture, or grant privileged synthetic roles. Without that session, anonymous denial checks remain independent and permitted.

## Boundary regression sources

`account-lifecycle.policy.spec.ts` covers normal-account compatibility, expiry/retirement and old-token rejection after restoration. `uat-fixtures.service.spec.ts` covers unexpected privilege fields, TTL, DB-derived superadmin, two-tenant capacity, customer-identity rejection and idempotent retry. `browser-commands.service.spec.ts` covers lock ordering, explicit device target precedence and server-owned result metadata. These sources are NOT EXECUTED locally under the current owner instruction. Real DB rollback/concurrency, authenticated roles and lifecycle acceptance require the deployed synthetic run above.
