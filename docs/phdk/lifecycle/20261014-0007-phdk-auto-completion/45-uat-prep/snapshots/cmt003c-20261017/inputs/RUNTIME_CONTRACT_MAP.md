# CMT-003 — mapa de contrato de runtime por tenant (revalidación 5.2.6)

Run: `20261014-0007-phdk-auto-completion`
Product candidate: KELEDON **5.2.6**, source `e7257a7d0c66c8b34e6bbb7028c30be092f33102`
Production readback: Railway Web deployment `874b29df-7c7d-4e3b-a41d-8ec7339bfde8` SUCCESS; API deployment `da84fde5-06fd-4bc8-be2f-2cafe409d979` SUCCESS (readback recorded for this source).
Source review: 2026-10-17 · static source inspection only · no application tests/builds, DB writes, Browser actions, CRM requests or customer data.
Status: **TWO SECURITY/RELIABILITY GAPS CONFIRMED; PRODUCTION ACCEPTANCE BLOCKED ON SYNTHETIC FIXTURE PREPARATION**

## Revalidated runtime boundaries

| Slice | Current source behavior | Gap / gate |
|---|---|---|
| Device → API | Browser poller uses authenticated device token and device ID; API runtime guard resolves actor/device context and `BrowserCommandsService.requireAccessibleDevice()` reloads user/team/company from DB. | Cross-tenant production behavior has not been exercised with authorized synthetic tenants/devices. |
| API command queue | `getNextCommand()` loads active sessions for actor user/team, selects an issued command, then appends `browser.command.claimed`. `findNextPendingCommand()` excludes every prior claim for that device, with no lease expiry, heartbeat or started state. Selection and append are separate operations, so two workers can select the same command concurrently. | Crash after claim can orphan a command; concurrent workers can both receive it. Result duplicate lookup and result append also lack a command-specific unique constraint/atomic transition. `Event` stores JSON payload; there is no lease table/model. |
| Browser command execution | `browser/src/command-poller.ts` prevents overlapping polls within one process and reports command result after handler completion. No authenticated start/heartbeat/lease token is present in the reviewed result contract. | Process-local `pollInFlight` does not fence multiple devices/workers or late results. Duplicate result storage does not prevent a duplicate CRM side effect. |
| Tenant destination policy | API validates HTTP(S) origin allowlists in `services/api/src/vendor-url-policy.ts`; Browser `security-policy.ts` compares configured origins for navigation/requests. `tab-manager.ts` uses `will-navigate`, `will-redirect` and `session.webRequest.onBeforeRequest`. | These checks do not observe resolved A/AAAA results, pin Chromium's connection to a validated address or enforce a tenant CIDR at socket time. Origin comparison alone cannot close DNS-rebinding/redirect SSRF. |
| Customer adapter | Provider/CRM/flow remain tenant-specific. No universal vendor, destination, credentials or CRM operation semantics are assumed. | No selected client sandbox, DNS sandbox, approved host/port/CIDR or synthetic tenant/device fixture is available in this run. |

## Required transition

- CMT-003A: keep commands fail-safe; design a database-backed atomic lease/fencing contract, started/ambiguous-effect state, at-most-once reconciliation and adapter-scoped idempotency. Do not automatically retry CRM mutations without an idempotency contract. Implementing schema transitions requires a compatible migration and production UAT cases.
- CMT-003B: maintain private egress closed until a broker/proxy or equivalent at the actual socket boundary validates each DNS answer, fixes the validated connection, preserves TLS/SNI and revalidates redirects. Do not claim Electron origin interception is IP pinning.
- CMT-003C: prepare two isolated synthetic tenants/devices, an inert workflow and controlled DNS/CRM sandbox, using existing authenticated/audited admin routes and verified cleanup. No public fixture endpoint, permanent seed secret, direct DB write, customer host or production CRM call.
- Run Q-LEASE-01..Q-TENANT-06 and NET-DNS-01..NET-PRIVATE-06 only on the deployed production candidate after the concrete fixture provisioning and cleanup are authorized and available. No local application tests/builds under the owner instruction.

## Evidence and limits

Inspected: `services/api/src/browser-commands/browser-commands.service.ts`, `services/api/src/browser-commands/browser-commands.controller.ts`, `services/api/prisma/schema.prisma` (`Session`/`Event`), `browser/src/command-poller.ts`, `browser/src/security-policy.ts`, `browser/src/tab-manager.ts`, `services/api/src/vendor-url-policy.ts`, and the runtime/auth flows mapped in the historical `20261017-runtime-contract/RUNTIME_CONTRACT_MAP.md`.

This source review is not runtime acceptance. No test account/device was created; no production database or private endpoint was contacted. CMT-003 remains ACTIVE / PARTIAL.
