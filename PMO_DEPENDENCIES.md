# Dependencies / ownership
## Active run `20261014-0007-phdk-auto-completion`

Root owns all integration and delivery. No workers or independent branches are used in this run. Dependency order: WS-001 establishes exact baseline → WS-002/003/004 source convergence in owner order → Integration Review → UAT → UAT Fix/retest → SEO → AEO/GEO → Check → remediation → version/PR/review/merge/readback. The current worktree's 130 changed/untracked paths are one integrated candidate and must remain preserved.

External acceptance dependencies: a disposable isolated PostgreSQL database plus reviewed migration/rollback procedure for persisted CRUD/migration; supported Windows/Electron host and permitted device/audio for native acceptance; each customer's non-sensitive integration configuration for live provider acceptance; deployed domain/crawler access for field SEO/AEO. These do not block source work and must remain NOT RUN/BLOCKED until evidence exists. No production data, live provider calls, or deployment.

Baseline WS-001 precedes implementation. Integrate in owner order WS-002, WS-003, WS-004, then central review/UAT/Fix/SEO/AEO/Check/delivery.
Root owns root docs, versions/lockfiles, web/landing diagnostics/mounts/locales and Electron renderer. Runtime worker owns voice/planner/gateway/browser non-renderer; admin worker owns CRUD/auth policy fixes. Shared-file changes require root coordination.
Workers may inspect disjoint scope after baseline, no independent git delivery. External media/provider/vendor prerequisites can block UAT-005; never excuse missing local tests. No provider writes/live data operations.
