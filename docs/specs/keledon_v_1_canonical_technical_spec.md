# KELEDON V1 — Canonical Technical Specification

## Status
**IMMUTABLE LAW — V1**

Any code, agent behavior, or architectural choice that contradicts this document is **invalid**, regardless of intent or documentation elsewhere.

Authoritative cross-reference set:
- `docs/specs/keledon_canonical_architecture.md`
- `docs/specs/keledon_canonical_contracts.md`
- `docs/specs/docs_specs_keledon_execution_law.md`
- `docs/specs/docs_specs_keledon_readiness_gate.md`
- `docs/specs/docs_specs_keledon_v_1_minimal_spec.md`

Interpretation guard:
- The Cloud Conversation Orchestrator (Brain) is the only real agent.
- The browser extension/runtime is a blind execution and I/O surface, not an agent.
- Vector store usage is required for cloud reasoning and policy-grounded flow selection.
- Canonical data layer is Prisma with managed Postgres in production posture.

---

## 1. Purpose of KELEDON (V1)

KELEDON V1 is an **autonomous inbound voice agent system** whose only real agent is cloud-hosted.

Its sole purpose in V1 is to:

- Answer inbound WebRTC calls via browser execution surface
- Conduct a real-time voice conversation
- Execute **deterministic UI actions** on supported web platforms
- Leave **complete, auditable traces** of everything it does

If a capability does not directly support this purpose, it is **out of scope** for V1.

---

## 2. Core System Principle (Non‑Negotiable)

**Cloud decides. Agent executes.**

This principle overrides all others.

Implications:

- All decisions, intent selection, and flow control happen in the Cloud Brain
- The browser runtime executes instructions blindly
- The browser runtime never decides what to do next
- The Cloud never manipulates UI or audio directly
- Cloud reasoning must be grounded via required vector retrieval

Any violation is a **hard architectural failure**.

---

## 3. What KELEDON V1 IS

KELEDON V1 **IS**:

- A web-first system (browser extension + cloud backend)
- A single-agent architecture (cloud) with browser-side deterministic execution
- Deterministic in its UI behavior
- Observable and auditable at runtime
- Governed by explicit contracts

---

## 4. What KELEDON V1 IS NOT

KELEDON V1 **IS NOT**:

- A general AI assistant
- A free-form LLM controlling a browser
- A desktop automation tool
- A multi-channel contact center platform
- A system with hidden or implicit behavior

If a feature requires improvisation, heuristics, or guessing, it is **out of scope**.

---

## 5. In-Scope Capabilities (V1)

The following capabilities are explicitly in scope:

1. Inbound WebRTC call handling in browser
2. Real-time audio capture with user permission
3. Speech-to-text resulting in **text events** sent to Cloud
4. Cloud-side decision making
5. Text-to-speech playback in browser
6. Deterministic RPA-style UI execution
7. Runtime logging of:
   - audio state
   - text input/output
   - UI actions and results

All must be **observable at runtime**.

---

## 6. Out-of-Scope Capabilities (V1)

Explicitly excluded:

- Desktop agents
- Mobile apps
- Vision / OCR
- Multi-agent coordination
- Auto-learning UI behavior
- Non-deterministic UI interaction

Claims outside this list are **invalid for V1**.

---

## 7. Definition of "Done" (V1)

KELEDON V1 is considered **DONE** only if:

- A real inbound WebRTC call can be answered
- Audio is captured and converted to text
- The Cloud makes a decision based on that text and vector-grounded context
- The browser runtime executes UI actions based on Cloud commands
- Audio responses are spoken back to the caller
- All steps are logged and reviewable

Canonical runtime loop:

`LISTEN -> TRANSCRIBE -> THINK (Cloud + Vector) -> DECIDE -> ACT (RPA) -> RESPOND -> SPEAK -> LOOP`

If any step is simulated, mocked, or skipped, V1 is **NOT DONE**.

### 7.1 Canonical Real-Runtime Proof Requirement

`npm run proof:c12:local` is the **KELEDON CANONICAL REAL-RUNTIME PROOF**.

Any change touching agent execution, decision flow, vector retrieval, or command emission must preserve a passing C12 proof with correlated `decision_id` and `trace_id` across decision and execution spans.

---

## 8. Authority Rule

This document has higher authority than:

- README files
- Architecture diagrams
- Completion reports
- Test results
- Agent opinions

If there is a conflict, **this document wins**.

When component boundaries are interpreted, apply this document together with `docs/specs/keledon_canonical_architecture.md` and `docs/specs/keledon_canonical_contracts.md`.

---

## 9. Change Policy

This document may only be changed by:

- Explicit governance decision
- Separate governance Issue
- Human approval

Agents are forbidden from modifying it during normal work.

---

**End of Canonical Technical Specification (V1)**
