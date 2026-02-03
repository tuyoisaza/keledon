# KELEDON — Canonical Architecture (V1)

## Status
**IMMUTABLE LAW — ARCHITECTURE (V1)**

This document defines the **only allowed structural shape** of KELEDON V1.

If code contradicts this architecture, the code is wrong — not the document.

---

## 1. Architectural Prime Directive

**There is exactly ONE Cloud Brain and ONE Agent Runtime.**

No replicas.
No alternates.
No parallel implementations.

Any additional backend, runtime, or decision engine is **invalid** for V1.

---

## 2. High-Level System Shape

KELEDON V1 consists of exactly two runtime environments:

1. **Cloud Brain** (server-side)
2. **Agent Runtime** (browser-side)

They communicate exclusively through **explicit contracts**.

There are no other intelligent components.

---

## 3. Cloud Brain (Server-Side)

### 3.1 Role

The Cloud Brain is the **only component allowed to decide anything**.

It owns:

- Conversational state
- Intent selection
- Flow orchestration
- Policy enforcement
- Knowledge retrieval (if any)
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

The Agent Runtime is a **blind executor**.

It executes instructions from the Cloud without interpretation.

It owns:

- Audio capture (with permission)
- Audio playback
- UI execution (deterministic)
- Local state necessary for execution

### 4.2 Non-Responsibilities

The Agent Runtime **MUST NOT**:

- Decide intents
- Choose flows
- Infer meaning
- Alter Cloud instructions
- Store long-term memory

Any local decision logic beyond execution is **forbidden**.

---

## 5. Separation of Concerns (Enforced)

| Concern | Cloud | Agent |
|------|-------|-------|
| Intent selection | ✅ | ❌ |
| Flow control | ✅ | ❌ |
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
- UI logic in the Cloud
- Simulated execution paths
- Feature flags that silently bypass execution

If any of these exist, they must be removed or disabled.

---

## 7. Runtime Truth Rule

Architecture is defined by **what runs**, not by:

- folder names
- diagrams
- documentation
- tests

If code is not executed at runtime, it is architecturally irrelevant.

---

## 8. Authority & Enforcement

This document overrides:

- README files
- Architectural diagrams
- Historical implementations
- Test scaffolding

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

