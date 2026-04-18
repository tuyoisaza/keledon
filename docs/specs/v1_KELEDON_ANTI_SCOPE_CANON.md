# KELEDON — Anti-Scope Canon (What We Explicitly Do NOT Want)

## Status
**CANONICAL NEGATIVE RULES — V1**

This document defines anti-patterns and forbidden practices.
If any item below appears in code, docs, or runtime behavior, it must be removed or blocked.

---

## 1) No Demo Theater

KELEDON must not rely on demo-only artifacts presented as product truth.

Forbidden:
- demo seed scripts as runtime dependency
- fake/simulated execution presented as real behavior
- mock pipelines used to claim readiness
- “happy-path demos” without runtime evidence

Rule:
- If it is only for demo optics and not required for real runtime/proof, remove it.

---

## 2) No Fake Readiness

Forbidden:
- readiness claims based on screenshots, static UI, or mock logs
- “works locally” without reproducible runtime traces
- silent fallback from managed production posture to local infra

Rule:
- READY/NOT READY is evidence-based only.

---

## 3) No Browser-Side Decisioning

Forbidden:
- intent/policy/flow decisions in extension runtime
- local heuristics replacing cloud orchestration

Rule:
- Cloud decides. Agent executes.

---

## 4) No Optional Grounding

Forbidden:
- bypassing vector retrieval on material decisions
- treating grounding as optional optimization

Rule:
- Vector grounding is mandatory for cloud decisioning.

---

## 5) No Data-Layer Drift from Canon

Forbidden:
- reintroducing Supabase-specific coupling as production canon
- mixed DB posture without governance approval

Rule:
- Canon data layer: Prisma + managed Postgres.

---

## 6) No Governance Bypass

Forbidden:
- direct execution-agent work on `main`
- completion claims without commit + push + PR
- undocumented architectural changes

Rule:
- Branch law and PR law are mandatory.

---

## 7) Enforcement

If a forbidden item is found:
1. Stop claiming success
2. Mark as violation
3. Remove or isolate in a controlled non-canonical area
4. Re-run proof and readiness checks

---

**End of KELEDON Anti-Scope Canon (V1)**
