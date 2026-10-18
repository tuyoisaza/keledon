# UAT — Auto Force re-entry (2026-10-18)

## Candidate 5.2.15 production finding: UAT-150

- **Intent/story:** US-CMT004-IFCAT-01, platform superadmin direct access to the company-owned interface catalog; source `10-capture/revalidations/20261018-autoforce/PROJECT_INTENT.md`, commitment CMT-004 / ADM-CAT.
- **Target:** production `https://keledon.tuyoisaza.com`; merged main `a1bef76ccdd3b76a8b9c4201ee41b88ac14b16f6`, KELEDON 5.2.15. Railway Web/API were `SUCCESS`; fresh Chrome rendered login v5.2.15 for the known protected teams route.
- **Browser readiness:** phase permission `ACTIVE_UAT_EXCEPTION`; CUA fresh Chrome navigation and screenshot verified in the live UAT session; `AVAILABLE_VERIFIED`; no new spend.
- **Actions/data:** anonymous GET/browser navigation to `/admin/interfaces` and known-safe `/management/teams`; no login, writes, customer data, credentials, clipboard read or cache clearing.
- **Result:** **FAIL_REPRODUCED**. `/admin/interfaces` returns HTTP 404 with Cloudflare edge headers and KELEDON's static 404 page. `/management/teams` returns the SPA and redirects to `/login`. The app bundle and `AppRouter.tsx` include `/admin/interfaces` guarded by `superadmin`, but Nginx's `known_spa_route` map omits it. This is an origin routing defect; the response traversed Cloudflare, but no evidence implicates a Cloudflare rule.
- **Repair/retest:** candidate 5.2.16 adds the exact route to Nginx's allowlist and a regression assertion. Retest the same direct URL after the exact Web deployment reports `SUCCESS`; expected result is SPA load followed by `/login` anonymously. Then authenticated role/persistence/audit cases remain pending a normal superadmin session.
- **Evidence:** `../evidence/uat-150-admin-interfaces-spa-allowlist-2026-10-18.json` and live browser capture in the active UAT trace. No screenshot file exported.

## CMT-002 production sample: UAT-151

Story US-CMT002-DIAGNOSTICS-01 opened anonymous `/login` on KELEDON 5.2.15 in a fresh Chrome tab. The accessibility tree exposed “Copiar diagnóstico completo” and “Limpiar caché”; measured hit targets were 44×44 CSS px, and document/client widths both measured 1581px. **PASS_SCOPED** for these visible labels/targets and desktop no-overflow only. Neither control was activated; clipboard contents, cache clearing, mobile, screen-reader and authenticated surfaces remain unverified. Evidence: `../evidence/uat-151-production-login-widget-2026-10-18.json`.

## Historical UAT-142 entry — 5.2.10 baseline (superseded)

**Result at that historical entry: ACCEPTANCE INCOMPLETE.** Production then served KELEDON 5.2.10, while the reviewed 5.2.11 candidate in PR #259 was not deployed. Later sections below supersede that deployment state; the earlier findings remain historical evidence.

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
