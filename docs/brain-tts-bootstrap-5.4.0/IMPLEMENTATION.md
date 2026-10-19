# Audited Brain TTS synthetic bootstrap — 5.4.0

Owner explicitly authorized production synthetic account bootstrap and scoped TTS/Meet UAT on 2026-10-18, without touching real accounts and without local tests/builds/lint. This replaces the earlier missing-bootstrap scope restriction only for this request. Existing preview sessions remain read-only. No Auto/Developer/PMO activation.

## Source and security design

Protected POST /api/admin/uat-fixtures/tts-bootstrap requires a current non-synthetic DB superadmin and strict runId/team input. Serializable atomic creation and advisory lock create exactly three NEW passwordless `.invalid` users: unassigned superadmin, ordinary user A and ordinary user B; two new fictional company/brand/team trees. No existing account, membership, role, provider or secret is written. Audit records bind actor/run/team/user IDs/roles/tenants, issuance, attempts and retirement. No credential in audit, logs or persisted manifest.

The run lasts 15 minutes, at most one active run and three allocated runs/hour globally. Repeat same run returns the same identities. Signed capabilities use first-party HMAC, real DB IDs/lifecycle and an audited manifest; global AuthGuard intentionally rejects their missing general-purpose role/email claims. LocalAuthService rejects them by default; only the TTS-specific guard opts in, and checks creating administrator still active, all role/tenant claims current, selected target, expiry/retirement and sample maximum 250 characters. The synthetic superadmin's only accessible existing team is the administrator-approved selected TTS target. Ordinary synthetic users must remain on their own team; foreign-team requests deny. No device credentials, password, public sign-in bypass, provider-settings change, auth weakening or external identity-provider write.

Brain uses owner session only for explicit administrative provisioning/retirement. Synthetic sessions stay in component memory and send all test/sample requests through web `/tts/speak`; owner session is never replaced or used as test identity. Only the non-secret run ID is retained in sessionStorage for interrupted-run recovery. A five-second genuine signed expiry probe supports server expiration acceptance. Audio must have audio content type, >200 bytes and matching server team header. CORS exposes safe TTS metadata. One Spanish sample; no speechSynthesis fallback. Download/replay into existing authorized Meet transport, remote acknowledgment separately required. Retire revokes only manifest-owned synthetic accounts and retains records for audit; no restoration.

## Validation and publication

Assistant reviews outgoing source/security diff and source/version/whitespace coherence only. Application tests, builds, lint and typechecks NOT RUN locally under the owner's production-only policy. Production acceptance must verify actual candidate deployment, absent and expired auth, invalid/missing/nonexistent team, ordinary cross-tenant denial, synthetic global/unapproved-team denial, idempotency, Spanish provider audio, Meet remote reception and post-retirement revocation. No PASS until actually observed.

Target branch codex/audited-synthetic-tts-bootstrap from remote main 151ac0f2 (5.3.0); normal versioned PR/merge/readback. Provider autodeploy is allowed through existing GitHub connection; no direct provider administration, hosted CI dispatch or background work. Other dirty evidence/experiments preserved and excluded.

Pre-merge static review caught a broad version-text replacement affecting dependency metadata; restored every dependency entry exactly from remote main and updated only root package versions to final 5.4.1. No dependency upgrade and no application command was run.
