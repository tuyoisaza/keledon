# PHDK Check report — 5.1.85 agent selection accessibility

Date: 2026-10-17
Branch: `fix/phdk-auto-5-1-85-keyboard-agent-selection`
Base: `29a1ba592d1244b7f00676677b642d8857318103`
Scope: make Web and Landing agent-card selection keyboard-accessible and expose its state.

## Finding and remediation

CHK-AUTO-025 found agent cards implemented as clickable `<div>` elements with no keyboard focus or native action semantics. Each card now contains a native `button` named `Select agent <name>`, exposes selection with `aria-pressed`, updates the visible label to `Selected`, has a 44px minimum hit area and a visible keyboard focus ring. The enclosing card no longer handles clicks. Web and Landing stay behaviorally aligned.

## Validation

| Check | Result |
|---|---|
| Web production build | PASS (existing >500 kB chunk warning) |
| Web TypeScript typecheck | PASS |
| Web ESLint | PASS |
| Agent selection accessibility contract | PASS, 2/2 (Web and Landing) |
| Web diagnostics suite | PASS, 19/19 |
| Full local Web UAT | PASS, 8/8; standalone admin-settings, theme-template and AI-admin journeys pass with synthetic APIs |
| Landing production build | PASS (existing >500 kB chunk warning) |
| Landing TypeScript typecheck | PASS |
| Landing ESLint | PASS |
| API build and regression | PASS, 43/43 |
| Cloud build and regression | PASS, 20/20 |
| Browser TypeScript build / renderer sync | PASS, 5.1.85 |
| Browser ESLint | PASS, zero warnings |
| Browser focused version/security tests | PASS, 16/16 |
| PHDK coherence | PASS, 63/63 at v2.52.2 |
| Product package/lock versions and Browser renderer | PASS, 5.1.85 |
| Local browser candidate navigation | PASS, built Web 5.1.85 loaded at loopback |
| Live agent-card keyboard behavior | MANUAL / not claimed; authenticated dashboard lacks a safe socket fixture in this checkout |

The accessibility result is scoped to the rendered control contract and source checks. Screen-reader certification, broad route/role accessibility, full-dashboard responsive acceptance and native Browser/Electron remain open. No customer data, private CRM endpoint, external service or production account was used.

Whole Auto remains PARTIALLY DELIVERED: 0/4 commitments DONE; UAT 93 PASS / 0 BLOCKED / 1 MANUAL; CRUD 396 BLOCKED / 132 NOT APPLICABLE / 3 DECISION NEEDED / 29 PASS.

SIGUIENTE PASO: complete the final candidate diff review and deliver 5.1.85 through the normal PR path; preserve the manual accessibility and whole-Auto acceptance gates.
