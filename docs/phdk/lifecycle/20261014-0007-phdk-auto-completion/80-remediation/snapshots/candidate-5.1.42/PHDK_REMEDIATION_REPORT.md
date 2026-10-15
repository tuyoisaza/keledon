# PHDK source remediation — candidate 5.1.42 (2026-10-14)

## Finding CHK-AUTO-020 — required RPA tenant origin scope

The Browser RPA executor previously treated `allowed_origins` as optional, so an internal caller that omitted it could reach navigation without checking the tenant's configured CRM origins. Candidate `07f979b610b069d675183a7a4ad112b2466c20d2` makes the scope required, rejects absent or empty scope before any step, and passes the required allowlist to step execution for unconditional navigation checks. This follows the approved per-tenant allowlist policy and preserves configured private CRM origins.

Validation on the exact candidate: `node browser/tests/rpa-safety.test.cjs` PASS; `node --test browser/tests/*.test.cjs` PASS 27/27; from `browser/`, `node --test test/security-policy.test.cjs` PASS 8/8 and `npm run build` PASS; `python phdk-standards/scripts/phdk_coherence_check.py` PASS 52/52. Evidence is linked from UAT-038. A root-cwd attempt to run the nested security test resolved its relative source paths incorrectly and failed; rerunning from the package root passed. Browser ESLint remains unavailable under installed ESLint 10 because this package lacks a flat config.

This closes only the fail-open source path. Synthetic WebContents tests do not prove persisted database scope, cross-origin subresource behavior, customer provider acceptance, or deployed operation. Whole Auto remains partially delivered; CHK-AUTO-003, CHK-AUTO-005/UAT-009/010, CHK-AUTO-007/UAT-006, broad accessibility/localization, deployed SEO/AEO and customer-specific live integration acceptance remain open.
