# UI design system — scoped extension
Preserve semantic CSS/Tailwind tokens, React/Lucide/motion and current en/es/pt catalogs; no unrelated redesign/dependency addition.
Shared version -> clipboard -> trash row below top-left brand. Semver-only 12px/no wrap; buttons 28px visible square, icons 14px, 4px gap. Native buttons/accessibility labels/focus; pending/disabled, independent awaited green check/revert; hidden live status, no toast/caption/version substitution.
Do not introduce overlapping invisible 44px targets in compact 32px center spacing; document feasible effective-target tradeoff.
Common utility: safe bounded report and app-owned reset; component: independent timers, unmount cleanup, confirmed success only. No duplicate row in one region. Electron stays native but matches contract.
Use theme tokens, verify relevant contrast and keyboard behavior in UAT.
