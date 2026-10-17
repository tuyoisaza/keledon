# PHDK Lifecycle Handoff — UAT

## Production revalidation UAT-133/134 — KELEDON 5.2.8 (2026-10-17)

PR #253 delivered main `9aa0d452684d4bcf1b00bdb3321649ae4675877a`; production Web deploy `4134bb32-8bbf-4401-b86f-c7bb72e26ea8` and API deploy `823151d4-e820-4077-a538-2b26670226d4` are SUCCESS, environment clear. UAT-133 passes anonymous root response and React handoff: initial HTML has the accurate overview, then the running app has one H1 and no fallback. UAT-134 passes login rendering after React starts: expected form, two fields, title Application and noindex/no-canonical. No credentials, OAuth/signup action, customer data or private destinations were touched. Evidence is in `evidence/uat-133-production-web-seo-html-2026-10-17.json` and `evidence/uat-134-production-login-shell-metadata-2026-10-17.json`. The raw private-route shell still contains public index/canonical metadata and a visible product fallback before React, while `X-Robots-Tag` is noindex; unknown URLs return 200 and redirect to `/`. Track through PIA-AUTO-SEO-002. No local application tests/builds were run.

UAT-133/134 exit: **PASS_SCOPED** for anonymous HTTP and post-React UI handoff only. Whole UAT remains PARTIAL/BLOCKED by authenticated fixtures and runtime/provider acceptance. SEO now has production evidence for SEO-10/23; AEO/GEO revalidates the same factual copy. Next: final PHDK Check for candidate 5.2.8, then authorized in-scope remediation and normal delivery. Do not claim whole Auto complete.

---

## Production UAT-131 — v5.2.7 public locale/theme matrix (2026-10-17)

UAT-131 passes the nine public language/theme selections on the anonymous homepage: ES/EN/PT × dark/light/corporate. AX confirms localized navigation, demo disclosure and current theme/language selection; four screenshots were visually checked for the compact diagnostic row. The tab ended restored to dark/PT. No login, clipboard read, cache clear, endpoint probe or customer data. This does not establish WCAG/contrast, mobile or authenticated behavior. Evidence: `evidence/uat-131-production-theme-locale-matrix-2026-10-17.json`.

No local application tests/builds were run. Whole UAT and Auto remain incomplete; next product gates are CMT-003C fixture authorization and then CMT-003A/B runtime/security. Landing runtime remains blocked pending an authoritative deployment target.

---

## Production UAT — UAT-130 / v5.2.7 (2026-10-17)

Run: `20261014-0007-phdk-auto-completion` · main/source `a7ca8689265642e6fe1f2f69aa4fa2c90b81867b` · Web/API Railway `SUCCESS`, 1/1 each, no pending work.

UAT-130 passes the anonymous production Web copy control's accessible status (“Diagnóstico copiado”). Clipboard contents were not read/exported; cache clear, login, probes and customer data were untouched. Landing host withholding passes source review and regression-source presence, but its runtime is **BLOCKED**: Railway has only Web/API for this project and the Web image includes only `services/web`. No authoritative standalone Landing production target is recorded. The case is therefore **ACCEPTANCE INCOMPLETE** overall.

Evidence: `evidence/uat-130-production-copy-status-2026-10-17.json`. Snapshot: `snapshots/production-uat-130-20261017/`. All local application tests/builds were skipped per owner instruction. Next: UAT Fix records the exact runtime blocker; continue unrelated authorized CMT-003/004 work without representing the entire Auto as complete.

---

## Production re-entry — UAT-125/126 mobile targets (2026-10-17)

Stage: `50-uat` · Candidate: KELEDON 5.2.6 · Result: **PASS FOR SCOPED ANONYMOUS PUBLIC HEADER/MENU TARGET SIZE**.

