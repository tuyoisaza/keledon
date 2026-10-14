# Remediation handoff — `20261014-0007-phdk-auto-completion`

## Candidate 5.1.27 — CHK-002 source remediation

Resolved the source-level flow-step reorder divergence and transaction race: API and Cloud validate malformed inputs and exact unique step membership, then apply all order updates in the same serializable transaction. Focused tests: API 7/7, Cloud 10/10. Full API/Cloud configured builds and typechecks pass; regressions pass API 21/21 and Cloud 11/11. The 35-model/126-core-row assertion is drift protection only. Cloud full Jest needs a disposable DB URL; sequential synthetic Web UAT passes 1/1. PR #96 merged 5.1.27 at `a0425134ba69b1feaf165cd512caad8c136ca6f8` and exact remote readback passes. Remaining role×tenant×surface×operation coverage for 26 models and persisted DB acceptance stay open.

Status: UAT Fix source remediation completed for candidate 5.1.26. UAT-008 now passes with an approved development/staging-only audited flow; see 60-uat-fix. The candidate branch and final delivery remain open. Previous remediation record follows.

Status: source remediation completed for candidate `afd66702ba7fc216e27c0c845ceaedb1eeb40944`, merged via PR #94 at `8dfc1fca7de253a017acb6f291ff278699915beb`; whole-product acceptance remains partial.

The approved least-privilege rules are enforced in API/Cloud: actor and tenant are read from current DB-backed identity, new accounts stay `user`, manager actions remain tenant-bound, and secrets are not returned in normal projections. Vendor credentials are encrypted at rest. Customer-configured private/local CRM origins are allowed only after URL validation and per-tenant allowlisting; Cloud does not fetch those private destinations. Without a configured customer adapter, integration health does not claim a live connection or sync. The legacy global WebSocket dashboard now requires a DB-validated superadmin session; tenant managers are denied while the stream is platform-wide.

Validation: PHDK v2.50.10 coherence 52/52; API ESLint 0 errors/138 warnings; Cloud full-source ESLint 0 errors/25 warnings; Cloud configured build and full `tsc --noEmit` PASS; Cloud regression 11/11 suites; API Jest 10/10 suites and 31 tests; focused dashboard gateway Jest 2/2; Browser offline suite 27/27; Web diagnostics 19/19; Web SEO 1/1; latest exact-candidate built-SPA synthetic UAT 1/1. Web production build passes with the existing ~779 kB main-chunk warning. The source/test inventory covers 1,135 live files with none at/above 600 lines.

At PR #94 close, the remaining items were: audited test-profile disposition; exhaustive 35-model role/tenant/surface/operation acceptance; an authorized disposable DB migration/persistence run; native Electron/device/audio; broad route accessibility/localization; deployed SEO/AEO; and customer-selected live voice/CRM acceptance when those providers are configured. No production DB, credentials, customer records, provider network, deployment or customer call was used. Source is merged; no deployment is claimed.

## Candidate 5.1.28 — UAT Fix and source Check remediation

UAT-011 passes in the isolated Nest HTTP harness: human roles are denied; a valid paired-device token cannot read another device; the matching identity receives runtime configuration. The fix removes human-token fallback from getDeviceRpaConfig while preserving the authenticated paired-device path. API 21/21 regressions, Jest 11/11/38, build, scoped lint, Cloud/Web/Landing/Browser builds and PHDK coherence 52/52 pass. Disposable PostgreSQL is unavailable (DATABASE_URL, Docker/Podman and psql absent). Remediation for this source finding is complete; exhaustive CRUD mapping and other external acceptance stay open. Next: versioned PR delivery.

## Candidate 5.1.29 — UAT Fix and source Check remediation

UAT-012 PASS: device list responses contain no raw RPA config or CDP URL, and retain only presence flags. UAT-011 PASS: paired-device-only RPA configuration delivery still requires the exact database-derived identity. API regression 21/21, Jest 11/11/38, API build/focused lint, Cloud/Web/Landing/Browser builds and PHDK coherence 52/52 pass. Persistent DB and full role × surface × operation coverage remain open. Source remediation is complete; delivery is next.
