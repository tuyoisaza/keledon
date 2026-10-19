# Authentication plan — final candidate 5.4.3

Owner 2026-10-18 expressly authorized implementing and operating production synthetic bootstrap, no real account changes. This narrowly replaces earlier fixture limitations for this request; no unrelated auth/provider administration.

Operator: already signed-in platform superadmin, used only to authorize creation/retirement, not as TTS test subject. Bootstrap POST /api/admin/uat-fixtures/tts-bootstrap creates a passwordless `.invalid` superadmin with null company/team and two ordinary users in two new Company Co tenants. Atomic audit binds creator, target and exact fixture membership. Server issues HMAC first-party capabilities; no client minting, no passwords, no identity-provider writes. Tokens stay in Brain component memory; only non-secret runId retained for recovery.

All capabilities fail generic AuthGuard (no role/email claims) and default LocalAuth validation. Only TTS opts into audited synthetic sessions. Every accepted request rechecks real DB account, role, membership, active lifecycle, current creating admin, audit/run expiry and retirement. Synthetic elevated access can call only approved team's /tts/speak, no generic admin or websocket scope. Samples <=250 characters, no credential changes or provider writes. Existing request budget/kill switches/secrets still apply.

Expiry: run 15 minutes, separately signed probe five seconds; server time decides. Cleanup: owner-controlled retire route validates exact generated identities before marking retired and advancing auth-after. Records retained for audit; no restore; no real data deletion. Existing read-only role previews remain separate and unchanged. No tests/build/lint/typecheck locally; production UAT only. Candidate remote main 3a491e78abc014117c27104218b793a1691ba3bb, PR #277.

Final production execution and retirement are evidenced in UAT_REPORT.md and the two JSON evidence files. Final source main 56ba614afbf34d8f4fcecf07c121f47052d20dc9 / PR #279, 5.4.3; bootstrap source unchanged since #277. No synthetic active sessions retained after acceptance.
