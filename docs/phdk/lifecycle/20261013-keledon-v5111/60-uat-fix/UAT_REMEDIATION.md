# UAT remediation — KELEDON 5.1.12

## UX-001 / P1: selected corporate/light palette did not reach descendant controls

- **Observed:** login in corporate theme retained dark-teal primary controls despite root semantic tokens reporting the corporate navy palette; sampled text contrast failed.
- **Root cause:** Tailwind-registered custom properties with `inherits: false` were changed only on `:root`, leaving descendant controls on registered initial values.
- **Change:** `services/web/src/index.css` and `landing/src/index.css` apply the existing light/corporate semantic values to the root and descendant controls. No new palette or dependency was introduced.
- **Version/revision:** 5.1.12, commit `ca34792`.
- **Retest:** `services/web npm run build`; `npm run test:uat` 1/1 on exact commit. Test asserts each descendant primary token and exact button RGB, samples visible login text contrast for all three palettes, and passes.
- **Remaining:** Full-route manual accessibility is still open; closure applies only to this reproduced P1 and exercised login sample.
