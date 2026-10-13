# Dependencies / ownership
Baseline WS-001 precedes implementation. Integrate in owner order WS-002, WS-003, WS-004, then central review/UAT/Fix/SEO/AEO/Check/delivery.
Root owns root docs, versions/lockfiles, web/landing diagnostics/mounts/locales and Electron renderer. Runtime worker owns voice/planner/gateway/browser non-renderer; admin worker owns CRUD/auth policy fixes. Shared-file changes require root coordination.
Workers may inspect disjoint scope after baseline, no independent git delivery. External media/provider/vendor prerequisites can block UAT-005; never excuse missing local tests. No provider writes/live data operations.
