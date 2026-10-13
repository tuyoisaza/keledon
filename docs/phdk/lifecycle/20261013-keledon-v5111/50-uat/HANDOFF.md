# UAT handoff — v5.1.11

Status: COMPLETED — scoped synthetic acceptance passes; overall acceptance incomplete.

`services/web npm run test:uat` passes 1/1 against the local production SPA with isolated fixtures and intercepted APIs. The evidence JSON is `docs/phdk/evidence/uat-local-web.json`; it covers anonymous/widget actions, reset boundaries, roles, feature diagnostics and safe probes. Web diagnostics/version tests pass 16/16; API regression passes 14/14; Browser CJS tests pass 29/29. No actual provider, CRM, database or customer request was made.

The 5.1.10 Electron renderer startup evidence is retained as historical only; no 5.1.11 native permission dialog, device or audio claim is made. Persisted CRUD/migration, broad screen-reader/zoom/contrast/localization, and deployed SEO/AEO remain unverified.

## Exit gate

- [x] Applicable safe UI/source regression cases pass.
- [x] UAT uses mocked/intercepted API and network; evidence states this scope.
- [ ] Native device/audio, persisted DB, broad accessibility/localization and deployed discovery acceptance remain open.

Next: UAT Fix; resolve all repairable findings and carry only concrete manual/environment gaps forward.

## v5.1.12 continuation — completed

Candidate `ca34792`. The P1 corporate/light descendant-token defect was reproduced, fixed, and retested. UAT now asserts actual button RGB, scans visible login text in all three palettes, and simulates 200/400% widths; all checks pass. Required role/access/story/case/journey/report and UX/UI audit snapshots are present in this folder. The full app remains ACCEPTANCE INCOMPLETE for persisted DB, native device/audio, broad manual accessibility/localization, and deployed SEO/AEO.

Next: UAT Fix, then Check and delivery for the integrated 5.1.12 candidate.

**SIGUIENTE PASO:** corregir la P1 detectada (ya completado en 60-uat-fix) y pasar a Check.
