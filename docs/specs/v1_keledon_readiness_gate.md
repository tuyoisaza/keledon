# KELEDON — Readiness Gate (V1, Reduced)

## Status
**IMMUTABLE LAW — READY vs NOT READY (V1)**

This document defines the **only rule** for deciding whether a KELEDON version is worth testing.

Authoritative cross-reference set:
- `docs/specs/keledon_canonical_architecture.md`
- `docs/specs/keledon_v_1_canonical_technical_spec.md`
- `docs/specs/keledon_canonical_contracts.md`
- `docs/specs/docs_specs_keledon_execution_law.md`
- `docs/specs/docs_specs_keledon_v_1_minimal_spec.md`

Interpretation guard:
- The only real agent is the Cloud Conversation Orchestrator.
- Browser runtime is execution-only and must not decide.
- Vector-grounded cloud reasoning is required in any READY claim.

There is no roadmap, no partial credit, and no debate.

---

## 1. Purpose

The Readiness Gate exists to answer one question only:

> **Can a human pull `main`, run the system, and observe real behavior?**

If the answer is not clearly YES, the system is **NOT READY**.

---

## 2. What READY Means

A version is **READY** if and only if **all** of the following are true:

1. `main` builds without manual fixes
2. `main` starts without crashes
3. At least one real input can be provided
4. At least one real output is produced
5. The behavior is observable by a human
6. Decisioning is cloud-side and vector-grounded
7. Production configuration is managed-service-compatible (Prisma + managed Postgres, Qdrant, OTel exporter, Cloud base URL)
8. Production configuration has no localhost/loopback dependency

Logs count. UI counts. Side effects count.
Claims do not.

---

## 3. What NOT READY Means

A version is **NOT READY** if **any** of the following are true:

- build fails
- startup fails
- behavior is simulated
- output is mocked
- nothing observable happens
- browser decides intent/flow/policy
- vector store is bypassed or treated as optional
- C09 proof passes but C10 real extension runtime proof fails
- no `keledon.agent.exec` execution evidence is present for cloud-issued command execution
- any change affects agent execution, decision flow, vector retrieval, or command emission and `npm run proof:c12:local` does not pass
- production tier silently falls back from managed services to local Docker infrastructure
- production tier accepts localhost/loopback service endpoints

NOT READY is a valid outcome.
Silence is not.

---

## 4. Who Decides

Only the **PR Master / Release Engineer** may declare readiness.

Execution agents MUST NOT declare readiness.
Humans MUST NOT override the declaration.

---

## 5. How the Gate Is Applied

After each integration cycle, the PR Master MUST declare exactly one:

```
VERDICT: READY
```

or

```
VERDICT: NOT READY
```

No explanation is required.

### 5.1 Local vs Managed (Configuration Diagram)

```
DEV_LOCAL / CI_PROOF -> local Docker dependencies for development, CI, proof only
PRODUCTION_MANAGED   -> Prisma + managed Postgres, managed Qdrant, managed OTel exporter, managed Cloud base URL
```

This is a configuration distinction only; architecture and execution boundaries do not change.

---

## 6. Human Action After Verdict

If READY:
- human pulls `main`
- human runs the system
- human tests behavior

If NOT READY:
- no testing
- next integration cycle continues

Superadmin observability deployment rule:
- Any Superadmin OpenTelemetry dashboard deployment is BLOCKED unless `npm run proof:c12:local` is PASS on the target branch.
- Observability dashboards are downstream of proof evidence and must never be treated as proof substitutes.

---

## 7. Authority Rule

This document overrides:

- optimism
- effort
- sunk cost
- progress reports

Delete code or continue work until READY is reached.

---

**End of Readiness Gate (V1)**
