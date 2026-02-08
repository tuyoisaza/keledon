# KELEDON — Canonical Architecture (V1)

## Status
**IMMUTABLE LAW — ARCHITECTURE (V1)**

This document defines the **only allowed structural shape** of KELEDON V1.

If code contradicts this architecture, the code is wrong — not the document.

Authoritative cross-reference set:
- `docs/specs/keledon_v_1_canonical_technical_spec.md`
- `docs/specs/keledon_canonical_contracts.md`
- `docs/specs/docs_specs_keledon_execution_law.md`
- `docs/specs/docs_specs_keledon_readiness_gate.md`
- `docs/specs/docs_specs_keledon_v_1_minimal_spec.md`

Interpretation guard:
- KELEDON has exactly one real agent: the Cloud Conversation Orchestrator (Brain).
- The browser runtime is an execution surface only, never a reasoning agent.
- The vector store is required cloud infrastructure for reasoning context.

---

## 1. Architectural Prime Directive

**There is exactly ONE real agent: the Cloud Conversation Orchestrator (Brain).**

There is exactly one browser runtime execution surface in V1.

No replicas.
No alternates.
No parallel decision implementations.

Any additional backend, runtime, or decision engine is **invalid** for V1.

---

## 2. High-Level System Shape

KELEDON V1 consists of exactly three runtime domains:

1. **Cloud Brain** (server-side, sole agent)
2. **Browser Runtime** (browser-side executor)
3. **Vector Store** (cloud-side required memory and policy substrate)

They communicate exclusively through **explicit contracts**.

There are no other intelligent components.

---

## 3. Cloud Brain (Server-Side)

### 3.1 Role

The Cloud Brain is the **only component allowed to decide anything**.

It owns:

- Conversational state
- Vector retrieval and grounding
- Intent selection
- Flow orchestration
- Policy enforcement
- Knowledge retrieval
- Auditing and traceability

### 3.2 Non-Responsibilities

The Cloud Brain **MUST NOT**:

- Capture audio
- Play audio
- Inspect or manipulate DOM
- Execute UI actions
- Assume browser state

Any Cloud code that touches UI or audio is a **hard violation**.

### 3.3 Single Ingress Rule

All Agent-originated information enters the Cloud through **one canonical ingress**.

Conceptually:

```
POST /brain/event
```

Whether implemented as REST or WebSocket, it is **logically singular**.

---

## 4. Agent Runtime (Browser-Side)

### 4.1 Role

The browser runtime is a **blind executor**.

It executes instructions from the Cloud without interpretation.

It owns:

- Audio capture (with permission)
- Audio playback
- UI execution (deterministic)
- Local state necessary for execution

### 4.2 Non-Responsibilities

The browser runtime **MUST NOT**:

- Decide intents
- Choose flows
- Infer meaning
- Alter Cloud instructions
- Store long-term memory
- Query vector stores for reasoning

Any local decision logic beyond execution is **forbidden**.

---

## 5. Separation of Concerns (Enforced)

| Concern | Cloud | Browser Runtime |
|------|-------|-------|
| Intent selection | ✅ | ❌ |
| Flow control | ✅ | ❌ |
| Vector retrieval and policy grounding | ✅ | ❌ |
| Audio capture/playback | ❌ | ✅ |
| UI execution | ❌ | ✅ |
| Policy enforcement | ✅ | ❌ |
| Logging | ✅ | ✅ (local forwarding only) |

If the same concern appears on both sides, architecture is broken.

---

## 6. Forbidden Architectural Patterns

The following are **explicitly forbidden** in V1:

- Multiple backends acting as decision engines
- Agent-side intent detection
- Browser-side policy/flow inference
- UI logic in the Cloud
- Simulated execution paths
- Feature flags that silently bypass execution
- Treating vector store as optional

If any of these exist, they must be removed or disabled.

---

## 7. Runtime Truth Rule

Architecture is defined by **what runs**, not by:

- folder names
- diagrams
- documentation
- tests

If code is not executed at runtime, it is architecturally irrelevant.

### 7.1 Canonical Real-Runtime Proof

`npm run proof:c12:local` is the **KELEDON CANONICAL REAL-RUNTIME PROOF** for extension participation.

It must demonstrate the cloud decision chain (`keledon.vector.retrieve`, `keledon.policy.check`, `keledon.decide`, `keledon.command.emit`) plus real extension execution evidence (`keledon.agent.exec`) with correlated `decision_id` and `trace_id`.

---

## 8. Authority & Enforcement

This document overrides:

- README files
- Architectural diagrams
- Historical implementations
- Test scaffolding

When boundary interpretation is ambiguous, `docs/specs/keledon_v_1_canonical_technical_spec.md` and `docs/specs/keledon_canonical_contracts.md` must be applied together.

When in doubt, **delete code** to restore compliance.

---

## 9. Change Policy

Changes to this architecture require:

- Explicit governance Issue
- Human approval
- Full system review

Agents are forbidden from modifying this document.

---

**End of Canonical Architecture (V1)**
