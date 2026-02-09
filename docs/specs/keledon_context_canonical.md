# KELEDON Canonical Context (FOR AI & AGENTS)

> **PURPOSE**  
> This document exists to permanently lock scope, meaning, and mental model for KELEDON.  
> Any AI agent, developer, or tool MUST read this file before performing work.

---

## WHAT KELEDON IS (CANONICAL)

KELEDON is a **cloud-first autonomous inbound voice agent system** that operates inside web browsers via a deterministic execution runtime.

KELEDON answers **real inbound WebRTC calls**, conducts **real-time voice conversations**, and **executes deterministic UI/RPA flows** on supported web platforms.

There is **exactly ONE real agent** in KELEDON.

---

## SINGLE AGENT LAW

### ✅ The ONLY Agent

**Cloud Conversation Orchestrator (Brain)**
- Lives in the cloud
- Performs all reasoning, intent detection, policy enforcement, and flow selection
- Is the only component allowed to "decide" anything

### ❌ What is NOT an agent

**Browser / Chrome Extension Runtime**
- NOT an agent
- NO reasoning
- NO intent selection
- NO policy decisions

The browser is a **blind executor + I/O surface only**.

> Law: **Cloud decides. Agent executes.**

---

## VECTOR STORE (MANDATORY)

The vector store is **NOT optional**.

It is required for:
- Knowledge grounding
- Policy constraints
- Training material
- Playbooks & flows
- Action eligibility

### Decision Rule

Every cloud-side decision MUST:
1. Retrieve vector-grounded context
2. Reason using that context
3. Emit deterministic commands

If vector retrieval is bypassed → **SYSTEM IS NOT READY**.

---

## RUNTIME LOOP (AUTHORITATIVE)

1. Listen (WebRTC audio captured in browser)
2. Transcribe (STT in browser → text)
3. Think (Cloud agent reasons using vector store)
4. Decide (Cloud selects response + optional flow)
5. Act (Browser executes RPA/commands if instructed)
6. Respond (Cloud sends text response)
7. Speak (Browser converts response to voice via TTS)
8. Loop

---

## EXECUTION BOUNDARIES (NON-NEGOTIABLE)

| Component | Allowed | Forbidden |
|--------|--------|-----------|
| Browser | Capture audio, play audio, execute commands | Intent detection, policy decisions, flow selection |
| Cloud | Reason, decide, orchestrate, command | Direct UI interaction |
| Vector Store | Ground decisions | Optional use |

---

## FAILURE RULE

If ANY instruction, prompt, or task:
- Treats the browser as an agent
- Makes vector usage optional
- Allows browser-side decisioning

→ **STOP immediately and report a SCOPE VIOLATION**.

---

## REQUIRED PRE-READ (FOR AI & AGENTS)

This file MUST be read together with:
- docs/specs/keledon_canonical_architecture.md
- docs/specs/keledon_v_1_canonical_technical_spec.md
- docs/specs/keledon_canonical_contracts.md
- docs/specs/docs_specs_keledon_execution_law.md

---

## WHY THIS FILE EXISTS

KELEDON scope loss previously occurred due to:
- Ambiguous "agent" wording
- Optional interpretation of vector store
- Feature-first thinking without system context

This document is the **single mental anchor** to prevent that forever.

---

## SELF-CHECK (MANDATORY)

1. Where does the agent live?
   → In the cloud.

2. Is vector retrieval optional?
   → No. Never.

3. Can the browser decide anything?
   → No. Ever.

If you cannot answer these correctly, you are **not allowed to proceed**.

---

**STATUS:** IMMUTABLE CANONICAL CONTEXT
