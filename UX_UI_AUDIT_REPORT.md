# UX/UI audit — scoped candidate

## Candidate 5.1.79 — truthful dashboard health states (2026-10-17)

The dashboard previously displayed `ready` for TTS, STT and AI through a function that never checked those services, and its aggregate status was inferred only from socket count. API/Cloud now report dependency and aggregate health as `unknown` until a real probe exists; measured WebSocket connectivity stays separate. Web and Landing also start in `unknown`, avoiding a transient false-ready display before data arrives. Source contract tests and both production builds/typechecks pass. No screen-reader or deployed runtime result is claimed.

## Candidate 5.1.78 — Admin Audit UAT-089 (2026-10-17)

The new `/admin/audit` page initially used compact controls below the project's 44px interaction target. The page now gives inputs, buttons and disclosure summaries 44px minimum height and adds explicit keyboard focus outlines. Exact production-build Playwright UAT measures all 12 targets at 44px, verifies keyboard-visible focus, and tests a 390×844 viewport with no document overflow. The responsive navigation's clipped strip is intentionally horizontally scrollable; keyboard traversal scrolls the final link into view and retains visible focus. Synthetic API rows show sanitized details; export failure remains visibly announced and prevents download. Evidence: `docs/phdk/workstreams/ADMIN-AUDIT-UAT.json` and `docs/phdk/lifecycle/20261014-0007-phdk-auto-completion/50-uat/evidence/admin-audit-uat-5.1.78-*.png`.

No remaining P0/P1 was observed in this focused admin-audit journey. This automated check does not certify screen-reader behavior, all routes/locales/themes, database-backed persistence or whole-application accessibility.

## Candidate 5.1.66 — tenant flow editor and mobile shell

The editor uses visible/native form labels, semantic buttons/checkboxes, 44px minimum-height primary controls, and the focused production-built browser test can create and approve a version, enable company availability and map an intent using Enter/Space. At 390×844, the first screenshot exposed the fixed desktop sidebar squeezing the form; UAT Fix replaced it on mobile with a compact brand/version/actions header and scrollable primary navigation, while retaining the desktop sidebar at `md` and above. The retest has no page-level horizontal overflow and shows the flow definition card at full phone width. Desktop and mobile evidence is recorded under `50-uat/evidence/uat-web-5.1.66/`.

No P0/P1 finding remains in this tested management journey. The app-wide widget is retained in the mobile header; logout and navigation remain keyboard accessible. Contrast is inherited from the existing semantic theme tokens; this pass did not measure a complete contrast matrix. NVDA/screen-reader behavior, all-route mobile layouts and full locale coverage remain PARTIAL/MANUAL. This is scoped WCAG 2.1 AA-oriented source and browser evidence, not a whole-app accessibility certification.

## Candidate 5.1.61 — public navigation and responsive preferences

The public Landing page had theme and language selectors stacked below the fixed desktop header, where they overlapped the hero disclaimer at 1280×700. The shared navigation in Landing and Web now keeps desktop preferences in the navigation row and places them in the expandable mobile menu below the `lg` breakpoint. Exact local Landing evidence at 1280×900 shows two visible controls and no overlap; at 390×844, the expanded menu exposes both labeled selectors. UAT-052 captures desktop/mobile screenshots and blocks all external requests. Web local UAT confirms the parallel Web home layout. No P1/P2 defect remains in this focused path. Screen-reader, all-route responsive and broad localization/contrast acceptance remain incomplete.

## Candidate 5.1.36 — Device revoke affordance

The `/devices` list now exposes an accessible revoke action to admin/coordinator/superadmin only, with no revoke control for user/agent. The shared `ManagementModal` communicates credential invalidation and pairing recovery before the destructive action; action failure remains in the dialog with `role=alert`, cancellation sends no request, and success removes the revoked entry. EN/ES/PT strings are present and key parity passes. Browser UAT captures user, confirmation, failure and success states in `docs/phdk/evidence/uat-device-*.png`; selected UI/role behavior passes under synthetic fixtures. Focused evidence does not certify all app routes, screen-reader behavior, color contrast, or persisted authorization.
## Candidate 5.1.17 — KELEDON and Voice Profiles

Local Edge UAT on the dirty 5.1.17 worktree confirms the tested Spanish forms use visible labels and native accessible dialogs; list loading/retry and synthetic create/delete HTTP failures are visible; Voice Profiles submit the server schema without caller tenant data; KELEDON's confirmation can be canceled. The app-wide Sonner `Toaster` is mounted. This follows the established shared modal/tokens and preserves the admin flows.

| Dimension | Result | Evidence / gap |
|---|---|---|
| Primary tasks and navigation | PASS (selected) | UAT-T-008/T-009 create flows reach their management screens and return to lists. |
| Feedback and recovery | PASS (selected) | Voice-profile list retry and create/delete 403 alerts; global Toaster mount. Other 59 routes not fully exercised. |
| Labels, semantics, keyboard | PASS (selected) | Named fields/buttons, `role=alert`, `role=status`, native dialog behavior, KELEDON table captions/headers. Screen reader not tested. |
| Responsive/reflow | PARTIAL | Existing UAT covers login at 390px/200%/400% simulation; these admin forms were not viewport-tested. |
| Localization | PARTIAL | KELEDON/Voice Profiles en/es/pt strings and catalog-key parity; only Spanish path was observed in the browser. |
| Visual system/contrast | PARTIAL | Existing three-theme login contrast sample passes; new admin screens were not contrast-scanned. |
| Trust/data control | PASS (selected) | Voice-profile requests omit companyId and 403 does not announce success; no live credential or customer data. |

No P0/P1 failure remains in the executed journeys. Whole-app UX acceptance remains INCOMPLETE due untested routes, persisted behavior, broad a11y/localization and native UI.
Confirmed local desktop/mobile diagnostic sizing, role navigation, dialog keyboard containment/Escape/focus restoration, mutation-form label, provider secret replacement and guest redirect. Three semantic palettes and reduced-motion rule exist; local theme shell selection/persistence observed. Hardcoded white/gray/background utility usage was converted to semantic tokens across current web sources. Legacy landing shares diagnostic/theme implementations.
Limits: full-page contrast matrix,200%/400% zoom, screen-reader session, all locales, all complex legacy flows and full Electron rendering NOT EXECUTED. Static localization inventory remains substantial; equal catalog keys do not prove translated pages. Large Brain/Flows components and duplicated legacy surfaces remain conformance debt. Native browser modal/select equivalence is documented; Radix is not installed. No quantitative accessibility score or certification.
