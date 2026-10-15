# UAT Fix handoff — 20261014-0007-phdk-auto-completion

## Candidate 5.1.54 — source matrix completeness

UAT-042 found no test failure; the missing deliverable was a model-level expansion beyond the established 168 resource rows. The matrix now enumerates every one of 490 model-role-surface combinations, marks operation evidence and exceptions, and includes regression assertions for catalog, flow and AI role boundaries. UAT-042 passes source/documentation scope. No runtime or persistent behavior was changed; CHK-AUTO-005, exact database acceptance, native device/audio and external measurements remain open.

SIGUIENTE PASO: preserve this UAT Fix record and finish the Check/delivery handoffs for candidate 5.1.54.

---

## Active remediation continuation — Knowledge vector cleanup, 5.1.52

The earlier UAT-010 Qdrant dependency is resolved for sequential deletion: the exact 5.1.52 API deleted the synthetic document's persisted record and vectors, then deleted a synthetic base's Qdrant collection and cascading PostgreSQL rows. No source code repair was required after live verification. Evidence: `../50-uat/evidence/uat-qdrant-delete-5.1.52.json`; historical snapshot: `../50-uat/snapshots/qdrant-delete-uat-5.1.52/`. Delete/reindex concurrency remains outside this pass and stays open in Check. Native device/audio remains manual.

SIGUIENTE PASO: continue Check on unresolved scope and preserve PARTIALLY DELIVERED.

---

## Candidate 5.1.51 — source findings repaired

Removed false API SubAgent Browser/CRM/voice success, made unsupported tenant adapter steps fail closed and persisted flow-run status/results. Integration health no longer reports simulated connection or sync success; process monitoring returns only the actual Node process. API ESLint is 0 warnings/errors. API focused tests, full regressions and exact-source synthetic Web UAT pass. No customer endpoint/database/native device was exercised. Candidate report: `../90-delivery/snapshots/candidate-5.1.51/PHDK_CHECK_REPORT.md`.

---

## Candidate 5.1.46 — remove unmounted legacy catalog UI

The owner confirmed the global ManagedInterface catalog must stay hidden. Its unmounted Web component was removed; active tenant integration journeys remain on Vendor configuration. Exact built-SPA UAT passes 4/4 suites with mocked API/external traffic blocked; Browser suite 40/40, API/Cloud regressions 36/36 and 16/16. No new active-path UAT defect was found. Persisted DB, native-device and broad accessibility gates remain open.

## Candidate 5.1.45 — no new Web UAT defect

Exact built-SPA UAT rerun passes 4/4 suites with external traffic blocked and synthetic APIs. The protected diagnostics controls and role-shaped UI behave as expected. No repairable Web UAT failure remains for this slice; database-backed identity/persistence and native media are still environment-bound acceptance gates. Browser runtime fixes are covered by its 40/40 offline suite. Proceed through SEO/AEO and Check.

## Candidate 5.1.32 — Knowledge page UAT remediation (2026-10-14)

UAT source defects fixed: the page had hardcoded English and presented a fabricated active-call transcript, intent/confidence, and example RAG matches as if live; it also exposed backend error text and used a hand-rolled nonmodal source dialog. `v5.1.32 fix(web): make knowledge page truthful and localized` removes the false panel and placeholder intake block from this page, localizes all visible copy/errors in es/en/pt, uses the shared native modal with labeled controls and focus restoration, and leaves regular users read-only. Exact-candidate synthetic UAT-030 passes at `93f844bfe47f3b17e3c16f94adb76bab2c0d04b5`; Web typecheck/build pass and the focused page lint has zero page warnings/errors (the shared i18n context has one pre-existing React Fast Refresh warning). No live backend, provider, or customer data was used.

Exit: all in-scope code-repairable UAT defects for this page are closed. UAT-009 (safe development identities), UAT-010 (disposable DB and persistence/migration), and UAT-006 (native Windows media/audio) remain external/manual. Proceed to SEO, then AEO/GEO, then Check with the acceptance scope still partial.

Status: **UAT-008 SOURCE DEFECT RESOLVED; ENVIRONMENT GATES REMAIN**.

The owner approved a temporary audited profile switch restricted to development/staging. Candidate 5.1.26 on `fix/audited-uat-test-profiles` implements explicit feature/environment gates, a configured synthetic profile allowlist, reserved synthetic email domains, supported roles only, current-DB superadmin checks, audited session start/end, ten-minute maximum expiry and immediate revocation on return. The browser preserves the original superadmin session only in the current tab and exposes a temporary-mode banner/return control. Persisted roles are not modified.

Validation: API full regression passes 20/20 suites, including focused fail-closed policy/service/AuthGuard tests and in-process Nest HTTP guard/controller coverage. Web built-SPA UAT passes 1/1 and covers selection/return against mocked APIs. This is isolated source/UI evidence, not live staging authentication or DB persistence. `UAT_RETEST_REPORT.md` records the scoped result.

Remaining: UAT-009 safe development target and real synthetic identities; UAT-010 disposable database and migration/persistence matrix; UAT-006 native device/audio. Overall acceptance remains **NOT ACCEPTED** until applicable gates close.
