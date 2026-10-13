# UAT retest
RecordDetails initial Tab escaped its intended dialog controls. Added explicit first/last wrapping; exact local role journeys now PASS. ManagementModal has equivalent containment and controlled Escape/trigger restoration. A later provider fixture check dereferenced an input during legitimate loading; fixed harness optional access and reran full journey PASS. Expanded retest adds create-form associated label and theme selection/persistence. No failed run is reclassified as product success. See UAT_REMEDIATION.md for historical record.

## Candidate 5.1.10 retest — 2026-10-13

- Browser permission policy: PASS, five focused cases for secure origin, media-only scope, consent/session, navigation race, and denial. Browser full regression 24/24 and build PASS.
- API extraction regressions: PASS, API regression 14/14 and build PASS; backup storage lifecycle/retention and mocked TTS provider request contracts included.
- Web local production SPA: PASS, `npm run test:uat` 1/1 with synthetic tenant data, intercepted API and blocked external requests. Screenshots and JSON are in `docs/phdk/evidence/`.
- SEO source: PASS, 1/1. Web typecheck/build and diagnostics 18/18 pass.
- PHDK coherence: PASS, 52/52 mappings. Repository line inventory: 1,086 files, zero at/above 600 lines.

Acceptance remains incomplete for persisted DB CRUD/migration, native Electron/device/audio, broad accessibility/localization and deployed SEO/AEO. These are blockers or unmeasured acceptance, not regressions reclassified as passes.

## UAT-ELECTRON-STARTUP — local native launch (2026-10-13)

After the owner authorized the Electron runtime, `browser/npm run dev` launched Electron 44.7.0 on Windows x64. Startup output reports `Keledon Browser v5.1.10 ready`; `did-finish-load` recorded the renderer. CDP inspection and screenshot confirm the native renderer title `KELEDON Browser`, v5.1.10 toolbar, home page, connection/activity widget, and initialized device status. Evidence: `docs/phdk/evidence/uat-browser-native-initial.png`.

A safe local New Tab UI action created the second tab. KELEDON automatically navigated it to its default `https://www.google.com` page; the tab was closed while loading. No content was reviewed, no account or data was entered, and no client service was accessed. Evidence of the transition: `docs/phdk/evidence/uat-browser-native-new-tab.png`.

The native renderer startup is **PASS**. Native media-consent dialog, OS microphone/camera permission, physical device/audio and call lifecycle remain **NOT TESTED**. CUA inventory returned no native apps, its app-list API was unavailable, and Sky reported `Trusted RPC service is not configured`; therefore no Windows app UI input was possible. The local permission-policy unit tests remain the only consent-dialog behavior verification. No permission was granted and no customer call occurred.