- Production v5.2.4 baseline identified undersized mobile menu links/selectors in UAT-125. PR #240 raised the expanded menu controls to 44px; production v5.2.5 retest passed at 320×720 and 375×812 without horizontal overflow.
- That retest identified the logo/home link at 113×32px (UAT-126 baseline). PR #241 raised it to a 44px minimum; production v5.2.6 retest passes at both widths.
- Final remote main: `e7257a7d0c66c8b34e6bbb7028c30be092f33102`. Railway Web `874b29df-7c7d-4e3b-a41d-8ec7339bfde8` and API `da84fde5-06fd-4bc8-be2f-2cafe409d979` are `SUCCESS`.
- Browser readiness was verified and production anonymous scope was used. No account, preferences, cache, diagnostics, API mutation or customer data was touched. Viewport override was reset. No local application tests/builds were run.
- Canonical evidence: `evidence/uat-125-production-mobile-menu-targets-baseline-2026-10-17.json`, `evidence/uat-125-production-mobile-menu-targets-retest-2026-10-17.json`, `evidence/uat-126-production-mobile-brand-target-baseline-2026-10-17.json`, `evidence/uat-126-production-mobile-brand-target-retest-2026-10-17.json`.
- Historical stage package: `snapshots/production-uat-125-126-mobile-targets-20261017/` (journey inputs, PIA/PMO ledger, reports and evidence frozen for this transition).

UAT exit: scoped UAT-125/126 evidence passes; authenticated menu/RBAC, complete routes/themes/locales, screen reader, zoom and audio remain open. Next stage: scoped Check/Delivery readback for this slice; the full Auto remains PARTIALLY DELIVERED. **SIGUIENTE PASO:** continue CMT-003A/B source implementation after recording this UAT handoff.

Run ID: `20261014-0007-phdk-auto-completion`
Stage: `50-uat`
Status: `PARTIAL / ACCEPTANCE INCOMPLETE`
Candidate: KELEDON 5.2.4, production Web main source `26e1fe1452cffb97164d65917b3c9a4308bdbdc2` (product-code change introduced at `6715ea986bf9058b8f7d50edae1efe2ed4f65b81`)
Date: 2026-10-17

## Goal / scope

Verify the production public entry safely and determine whether the tenant interface selector candidate can be accepted on the production site as requested.

## Inputs verified

- Stage 45 Prep handoff is BLOCKED with no synthetic identities/DB and explicitly excludes production seeding.
- Browser Readiness permission is active for this UAT stage; the connected in-app browser was available.
- Current candidate and target must match for feature acceptance.

## Work performed

- Opened `https://keledon.tuyoisaza.com/` anonymously in the connected in-app browser.
- Observed page title `KELEDON | Cloud-governed contact center runtime`, visible version 5.1.85, public links and content.
- Opened `/management/teams` without a session; production redirected to `/login`. The email/password form rendered and no authentication was submitted.
- Re-entered UAT read-only on 2026-10-17 and opened production `/` and `/login` anonymously. Both accessibility trees showed the version and the two named debug actions (UAT-100); neither action was activated.
- UAT-117 on the deployed v5.2.3 Web observed the anonymous copy action's accessible success status “Diagnóstico copiado”. Source review confirms the copied report withholds configured API/OAuth hostnames. Clipboard contents were intentionally not read or exported; API service was still building at the Railway readback.
- UAT-118 on the same production Web candidate traversed the public diagnostic controls by Tab/Shift+Tab; copy/clear were 44×44px with a 2px solid teal focus outline. No control was activated and no screen reader was run.
- UAT-119 on production `/login` confirmed the public keyboard order E-mail → Senha → Entrar → Google → Criar conta and reverse Tab back to Google. An autofill suggestion appeared but was not selected; no field content was recorded. The selected Portuguese interface retained HTML `lang=en`, and the focused account-creation style measured only `outline:auto` 0.666667px, so focus visibility and language metadata are open findings.
- UAT-120 after PR #232 confirmed production v5.2.4 updates `<html lang>` and visible locale together when selecting ES, EN and PT on `/login`; initial PT preference was restored. Web deployment is `228369da-23e8-49e0-8345-2469f9fd4863` / source `6715ea9`.
- No sign-in, form submission, manual API call, data mutation, storage operation, external integration or DB access occurred.
- Created current stories, journey map, acceptance cases and UX/UI audit; preserved evidence snapshots.
- Updated CMT-002 PIA, UAT case/report, PMO coverage/progress, lifecycle state and evidence JSON for UAT-117–120.

