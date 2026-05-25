# KELEDON BROWSER — V4 Canonical Specification

## Status
**IMMUTABLE LAW — V4 BROWSER**
Version: 4.0.0
Date: 2026-05-25

This document describes the browser-side end-state of KELEDON: the edge execution surface that boots from a launch/deep-link, pairs with Cloud, participates in live calls, and writes back to the client-configured CRM surface.

---

## 1. Identity

### 1.1 What KELEDON Browser Is

KELEDON Browser is the **edge execution surface** of KELEDON V4.
It is an Electron application that behaves like a managed browser while acting as a deterministic call-handling and vendor-automation runtime.
Its vendor surfaces, STT/TTS providers, and vector-store settings are resolved from Keledon Admin.

It must support:

- deep-link launch and launch-button startup
- diagnostics and proof-of-life UI
- pairing with Cloud
- client-configured call handling
- client-configured CRM workflow actions
- admin-configured STT/TTS providers
- admin-configured vector-store backend
- live STT/TTS call loops
- standby / recovery / resume

### 1.2 Prime Law

> **Cloud decides. Browser executes.**

The browser may not decide policy or invent the next business action.

---

## 2. Required User Experience

### 2.1 Launch / Version Button

The version badge or launch button is an operator-facing diagnostics surface.
When clicked, it must surface a sanitized diagnostic report that helps answer:

- what version is running
- whether the browser launched successfully
- whether deep-link validation passed
- whether pairing succeeded
- which cloud URL is in use
- which logs are available
- what the last launch error was

### 2.2 Browser Startup Flow

On launch or deep-link receipt, the browser must:

1. validate the payload
2. record diagnostics
3. pair with Cloud
4. open the client-configured vendor tabs
5. log in to the required client-configured surfaces
6. enter standby
7. wait for the inbound call

### 2.3 Operator Visibility

The browser must visibly show:

- connection status
- current state
- launch diagnostics
- vendor readiness
- call state
- activity log

---

## 3. Canonical Runtime Flow

### 3.1 Full Browser Loop

```text
RECEIVE LAUNCH OR DEEP LINK
  → VALIDATE PAYLOAD
  → RECORD DIAGNOSTICS
  → PAIR WITH CLOUD
  → OPEN CLIENT-CONFIGURED CALL/CRM TABS
  → AUTO-LOGIN REQUIRED SURFACES
  → WAIT IN STANDBY
  → INBOUND CALL ARRIVES
  → ANSWER / ACCEPT CALL IN THE CONFIGURED CALL SURFACE
  → CAPTURE AUDIO
  → TRANSCRIBE AUDIO TO TEXT
  → SEND TEXT TO CLOUD BRAIN
  → RECEIVE POLICY-GOVERNED RESPONSE
  → SPEAK RESPONSE INTO CALL
  → WAIT FOR HUMAN REPLY
  → CAPTURE NEXT TURN
  → EXECUTE CONFIGURED CRM ACTIONS
  → WRITE CALL SUMMARY / DISPOSITION
  → HANG UP OR CALL ENDS
  → FINALIZE CONFIGURED CRM NOTES
  → RETURN TO STANDBY
```

### 3.2 Runtime States

`INIT -> LAUNCHING -> PAIRING -> VENDOR_BOOTSTRAP -> STANDBY -> RINGING -> IN_CALL -> THINKING -> SPEAKING -> ACTING -> SUMMARIZING -> STANDBY`

### 3.3 State Rules

- **INIT** — process start, logging, and window creation
- **LAUNCHING** — launch payload received or launch form submitted
- **PAIRING** — cloud authentication and config loading
- **VENDOR_BOOTSTRAP** — open and login the configured call/CRM surfaces
- **STANDBY** — wait for the next inbound call
- **RINGING** — incoming call detected
- **IN_CALL** — live conversation active
- **THINKING** — transcript sent to cloud, waiting for response
- **SPEAKING** — TTS response being played into the call
- **ACTING** — browser is executing UI instructions
- **SUMMARIZING** — final notes / disposition / summary writeback

