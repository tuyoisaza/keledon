# KELEDON — WebRTC Agent Participation Specification v1

## STATUS
CANONICAL SPEC — PHASE 3 — IMMUTABLE AFTER ADOPTION

This document defines the **only valid, supported, and auditable way** a KELEDON agent may participate in a live WebRTC meeting.

Participation means:
> **Remote meeting participants hear the agent through the meeting’s own audio pipeline.**

Anything else is **not participation**.

---

## 1. What KELEDON Is (Global Context)

KELEDON is a **multi-tenant autonomous agent platform** for real human workflows.

Organizations use KELEDON to:
- Load proprietary knowledge bases (documents, embeddings, conversations)
- Bind that knowledge to autonomous runtime agents
- Deploy agents via a **browser side panel (Chrome Extension)**
- Embed agents into **live environments** (meetings, dashboards, apps)

KELEDON agents are **participants**, not assistants.
They can:
- Listen (STT)
- Decide (Cloud Decision Engine)
- Speak (TTS)
- Act (RPA / UI automation)

Runtime truth is mandatory. Demo behavior is forbidden.

---

## 2. WebRTC Participation — Core Definition

An agent is considered a **WebRTC participant** only if:

- Its audio is transmitted via the **same WebRTC PeerConnection** used by human participants
- Other participants hear the agent **without local speakers involved**

❌ Local playback = NOT participation  
❌ Simulation = DEMO VIOLATION  
❌ Post-hoc hijacking = INVALID

---

## 3. Canonical Technical Model (Required)

KELEDON uses a **pre-connection audio injection model**.

```
TTS / Generated Audio
        ↓
AudioContext
        ↓
MediaStreamDestination
        ↓
Injected MediaStreamTrack
        ↓
navigator.mediaDevices.getUserMedia()
        ↓
RTCPeerConnection
        ↓
Meeting Participants Hear Agent
```

The agent **supplies the audio track** before the meeting establishes its PeerConnection.

---

## 4. Allowed Integration Points

### ✅ Allowed

- Overriding `navigator.mediaDevices.getUserMedia` at `document_start`
- Returning a `MediaStream` containing agent-controlled audio tracks
- Mixing mic + agent audio **with explicit user consent**
- Using `AudioContext → MediaStreamDestination`

### ❌ Forbidden

- Replacing tracks after `RTCPeerConnection` creation
- Monkey-patching proprietary app internals
- Playing audio locally as proof
- Silent or hidden injection

---

## 5. User Consent & Security

KELEDON is **opt-in by design**.

Required consent layers:
1. Browser microphone permission
2. Explicit side-panel action to enable agent audio
3. Visible runtime indicators (green/red)

No hidden behavior is allowed.

---

## 6. Audio Source Options

Injected audio MAY originate from:
- Real-time TTS (cloud → agent)
- Preloaded audio buffers (MP3/WAV)
- Generated audio (synth / oscillator)

Optional (explicitly marked):
- Mic + agent mixing via GainNode

---

## 7. Side Panel Responsibilities

The KELEDON side panel MUST:
- Detect WebRTC context
- Show injection state (armed / active / failed)
- Allow test injection
- Fail fast and visibly when unavailable

The side panel is the **control plane**.
Content scripts perform execution only.

---

## 8. Anti-Demo Enforcement

An implementation is INVALID if:
- Audio plays but is not heard by others
- WebRTC context is assumed or faked
- Success is inferred without human confirmation

**Human verification is mandatory**:
> “Another participant heard the agent speak in the call.”

---

## 9. Evidence Requirements

Any compliant implementation MUST provide:
- Branch name
- Commit hash
- Runtime logs showing:
  - WebRTC detection
  - getUserMedia override
  - MediaStream creation
- Screenshot of side panel during meeting
- Human confirmation statement

---

## 10. Relationship to KELEDON Phases

WebRTC participation is **Phase 3 capability** and depends on:
- Phase 0–2 Floor (bootable, vector-ready, database-ready)
- Cloud decision engine
- STT → command routing
- TTS generation

WebRTC is the **last-mile interface** to humans.

---

## 11. Compliance Statement

Any agent working on WebRTC MUST:
- Read this document fully
- Cite it in commits and PRs
- Reject shortcuts

Violations must be reported, not worked around.

---

**End of KELEDON WebRTC Agent Participation Specification v1**

