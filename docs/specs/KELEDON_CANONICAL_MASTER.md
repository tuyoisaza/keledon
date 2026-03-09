# KELEDON — CANONICAL MASTER SPEC (Unified)

## Status
**IMMUTABLE MASTER CANON — V1**

This document consolidates and unifies the canonical truths of KELEDON V1 into a single source of operational doctrine.

When there is conflict, this file is authoritative for interpretation and execution.

---

## 1) KELEDON Identity (What it is)

KELEDON is a **cloud-first autonomous inbound voice agent system** operating through a browser runtime.

Its V1 purpose is strict and narrow:
- answer real inbound WebRTC interactions
- process real audio/text runtime events
- decide in cloud using vector-grounded context
- execute deterministic UI/RPA actions in browser
- produce auditable runtime evidence

If it is simulated, inferred, or mocked, it is out of scope.

---

## 2) Prime Law

> **Cloud decides. Agent executes.**

There is exactly one real agent:
- **Cloud Conversation Orchestrator (Brain)**

Browser runtime is:
- execution + I/O surface only
- never a reasoning system
- never policy/intent owner

---

## 3) Canonical Runtime Domains

Exactly three runtime domains exist in V1:
1. Cloud Brain
2. Browser Runtime (Chrome extension / sidepanel runtime)
3. Vector Store (required for grounding)

No parallel decision engines are valid.

---

## 4) Mandatory Runtime Loop

`LISTEN -> TRANSCRIBE -> THINK (Cloud + Vector) -> DECIDE -> ACT (RPA) -> RESPOND -> SPEAK -> LOOP`

Interpretation:
- Listen/Transcribe/Speak happen at runtime edge (browser execution surface)
- Think/Decide/Policy/Flow happen in Cloud only
- Act executes deterministic commands issued by Cloud

---

## 5) Data Layer Canon (Updated)

- Canonical data access layer is **Prisma**.
- Production database posture is **managed Postgres via Prisma**.
- Supabase-specific dependency is **not canonical** unless explicitly re-approved by governance.

All readiness/runbook/deployment language must remain Prisma-aligned.

---

## 6) Contract Canon (How parts talk)

Only these contract families are valid:
1. Agent -> Cloud (events)
2. Cloud -> Agent (commands)
3. Agent -> Cloud execution evidence

### 6.1 Agent -> Cloud event envelope (canonical)
```json
{
  "session_id": "string",
  "event_type": "text_input | ui_result | system",
  "payload": {}
}
```

### 6.2 Cloud -> Agent command envelope (canonical)
```json
{
  "say": { "text": "string", "interruptible": true },
  "ui_steps": ["step_id_1"],
  "confidence": 0.0,
  "mode": "normal | safe"
}
```

Rules:
- Agent reports observations, not decisions.
- Cloud sends intent/flow commands, not browser-side logic.
- Missing required fields or silent fallbacks are invalid.

---

## 7) Vector Law

Vector retrieval is mandatory for cloud decisioning.

Each material cloud decision must:
1. retrieve grounded context
2. reason against that context
3. emit deterministic command(s)

If vector retrieval is bypassed, system is **NOT READY**.

---

## 8) WebRTC Participation Law

A KELEDON agent is a valid WebRTC participant only if remote participants hear it through the meeting’s own media pipeline.

Canonical model:
- pre-connection audio injection
- deterministic media track injection via browser runtime
- explicit user consent and visible runtime state

Local playback alone is not participation.

---

## 9) Governance & Agent Roles

### Execution Agents
May:
- scan/claim issues
- plan, branch from `main`, execute scoped work
- commit, push, open PR

May not:
- work directly on `main`
- merge PRs
- declare readiness

### PR Master / Release Engineer (single)
May:
- operate on `main`
- merge selected PRs
- run integration build/start checks
- emit verdict READY/NOT READY

May not:
- do feature work from side branches in same role cycle

### Human role
- pulls `main`
- runs/tests behavior
- reports working/broken

---

## 10) Repository & Branch Law

- Canon repo: `https://github.com/tuyoisaza/keledon`
- Canon branch: `main`
- Direct commits to `main` by execution agents are forbidden.
- Work is real only when: **commit + push + PR** exist.

No PR = no completion claim.

---

## 11) Readiness Gate (Binary)

Only valid verdicts:
- `VERDICT: READY`
- `VERDICT: NOT READY`

READY requires all of:
1. `main` builds without manual fixes
2. `main` starts without crashes
3. real input and real output observed
4. cloud-side vector-grounded decisioning
5. production-compatible managed posture (Prisma + managed Postgres, Qdrant, OTel, Cloud URL)
6. no localhost/loopback dependency in production posture

Any violation -> NOT READY.

---

## 12) Evidence Law

Claims do not count. Runtime evidence does.

Required evidence (minimum):
- live logs with timestamps
- command/response traceability
- auditable execution artifacts
- proof chain for cloud decision -> agent execution

Canonical runtime proof target for boundary-sensitive changes:
- `npm run proof:c12:local`

---

## 13) Forbidden Patterns

Forbidden in V1:
- browser-side intent/policy decisions
- cloud-side UI manipulation
- simulated success paths and hidden fallbacks
- optional vector usage
- ambiguous ownership between cloud and browser

If found: fail loud, stop, fix architecture.

---

## 14) Scope Discipline

In V1, delete/simplify beats expansion.

Anything not explicitly required by this canon is out of scope until governance approves otherwise.

---

## 15) Change Policy

Changes to this master canon require:
- explicit governance issue
- human approval
- clear migration note if behavior changes

Agents may not silently alter canonical meaning.

---

## 16) Operational Self-Check

Before any major action, verify:
1. Who decides? -> Cloud only
2. Is vector grounding present? -> Must be yes
3. Is data layer canonical? -> Prisma + managed Postgres
4. Is branch law respected? -> yes
5. Is claim backed by runtime evidence? -> yes

If any answer is no, do not proceed.

---

**End of KELEDON Canonical Master Spec (Unified V1)**
