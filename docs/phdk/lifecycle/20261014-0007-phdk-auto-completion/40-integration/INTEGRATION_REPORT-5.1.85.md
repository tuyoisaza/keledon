# Integration Review — candidate 5.1.85

Run: `20261014-0007-phdk-auto-completion`
Branch: `fix/phdk-auto-5-1-85-keyboard-agent-selection`
Base: `29a1ba592d1244b7f00676677b642d8857318103`

CHK-AUTO-025 is isolated to the shared agent-monitoring view duplicated in Web and Landing. Review found both implementations had the same pointer-only click handler on a non-focusable card. Both now expose the same semantic native button contract: a name tied to the agent, `aria-pressed` selection state, visible selected text, a minimum 44px height and visible keyboard focus. The card remains a non-interactive information container; no nested interactive content was introduced. No auth, tenant, API, persistence, CRM allowlist or provider behavior changed.

Package/lock versions are synchronized at 5.1.85 for API, Web, Cloud, Landing and Browser, with Browser renderer `v5.1.85`. No dependency was added. The complete source/diff review is paired with UAT-095 and CHK-AUTO-025.

| Gate | Status |
|---|---|
| Cross-surface Web/Landing parity | PASS |
| Accessible name and pressed value | PASS by source contract, 2/2 |
| Keyboard-focusable native action | PASS by source contract, 2/2 |
| 44px minimum target / visible focus | PASS by source contract; populated dashboard browser interaction remains MANUAL |
| Scope and tenant/security boundary | PASS; no security or persistence semantics changed |
| Candidate delivery | PENDING normal PR and remote-main verification |

Whole Auto remains PARTIALLY DELIVERED: 0/4 commitments DONE; UAT 93 PASS / 0 BLOCKED / 1 MANUAL; CRUD 396 BLOCKED / 132 N/A / 3 DECISION NEEDED / 29 PASS.

SIGUIENTE PASO: complete the version-prefixed source commit and normal PR delivery; preserve the manual accessibility gates.
