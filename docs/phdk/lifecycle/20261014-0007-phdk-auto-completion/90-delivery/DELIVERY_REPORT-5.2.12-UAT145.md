# Delivery report — KELEDON 5.2.12 / UAT-145

**Result: scoped login layout fix merged, deployed and accepted; overall PHDK Auto remains partial.**

PR #260, [Fix mobile login header overlap](https://github.com/tuyoisaza/keledon/pull/260), merged through the ordinary squash path to `main` as `327a4e65121bf6f085787f721fa0d291fae2ebb9`. Railway production Web `9a1e7179-dd61-4a95-afe7-23cc197474e5` and API `7bb5c647-ed17-4804-89c9-b31304416e3e` both report SUCCESS for that commit. KELEDON 5.2.12 is visible on production `/login`.

UAT-145 ran anonymously at 320×720 CSS px. Header bottom is y=156, the login heading begins at y=184 (28px clearance), the brand/email/password/signup targets are 44px high, and document/body scroll width is 305px within the 320px viewport, with no horizontal overflow. The accessibility tree and screenshot were inspected; no form, auth, OAuth, diagnostic, cache or clipboard control was activated. Sanitized evidence: `../50-uat/evidence/uat-145-production-login-mobile-2026-10-18.json`.

PHDK v2.54.0 coherence is 66/66. Five app package/lock roots and Browser renderer display are aligned at 5.2.12. No local app tests/build/lint ran. The post-deploy evidence/status reconciliation is being delivered separately through a docs-only PR.

This delivery closes only the mobile login overlap/target-size slice of CMT-002. Full diagnostics RBAC, accessibility and native device coverage; CMT-003 customer-selected integrations, queue fencing and private egress; and CMT-004 persisted cross-tenant/role acceptance remain partial or blocked as recorded in the active PIAs. Production acceptance limits and the no-private-sandbox/no-synthetic-auth blockers remain in force.
