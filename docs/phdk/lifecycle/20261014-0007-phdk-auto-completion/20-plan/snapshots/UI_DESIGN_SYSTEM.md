# UI design system — scoped extension
Preserve semantic CSS/Tailwind tokens, React/Lucide/motion and current en/es/pt catalogs; no unrelated redesign/dependency addition.
Shared version -> clipboard -> trash row below top-left brand. Semver-only 12px/no wrap; buttons 28px visible square, icons 14px, 4px gap. Native buttons/accessibility labels/focus; pending/disabled, independent awaited green check/revert; hidden live status, no toast/caption/version substitution.
Do not introduce overlapping invisible 44px targets in compact 32px center spacing; document feasible effective-target tradeoff.
Common utility: safe bounded report and app-owned reset; component: independent timers, unmount cleanup, confirmed success only. No duplicate row in one region. Electron stays native but matches contract.
Use theme tokens, verify relevant contrast and keyboard behavior in UAT.

## 2026-10-13 conformance extension — active dashboard

Dashboard and session-flow copy use the existing `I18nContext` and complete en/es/pt catalog entries; data tables use visually hidden captions and explicit `scope="col"` headers. Session filters and refresh actions have programmatic names. The 5.1.15 synthetic UAT verifies dashboard copy in all three locales and Spanish live/history states. This is scoped rendered evidence, not an all-route accessibility or localization certification.
# 2026-10-14 continuation design-system guardrails

No visual redesign is authorized by this run. Preserve existing navigation, localization, focus and semantic token conventions while validating the diagnostics widget consistently at public, login, app and administration entry points. Report exact surface coverage and viewport/keyboard evidence from current-candidate UAT. Never put credential values, transcript content, private integration URLs, or customer identifiers in widget output. Private CRM configuration is an admin journey with origin-only safe display and tenant-scoped behavior.

