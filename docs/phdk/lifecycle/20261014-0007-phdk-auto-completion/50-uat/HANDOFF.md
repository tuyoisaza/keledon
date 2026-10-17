# PHDK Lifecycle Handoff — UAT

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
