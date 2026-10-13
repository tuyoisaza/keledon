# Integration Review handoff — v5.1.11

Status: COMPLETED. Candidate source commit: `f809c074b1d5f4427ef016aa7da36d9bf04d0e03`.

API `health.deep` now provides allowlisted provider-presence flags and configured feature-flag states. Process-window metering tracks LLM, configured STT, direct Speaches STT and TTS results, outcomes, safe correlation IDs where available, fixed retry counts and existing request budget/kill switches. Only the actor's current DB role `superadmin` receives process-wide metering. Web and Landing share a redacted report contract; provider lists/failure codes/identifiers are filtered before copy. Client-observed proxy requests are explicitly labeled as client observations.

## Exit gate

- [x] API/report types and safe allowlists reconcile across Web and Landing.
- [x] Existing role/tenant/secret policy is preserved; global usage is current-DB-role gated.
- [x] No credentials, provider URLs, actor IDs or tenant IDs enter the report.
- [x] Focused API tests pass (2 suites/9 tests); Browser cross-service tests pass 29/29.

Next: UAT.