## Deliverables

- `UAT_STORIES.md`, `UAT_JOURNEY_MAP.md`, `UAT_CASES.md`, `UAT_ACCESS_REPORT.md`, `UAT_REPORT.md`, `UX_UI_AUDIT_REPORT.md`.
- Evidence: `evidence/uat-117-production-copy-status-2026-10-17.json`, `evidence/uat-119-production-login-keyboard-2026-10-17.json`, `evidence/uat-120-production-locale-lang-2026-10-17.json`; historical snapshots remain under `snapshots/`.
- Browser readiness: capability `AVAILABLE_VERIFIED`; target content loaded, but target version does not match candidate.

## Exit gate

- [x] Harmless production public-entry navigation, anonymous protected-route redirect, and public/login widget presence completed; UAT-098/099/100 PASS only for those narrow checks on v5.1.85.
- [x] Target mismatch documented: production 5.1.85 vs branch candidate 5.2.1.
- [x] UAT-096/097 remain BLOCKED; no synthetic identities or persisted role acceptance.
- [x] UAT-117 passes anonymous copy-status/source-host-withholding scope only; clipboard was not inspected.
- [x] UAT-118 passes keyboard order and focus/target-size sample only; no controls were activated.
- [x] UAT-119 passes public login keyboard order only; `lang` mismatch/focus style are recorded as open findings.
- [x] UAT-120 passes locale/`lang` sync for ES/EN/PT on public production `/login` only.
- [ ] Exact-candidate role-based browser journeys, persistence and cross-tenant denials.

## Risks / blockers

Production public smoke is not evidence for the branch candidate. Authenticated production operations would use real accounts/data and were not performed. A safe matching candidate deployment and isolated test identities/database remain necessary.

## Next stage

Stage: `60-uat-fix` only if new in-scope source defects emerge; none were identified in this read-only smoke. Continue independent Check/Remediation and normal delivery while retaining UAT-096/097 as blockers. Re-enter UAT after safe Prep and candidate target are available.


## Re-entry — UAT-121 (2026-10-17)

- Production browser readiness was available; anonymous request to `/management/teams` redirected to `/login` on KELEDON v5.2.4.
- UAT-121 passes only the anonymous access boundary. Evidence is `evidence/uat-121-production-anonymous-team-selector-2026-10-17.json`.
- Authenticated ADM-IF-01..06 remain BLOCKED: no owner-authorized synthetic production identity, dataset or cleanup plan. No account, credential, customer record, API mutation or provider was used.
- CMT-004 remains ACTIVE/PARTIAL; the tenant selector was confirmed by owner and is already source-implemented in merged PR #210.
# Production UAT-132 — v5.2.7 login locale/theme and keyboard (2026-10-17)

UAT-132 passes nine locale/theme accessibility-tree states on anonymous production `/login`, confirms translated email/password and action labels, and samples forward keyboard order in Spanish/dark. The tab was restored to Portuguese/dark. No form, OAuth, signup, diagnostics or cache action was activated; no credentials or customer data were used. This does not prove full keyboard, contrast/WCAG, screen-reader, mobile or authenticated behavior. Evidence: `evidence/uat-132-production-login-locale-keyboard-2026-10-17.json`.

No local application tests/builds were run. CMT-002 remains partial. Auto remains incomplete; Landing runtime target and authenticated production fixture gates remain open. Continue the next permitted CMT-003A/B source work while leaving fixture-gated acceptance blocked until a PHDK-compliant provisioning/cleanup path is available.

---
