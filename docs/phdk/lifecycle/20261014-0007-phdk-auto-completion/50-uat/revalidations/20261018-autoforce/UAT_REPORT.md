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

Next: proceed through public SEO/AEO and static Check, then normal PR delivery for #258/#259. After the existing production deployment actually serves v5.2.11, rerun UAT-142 on `/login` and record the fresh deployment revision.