---

## 4. Vendor Responsibilities

### 4.1 Configured Call Surface

The configured call surface is the live call interface for that client.
The browser must be able to:

- detect an inbound call
- answer / accept the call
- monitor call state
- remain stable during the conversation
- end or hang up the call when instructed or when the conversation ends

### 4.2 Configured CRM Surface

The configured CRM surface is the system of record for that client.
The browser must be able to:

- open the relevant customer record
- write notes during the call
- execute cloud-decided CRM actions
- write the final summary
- set disposition / outcome
- preserve auditability

### 4.3 Other Tabs

Additional vendor tabs may exist, but the client-configured call and CRM surfaces are the canonical pair for V4. Genesys and Salesforce are examples, not assumptions.

---

## 5. Browser ↔ Cloud Contract

### 5.1 Launch Contract

A launch payload must carry enough information to:

- identify the keledon
- validate the session
- pair the browser with Cloud
- bootstrap the correct vendor context
- render diagnostics for the operator

### 5.2 Transcript Contract

For every meaningful utterance or turn, the browser must send:

- text transcript
- speaker/source marker if available
- confidence metadata if available
- timestamp
- call/session context

### 5.3 Decision Contract

For each cloud response, the browser must receive:

- response text to speak
- optional UI action(s)
- optional CRM action(s)
- optional escalation or abort instruction
- any evidence or trace identifiers

### 5.4 Execution Contract

For each executed action, the browser must return:

- success/failure
- action name
- target page/tab
- timing
- evidence markers
- error details if failed

### 5.5 Finalization Contract

When the call ends, the browser must provide:

- summary text
- disposition
- result of CRM writeback
- remaining diagnostics
- confirmation of standby state

---

## 6. Diagnostics and Logging

### 6.1 Mandatory Diagnostic Data

The browser must expose a sanitized diagnostic report containing at least:

- app version
- device ID
- cloud URL
- deep-link validation status
- pairing status
- last launch time
- logs directory
- main runtime log path
- startup log path
- last launch error if present

### 6.2 Logging Requirements

The browser must log:

- process start
- protocol/deep-link receipt
- pairing attempts
- vendor bootstrap
- call state transitions
- transcript receipt
- cloud responses
- UI actions
- CRM writeback
- errors and stack traces
- recovery / standby transitions

### 6.3 No Silent Failure

If anything fails, the browser must report it in logs and surface it in diagnostics. Silent failure is disallowed.

---

## 7. Operating Modes

### 7.1 Autonomous Mode

The browser follows Cloud-issued instructions and carries out the call loop automatically.

### 7.2 Standby Mode

The browser is launched, paired, and ready, but no call is active. This is the default waiting state.

### 7.3 Recovery Mode

If the browser loses a vendor session, call state, or pairing state, it must recover where possible and otherwise return to diagnostics-first standby.

---

## 8. Non-Goals for V4 Browser

The browser is not allowed to:

- select the policy lane on its own
- invent a customer response
- decide the next sales action independently
- hide a failed vendor interaction
- continue a call with unknown state without surfacing diagnostics

---

## 9. Relationship to V3

V3 covered the near-term launch/bootstrap and diagnostic phase.
V4 adds the full live-call runtime.

V3 includes:
- launch diagnostics
- version badge behavior
- deep-link validation
- pairing bootstrap
- vendor readiness
- standby state

V4 adds:
- inbound call answering
- STT → Cloud Brain → TTS loop
- live Genesys control
- Salesforce execution/writeback
- final summary / disposition lifecycle

---

## 10. Definition of Done

KELEDON Browser V4 is complete only if the browser can:

1. start from a launch/deep link
2. pair with Cloud
3. open Genesys and Salesforce
4. wait in standby
5. answer an inbound call
6. transcribe audio to text
7. send the text to the Cloud Brain
8. speak the cloud response back into the call
9. execute cloud-decided Salesforce actions
10. write the final summary and disposition
11. return to standby cleanly

---

**End of KELEDON BROWSER — V4 Canonical Specification**
