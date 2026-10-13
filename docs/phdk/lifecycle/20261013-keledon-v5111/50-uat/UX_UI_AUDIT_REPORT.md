# UX/UI audit report — KELEDON 5.1.12

Candidate: `ca34792`; local production-built Web SPA, headless Edge, synthetic fixtures. Routes exercised: `/`, `/login`, selected `/management/companies`, `/management/users`, `/management/providers`, `/management/debug`. Viewports: 1280×900, 390×844, 640×900 and 320×900 viewport simulation. Screenshots in this folder. This is not full-app or screen-reader certification.

| Dimension | Result | Evidence / finding |
|---|---|---|
| Audience and key tasks | PASS, selected journeys | Login/widget and company management controls exercised; no usage analytics inferred. |
| Information architecture/navigation | PASS, selected | Login/public home and management company entry; collapsed-nav actions remain visible. |
| Visual hierarchy/readability | PASS, sampled | Login heading/form and version row render coherently in three themes. |
| Consistency/design tokens | FIXED P1 | Before: `uat-login-corporate-before-v5112.png` showed teal login action despite corporate tokens. Tailwind-registered custom properties did not reach descendants. After: selectors in Web/Landing apply semantic values to descendant controls; exact button RGB asserted. |
| Feedback/system state | PASS, selected | Copy/reset, debug probe and provider-save feedback asserted by local UAT. |
| Error prevention/recovery | PASS, selected | Clipboard failure remains honest; manual-only CRM has no safe-probe action; admin writes omit role/company fields. |
| Accessibility | PARTIAL / MANUAL | Login visible-text sample against 4.5:1/3:1 threshold reports no failures in all palettes. Keyboard/Escape focus return exercised on selected role details. Full route, screen reader, focus order and real OS zoom remain manual. |
| Responsive/mobile | PASS, selected | Login 390px and 640/320px simulation have no horizontal overflow; company detail tested for 640/320 simulation. Not actual display zoom. |
| Forms and microcopy | PARTIAL | Login and selected admin/provider fields/labels exercised; full en/es/pt route copy audit remains manual. |
| Empty/error/loading/auth states | PARTIAL | Clipboard failure, guest redirect and diagnostics toggle covered; full application state inventory not exercised. |
| Trust and user control | PASS, selected | Owned-state reset preserves unrelated state; secrets are write-only; unsafe CRM probe is withheld. |
| Perceived craft | MANUAL | Screenshot review is limited to selected flows; no broad subjective score assigned. |

Finding `UX-001` (P1) is fixed and retested in v5.1.12. No unresolved P0/P1 was found in executed paths. Broader dimensions remain open; this report does not mark overall acceptance complete. See `../60-uat-fix/UX_UI_REMEDIATION_REPORT.md` for defect closure.
