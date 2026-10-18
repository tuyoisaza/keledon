# UAT remediation — UAT-141 login touch targets (2026-10-18)

## Defect

Production v5.2.10 `/login` fails the 44×44 CSS px target-size requirement for four controls: header brand link 152×40, email field 399×41, password field 399×41 and create-account toggle 69×20. The layout itself passed the sampled 320×720 no-overflow check.

## Root cause

The brand link and signup toggle had no minimum hit-area size. Email/password relied on vertical padding and rendered 41px high in the measured production browser.

## Repair already present in candidate

PR #259 / `fix/phdk-login-touch-targets-5-2-11` changes the brand link to `min-h-11`, both fields to `h-11`, and the signup toggle to `min-h-11 min-w-11 inline-flex` with centered content. Under the app's Tailwind spacing scale these utilities provide a 44px minimum dimension. This is source review only; it does not prove deployed geometry.

## Scope and verification

The focused diff changes only login touch sizing and the matching v5.2.11 version/changelog/evidence. It does not change authentication, OAuth, roles, tenant checks, API contracts, or secrets. No application tests, builds or lint were run locally, per owner instruction. The PHDK coherence check remains 66/66; `git diff --check` reports no whitespace errors (Git only emits CRLF-to-LF normalization warnings).

## Retest gate

UAT-142 remains **BLOCKED_PENDING_DEPLOYMENT**. Production still serves v5.2.10, while PR #259 is open. After normal delivery/autodeploy, remeasure the same four controls at 320×720 in an anonymous production tab, verify no overflow and the actual v5.2.11 version, and preserve the original failure. Do not enter credentials or activate login/signup/OAuth.
