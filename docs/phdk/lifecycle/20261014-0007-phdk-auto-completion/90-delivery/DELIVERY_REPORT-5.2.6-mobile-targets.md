# Delivery report — KELEDON 5.2.6 public mobile target-size remediation

Date: 2026-10-17 · PHDK 2.53.1 · Overall Auto status: **PARTIALLY DELIVERED**.

PR #240 (`v5.2.5`) fixes five undersized mobile menu controls; PR #241 (`v5.2.6`) fixes the adjacent logo/home target. Both were squash-merged. Verified remote `main` is `e7257a7d0c66c8b34e6bbb7028c30be092f33102`. The five package/lock roots and Browser renderer align at 5.2.6. Railway Web `874b29df-7c7d-4e3b-a41d-8ec7339bfde8` and API `da84fde5-06fd-4bc8-be2f-2cafe409d979` report `SUCCESS` for the same SHA.

Production UAT-125/126 passes the scoped anonymous public mobile header/menu target-size acceptance at 320×720 and 375×812: every measured target is at least 44px high and no horizontal overflow is present. Baseline and retest evidence is retained under `50-uat/evidence/`; stage snapshots are under `50-uat/snapshots/production-uat-125-126-mobile-targets-20261017/`.

Static verification: PHDK 2.53.1 coherence 64/64; 15/15 package/lock version fields at 5.2.6; Browser renderer sync; four evidence JSON files parse; `git diff --check` passes. No local application tests/builds were run per owner instruction. No customer account, CRM, private destination, secret or customer data was used. Source and production evidence do not close broad screen-reader/WCAG acceptance.

This report closes only the 5.2.6 UI target-size slice. CMT-001 is complete for this cut; CMT-002 remains partial; CMT-003A/B source implementation and CMT-004 authenticated persistence/cross-tenant acceptance remain open. No overall completion audit is issued while these commitments remain active.

SIGUIENTE PASO: continue CMT-003A lease/idempotency and CMT-003B tenant DNS/CIDR implementation; keep Auto PARTIALLY DELIVERED until all four confirmed fronts pass their gates.


## Follow-up UAT-127 — public accessibility-tree presence (2026-10-17)

A fresh anonymous production tab exposed the v5.2.6 title/version, main landmark, illustrative-demo disclosure, named diagnostic/theme/language controls, navigation and headings. The first fresh navigation returned Cloudflare 502; a subsequent fresh navigation loaded successfully. Railway Web/API reported SUCCESS, but the initial 502 cause is unknown. This passes presence only; it does not claim screen-reader output or full accessibility conformance. Evidence: `50-uat/evidence/uat-127-production-public-ax-presence-2026-10-17.json`.
