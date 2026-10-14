# Integration Review — admin/auth/provider candidate

## Continued security review — 2026-10-14, candidate 5.1.31

PR #102 retires the API/Cloud shared-secret CRUD webhook, runtime file seed and DDL paths, and removes the dormant `handler === 'webhook'` bypass from both `CrudAccessGuard` mirrors. Review also strengthened `22-admin-http-wiring.test.js` in both backends to exercise authenticated superadmin requests and assert HTTP 410 for `/api/crud/seed` and `/api/crud/migrate`; regression 35 verifies no bypass remains. API and Cloud builds pass, as do complete API 24/24 and Cloud 11/11 regression suites. The mirror review also verifies every role is denied caller-supplied password hashes and that generic CRUD cannot append audit events; tenant-allowlisted private CRM destination tests pass without network contact. This addendum supersedes the earlier note that a distinct shared-secret webhook guard remained active. PR #102 is open; independent normal security review and merge are still pending. No database or provider was used.

Run 20261012-keledon-four-fronts; bounded independent source review, no edits outside this report, no browser/live/database/provider execution. Reviewed current CrudAccessGuard, CrudController/TenantController/CrudModule, global PrismaModule/AuthGuard, TeamController, auth-local signup/Google paths, management user/company/provider UI and API wrappers. This review is source evidence, not exercised HTTP/DI acceptance.

## Findings requiring integration repair

### P1 — successful LLM save retains secret input and stale presence indicators

`services/web/src/pages/ManagementProvidersPage.tsx:191-206`: STT and TTS successful saves call `loadConfigs()`, which clears plaintext fields and reads safe `storedKeys`; LLM success only changes mask flags. After a first OpenAI/Google key save, the page can still show “No key” and keeps the just-saved credential in editable/revealable React state until a later reload/team change. This breaks the intended write-only save/reload contract and may resend an old input on a subsequent provider change. Smallest fix: use the same guarded `await loadConfigs()` on successful LLM save; maintain selected-team/request identity protection and clear local keys when team becomes empty as well.

### P1 — selectable TTS provider receives success without being saved

UI `ManagementProvidersPage.tsx:20` offers `speaches`; API `services/api/src/controllers/team.controller.ts:286-309` permits only elevenlabs/webspeech/kokoro/openai-tts/coqui. A speaches PUT reaches team.update with no ttsProvider change, returns HTTP success, and the UI reports saved. This mismatch predates part of the candidate but remains a concrete acceptance defect in the confirmed provider administration front. Smallest safe repair: remove unsupported UI choice unless the current runtime genuinely implements speaches TTS; reject supplied unsupported provider identifiers with BadRequestException instead of silently ignoring them. Do not add a provider integration just to satisfy the dropdown.

## Reviewed controls without a new P0/P1 finding

- CrudAccessGuard derives actor identity/role/company from DB, not supplied roles; known role allowlist, management gates, company-scoped relations and regular-user own runtime read/launch restrictions are present. User role/tenant PUT reassignment and elevated/peer user mutation restrictions match current management UI after worker repair.
- Current HTTP controller decorators use full api/crud and api/tenant prefixes compatible with the guard normalization; plural vendors and singular vendor route alias are covered. Existing isolated fake requests are useful, but a real Nest/Express route-context test is still needed before claiming handler integration PASS.
- CrudModule registers the guard and webhook guard. PrismaService is exported by imported @Global PrismaModule. Global AuthGuard in main populates req.user before controller guards; webhook's explicit Public plus WebhookGuard remains distinct. No source DI registration defect established. Duplicate CrudController registration in AppModule is preexisting; guard resolution/route execution must be accepted with the integrated harness rather than assumed from this review.
- Auth-local new signup/Google creation uses role user and no automatic tenant/elevated role; existing provisioned identity roles remain. Production missing HMAC secret fails closed in AuthGuard; no credential values were read.
- Team config GET/PUT require DB-backed management scope, select raw keys only internally and return blank write-only fields plus boolean presence indicators. Removed paid OpenAI validation request means no live key verification on save; format validation is distinct from provider connectivity.
- Management user UI omits invalid brandId from writes; non-superadmin PUT omits companyId/teamId, restricts role to user and disables existing peer/elevated mutation. Company create/delete is superadmin-gated; server remains authoritative.
- Shared api-fetch creates Headers from caller options and preserves FormData boundaries, custom authorization/content types. API client JSON body now overrides option spread correctly, fixing raw-object fetch body. Its caller-supplied headers can still override defaults, but current authentication call sites supply no headers; no new P1 established.
- Type fixes correct state/action mixup in AgentControlCenter, missing config import, actual camelCase relation use and ArrayBuffer copy for audio decoding. Optional historic loop fields do not establish measured progress; UAT must not treat fallback zero values as real performance evidence.

## Status

Two P1 findings above are open at review snapshot. Root owns repair and integrated retest/UAT. No P0 established by this bounded inspection; this is not a claim that all application endpoints are secure. No merge/push/review approval/publication performed. Report local/uncommitted.
