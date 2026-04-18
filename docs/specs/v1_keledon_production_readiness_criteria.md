# KELEDON — Production Readiness Criteria (V1)

## Status
**IMMUTABLE LAW — PRODUCTION VERDICT (V1)**

This document defines the **only valid criteria** for declaring KELEDON V1 ready for production.

Opinions, demos, test success, or partial functionality are **irrelevant**.

The outcome of this document is binary:

> **READY** or **NOT READY**

There is no third state.

---

## 1. Purpose

The purpose of this document is to **prevent self-deception**.

It exists to force KELEDON to prove:

- what actually runs
- what actually communicates
- what is observable by a human operator

If proof cannot be produced, the system is **NOT READY**.

---

## 2. Evaluation Authority

Production readiness may be evaluated by:

- a human reviewer, or
- an autonomous agent acting explicitly as **Release Engineer (Adversarial)**

The evaluator's role is to **invalidate claims**, not to justify them.

---

## 3. Mandatory Runtime Proofs

All of the following must be demonstrated in a **single runtime session**.

### 3.1 Inbound Call Handling

Proof required:

- a real inbound WebRTC call is answered
- call start is logged

Failure = NOT READY

---

### 3.2 Speech-to-Text (STT)

Proof required:

- microphone audio is captured
- STT produces `text_input` events
- events are sent to the Cloud via the canonical ingress

Tests or mock logs do not count.

Failure = NOT READY

---

### 3.3 Cloud Decision Execution

Proof required:

- Cloud receives `text_input`
- Cloud produces a command payload
- decision logic executes in Cloud, not Agent

If the Agent decides anything, the system is NOT READY.

---

### 3.4 Text-to-Speech (TTS)

Proof required:

- Cloud issues a `say` command
- Agent produces audible speech
- interruption behavior works if declared

Silent fallbacks do not count.

Failure = NOT READY

---

### 3.5 UI Automation (RPA)

Proof required:

- Cloud issues explicit `ui_steps`
- Agent executes deterministic UI actions
- Agent emits `ui_result` events with evidence

If steps are simulated or skipped, the system is NOT READY.

---

### 3.6 Side Panel Truthfulness

Proof required:

- Side Panel reflects **real runtime state**
- No simulated or inferred indicators
- State updates correspond to actual events

If the Side Panel lies, the system is NOT READY.

---

## 4. Forbidden Evidence

The following are explicitly invalid as proof:

- unit tests
- integration tests
- screenshots of static UI
- logs from mock runs
- "works locally" statements

Only **live runtime behavior** counts.

---

## 5. Evidence Format

Acceptable evidence includes:

- terminal output from live run
- runtime logs with timestamps
- video or audio capture of execution

Evidence must be reproducible.

---

## 6. Verdict Declaration

The evaluator must declare exactly one:

```
VERDICT: READY
```

or

```
VERDICT: NOT READY
```

If NOT READY, the evaluator may declare **one and only one blocking task**.

---

## 7. Authority Rule

This verdict overrides:

- roadmaps
- deadlines
- sunk cost
- optimism

Arguing the verdict is forbidden.

---

## 8. Change Policy

This document may only be changed by:

- explicit governance decision
- separate governance Issue
- human approval

Agents are forbidden from modifying it.

---

**End of Production Readiness Criteria (V1)**

