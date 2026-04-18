# KELEDON — Canonical Contracts (V1)

## Status
**IMMUTABLE LAW — CONTRACTS (V1)**

This document defines the **only valid communication contracts** in KELEDON V1.

If a message, payload, or interaction is not described here, it is **invalid**, even if implemented in code.

---

## 1. Contract Philosophy

Contracts define **truth at runtime**.

- Architecture defines *where things live*
- Contracts define *how things talk*

No component may:
- invent payloads
- infer missing fields
- bypass contracts

If a contract is violated, the system must fail loudly.

---

## 2. Canonical Communication Paths

KELEDON V1 has exactly **three** contract families:

1. Agent → Cloud (Events)
2. Cloud → Agent (Commands)
3. Internal Execution Evidence (Agent → Cloud)

There are no other legal paths.

---

## 3. Agent → Cloud: Brain Event Contract

### 3.1 Purpose

Transmit **observations**, never decisions.

### 3.2 Conceptual Endpoint

```
POST /brain/event
```

(Implementation may be REST or WebSocket, but semantics are identical.)

### 3.3 Canonical Payload Shape

```json
{
  "session_id": "string",
  "event_type": "text_input | ui_result | system",
  "payload": {}
}
```

### 3.4 Allowed Event Types

#### a) `text_input`

Produced by STT.

```json
{
  "text": "string",
  "confidence": 0.0,
  "is_final": true
}
```

Rules:
- Audio is never sent to Cloud by default
- Text is mandatory

---

#### b) `ui_result`

Produced by RPA execution.

```json
{
  "step_id": "string",
  "status": "success | failure",
  "evidence": "string"
}
```

---

#### c) `system`

Lifecycle events.

```json
{
  "type": "call_started | call_ended | error",
  "details": "string"
}
```

---

## 4. Cloud → Agent: Command Contract

### 4.1 Purpose

Instruct the Agent **what to execute**, never how to decide.

### 4.2 Canonical Payload Shape

```json
{
  "say": {
    "text": "string",
    "interruptible": true
  },
  "ui_steps": ["step_id_1", "step_id_2"],
  "confidence": 0.0,
  "mode": "normal | safe"
}
```

Rules:
- `say` is optional
- `ui_steps` is optional
- At least one must be present

---

## 5. RPA Step Definition Contract

### 5.1 Step Declaration

```json
{
  "step_id": "fill_resolution",
  "action": "fill_field",
  "selector": "#resolution",
  "value": "Resolved"
}
```

### 5.2 Execution Rules

- Steps are deterministic
- No branching or improvisation
- Post-condition validation is mandatory

---

## 6. TTS Contract (Text-to-Speech)

### 6.1 Input

```json
{
  "text": "string",
  "interruptible": true,
  "priority": "normal | high"
}
```

Rules:
- Input is always text
- Audio synthesis happens locally

---

## 7. STT Contract (Speech-to-Text)

### 7.1 Output

```json
{
  "text": "string",
  "confidence": 0.0,
  "is_final": true
}
```

Rules:
- Audio stays local
- Text is forwarded to Cloud

---

## 8. Evidence Requirement

Every contract interaction must be:

- loggable
- timestamped
- attributable to a session

If evidence is missing, the capability does not exist.

---

## 9. Forbidden Behaviors

The following are explicitly forbidden:

- Agent inventing UI steps
- Cloud inferring UI state
- Missing required fields
- Silent fallbacks

Failure is preferable to ambiguity.

---

## 10. Change Policy

Any change to these contracts requires:

- Version bump
- Governance Issue
- Human approval

Agents may not modify this document.

---

**End of Canonical Contracts (V1)**

