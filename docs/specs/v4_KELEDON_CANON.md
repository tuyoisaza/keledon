# KELEDON V4 — Canonical Specification

## Status
**IMMUTABLE LAW — V4**
Version: 4.0.0
Date: 2026-05-25

This document defines the **full autonomous runtime vision** for KELEDON.
It is the end-state specification for the platform: a cloud-governed, browser-executed, live voice + CRM operating system for inbound calls.

---

## 1. Identity

### 1.1 What KELEDON V4 Is

KELEDON V4 is an **autonomous contact-center runtime** built around two real surfaces:

- **Cloud Brain** — the only decision-maker
- **Browser Edge Agent** — the execution surface that controls vendor portals, audio I/O, and deterministic UI actions

Its purpose is to:

1. Launch from a deep link or launch button
2. Pair with Cloud
3. Open and maintain the required vendor sessions
4. Answer inbound calls in the live vendor interface
5. Convert speech to text and text back to speech
6. Apply the brain’s policy decisions in real time
7. Execute CRM / workflow actions in Salesforce
8. Produce a complete summary and disposition at call end
9. Return to standby and wait for the next call

### 1.2 Prime Law

> **Cloud decides. Browser executes.**

This law overrides all other interpretations.

Implications:

- The cloud owns business policy, response selection, and action selection
- The browser never invents the next move
- The browser executes only approved actions and reports evidence
- Genesys is the live call interface
- Salesforce is the system of record for notes, disposition, and post-call work
- If state is ambiguous, the browser must surface diagnostics and wait

---

## 2. Canonical End-State Loop

### 2.1 Top-Level Lifecycle

```text
LAUNCH / DEEP LINK
  → VALIDATE
  → PAIR WITH CLOUD
  → OPEN VENDOR TABS
  → AUTO-LOGIN GENESYS + SALESFORCE
  → STANDBY
  → INBOUND CALL ARRIVES
  → ANSWER IN GENESYS
  → CAPTURE AUDIO
  → TRANSCRIBE TO TEXT
  → SEND TEXT TO CLOUD BRAIN
  → RECEIVE POLICY-GOVERNED RESPONSE
  → SPEAK RESPONSE INTO CALL
  → WAIT FOR HUMAN REPLY
  → CAPTURE NEXT TURN
  → EXECUTE SALESFORCE ACTIONS WHEN DECIDED
  → WRITE SUMMARY / DISPOSITION
  → HANG UP OR CALL ENDS
  → FINALIZE SALESFORCE RECORDS
  → RETURN TO STANDBY
```

### 2.2 Runtime States

`INIT -> LAUNCHING -> PAIRING -> VENDOR_BOOTSTRAP -> STANDBY -> RINGING -> IN_CALL -> THINKING -> SPEAKING -> ACTING -> SUMMARIZING -> STANDBY`

### 2.3 Required Properties

The system is only compliant if:

- a real call can be answered
- real audio can be captured and converted to text
- the cloud can decide the next turn using the policy set
- the browser can speak the response back into the call
- the browser can execute UI actions in Salesforce
- the browser can write the final outcome back to Salesforce
- every step is logged and reviewable

If any step is simulated, skipped, or hidden, KELEDON V4 is not complete.

---

## 3. System Boundaries

### 3.1 Cloud Brain

The Cloud Brain is responsible for:

- conversation policy selection
- quadrant / playbook selection
- outbound command generation
- business action decisions
- post-call disposition logic
- audit trail correlation

### 3.2 Browser Edge Agent

The browser is responsible for:

- deep-link receipt and validation
- pairing with the cloud
- opening vendor sessions
- answering the live call
- STT capture
- TTS playback
- deterministic UI automation
- evidence capture
- logging and diagnostics

### 3.3 Vendor Surfaces

The minimum vendor surfaces for the canonical workflow are:

- **Genesys** — inbound call control and live conversation UI
- **Salesforce** — customer record, notes, disposition, and follow-up actions

Other vendor portals may exist, but they are not required to define V4.

---

## 4. Data and Control Contracts

### 4.1 Launch Payload

A launch payload must be able to carry:

- keledon ID
- pairing code
- cloud URL
- launch action type
- optional instructions for test mode
- launch timestamp
- signature / validation metadata

### 4.2 Pairing Contract

Successful pairing must establish:

- device identity
- auth token
- keledon identity
- team context
- vendor list
- escalation / policy configuration
- session bootstrap state

### 4.3 Call-Turn Contract

Every turn of the call loop should produce:

1. transcript text
2. confidence / timing metadata
3. policy lane / quadrant selection
4. cloud response text
5. any action instructions
6. browser execution evidence
7. current state transition

### 4.4 Action Contract

When the brain decides an action, the browser must return:

- action name
- target surface
- status
- timing
- screenshots or evidence markers
- failure reason if the action did not succeed

### 4.5 Post-Call Contract

At call end, the browser must provide:

- final transcript summary
- call disposition
- client-facing summary
- Salesforce writeback result
- any unresolved exceptions
- return-to-standby confirmation

---

## 5. Governance Rules

### 5.1 Determinism

Browser execution must be deterministic wherever possible.

### 5.2 No Hidden Decisions

The browser may not:

- infer business intent
- choose the policy lane
- decide what to say next
- silently fall back to alternate business logic

### 5.3 Observable Runtime

Every meaningful stage must be observable via logs, diagnostics, or UI status:

- launch
- pairing
- vendor bootstrap
- ring detection
- answer
- transcript
- brain response
- speech playback
- action execution
- summary writeback
- call end
- standby

### 5.4 Recovery

Failures should surface diagnostics and recover to standby when possible. Silent failure is disallowed.

---

## 6. Relationship to V3

V3 is the near-term browser bootstrap and diagnostic phase.
V4 is the full autonomous call runtime.

V3 may include:
- launch diagnostics
- version button behavior
- deep-link validation
- pairing bootstrap
- vendor tab readiness
- standby state

V4 adds:
- inbound call answering
- continuous STT/brain/TTS loop
- Genesys call control
- Salesforce execution/writeback
- post-call summary lifecycle

---

## 7. Definition of Done for V4

KELEDON V4 is done only when:

- a real launch path exists
- the browser opens Genesys and Salesforce
- the system waits for an inbound call
- the call can be answered in Genesys
- audio can loop through STT → brain → TTS
- the browser can execute Salesforce actions
- the final summary is written back
- the browser returns to standby cleanly
- all of the above are observable in logs and diagnostics

---

## 8. Authority Rule

This document supersedes:

- README files
- older specs
- roadmap notes
- implementation guesses
- informal conversations

If a conflict exists, this document wins.

---

**End of KELEDON V4 — Canonical Specification**
