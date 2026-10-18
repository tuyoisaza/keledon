# UAT — Auto Force re-entry (2026-10-18)

**Result: ACCEPTANCE INCOMPLETE.** Browser access is `AVAILABLE_VERIFIED`; current deployed production is KELEDON 5.2.10, while the reviewed 5.2.11 candidate in PR #259 is not deployed.

| Case | Result | Evidence / scope |
|---|---|---|
| Public landing page and version | PASS_SCOPED | Anonymous production `/` loaded; v5.2.10 is visible; example session is disclosed as illustrative. |
| Anonymous protected route | PASS_SCOPED | `/management/teams` resolves to `/login`; no private management content shown. |
| UAT-141 login touch-target baseline | FAIL_REPRODUCED | Four controls are below 44×44 CSS px: brand link 152×40, email 399×41, password 399×41, create-account 69×20. This matches the recorded 5.2.10 baseline. |
| UAT-142 PR #259 production retest | BLOCKED | Production still serves v5.2.10; 5.2.11 candidate is open, not deployed. |
| Authenticated tenant, device, flow, CRM and CMT-004 roles | BLOCKED | No owner-controlled synthetic identity and no audited reversible production fixture path. |

Full browser-access evidence: `UAT_ACCESS_REPORT.md`; sanitized geometry record: `production-anonymous-uat.json`. No local app tests/build/lint, production mutation, account use, or customer/provider access occurred. The baseline failure is preserved; no PASS is inferred for the undeployed candidate.

Next: continue public SEO/AEO and static Check, then normal PR delivery for the current documentation. UAT-142 was superseded narrowly by the production v5.2.12 retest below.

## UAT-145 — production login mobile retest (2026-10-18)

After PR #260 reached production as KELEDON 5.2.12, the anonymous `/login` page at 320×720 had a 28px gap between the header and heading, all four sampled targets at least 44px high, and no horizontal overflow. UAT-145 passes only this layout slice. Evidence: `../../evidence/uat-145-production-login-mobile-2026-10-18.json`.

## UAT-146 — production public widget mobile sample (2026-10-18)

Anonymous `/` at 320×720 displayed KELEDON 5.2.12 after one ordinary reload. The demo disclosure and main heading stayed within the viewport; sampled top controls were at least 44px high; document/body scroll width matched the 305px client width, with no horizontal overflow. This passes only the responsive layout sample after reload. In the newly opened tab's first accessibility tree the displayed version was 5.2.10; after the ordinary reload it was 5.2.12. The cause is unverified, so version freshness remains partial and no cache control was activated. Evidence: `../evidence/uat-146-production-widget-mobile-2026-10-18.json`. No login, diagnostic, clipboard, cache, or customer/provider action occurred.
