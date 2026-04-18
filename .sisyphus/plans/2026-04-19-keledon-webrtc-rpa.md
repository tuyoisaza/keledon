## Plan Title
- KELEDON WebRTC + RPA Integration (Phase 1: Voice + Automation)

## TL;DR
Establish real-time WebRTC voice conversations and deterministic RPA automation for vendor portal actions, backed by the "cloud decision, agent execution" contract, enabling end-to-end voice-driven automation.

## Context
- **KELEDON Browser**: Electron app with embedded Chrome for desktop automation
- **Cloud Brain**: Centralized decision engine via WebSocket
- **Voice Agent**: Real-time voice via WebRTC for input/output
- **RPA**: Browser automation with deterministic pre/post validation and rollback
- **Canonical Contracts**:
  - `keledon_webrtc_agent_participation_v_1.md` — participation rules (explicit consent, evidence)
  - `RPA_EXECUTOR.md` — deterministic execution with validation + rollback

## Reference Files

### Docs / Specs
| Path | Purpose |
|------|----------|
| `docs/superpowers/plans/2026-04-16-keledon-voice-webrtc.md` | Voice/WebRTC implementation plan |
| `docs/specs/keledon_webrtc_agent_participation_v_1.md` | Canonical participation spec |
| `docs/RPA_EXECUTOR.md` | RPA executor architecture |
| `docs/superpowers/plans/2026-04-12-browser-ui-enhancement.md` | Browser UI enhancement plan |
| `docs/superpowers/specs/2026-04-12-browser-ui-enhancement-design.md` | Browser UI design spec |

### Codebase Patterns
| Path | Role |
|------|------|
| `agent/src/core/webrtc-manager.js` | WebRTC lifecycle, signaling hub |
| `agent/src/core/webrtc-flow-orchestrator.js` | End-to-end flow: STT → Cloud → TTS → RPA |
| `runtime/src/media/adapters/webrtc-adapter.ts` | Low-level RTCPeerConnection adapter |
| `agent/extension/content_scripts/webrtc-audio-injector.js` | Audio injection in extension context |
| `browser/lib/autobrowse/src/worker/orchestrator.ts` | Autobrowse goal→step mapping |
| `browser/lib/autobrowse/src/worker/step-executor.ts` | Per-step execution + validation |
| `agent/src/rpa/executor/StepExecutor.ts` | RPA step execution with rollback |
| `agent/src/rpa/executor/StepValidator.ts` | Pre-condition validation |

## Goals
1. **WebRTC Voice Channel**: Real-time bidirectional voice via WebRTC in KELEDON Browser
2. **Cloud Decision Integration**: Voice input → STT → Cloud Decision → TTS/RPA response
3. **RPA Automation**: Deterministic browser actions (click, fill, read, wait_for...) with pre/post validation
4. **Agent Participation Compliance**: Explicit consent + evidence per `keledon_webrtc_agent_participation_v_1.md`

## Scope Boundaries
- **IN**: WebRTC signaling in Browser, STT/TTS integration, WebSocket cloud communication, RPA step executor with validation, Autobrowse integration, Agent participation consent
- **OUT**: External telephony (PSTN), Multi-party WebRTC (>2 participants), Third-party RPA platforms

## Phase 1: WebRTC Media Layer
- **Deliverable**: Media + signaling infrastructure for real-time voice in Browser
- **QA Scenarios**:
  - Scenario: Local audio loopback
    - What to verify: getUserMedia captures audio, remote stream plays back
    - Tools: webrtc-adapter.ts, webrtc-manager.js
    - Steps: 1) Initialize adapter with RTCPeerConnection, 2) Request local media, 3) Add local stream to peer, 4) Verify remote stream receives
    - Acceptance Criteria: Local audio plays back; ICE candidates exchange completes; unit tests pass

## Phase 2: Cloud Decision Integration
- **Deliverable**: Voice → STT → Cloud Brain → TTS/RPA response flow
- **QA Scenarios**:
  - Scenario: Voice cloud roundtrip
    - What to verify: Voice input captured → sent to cloud → decision received → response executed
    - Tools: webrtc-flow-orchestrator.js, WebSocket client, STT/TTS adapters
    - Steps: 1) Capture voice via getUserMedia, 2) Send to cloud via WebSocket, 3) Receive cloud command, 4) Execute TTS or RPA step, 5) Report result
    - Acceptance Criteria: Cloud receives voice; response spoken/executed

## Phase 3: RPA Automation
- **Deliverable**: Deterministic RPA execution with validation and rollback
- **QA Scenarios**:
  - Scenario: Deterministic fill with rollback
    - What to verify: Cloud sends action → executed with pre-validation → rollback on failure
    - Tools: StepExecutor.ts, StepValidator.ts, Autobrowse orchestrator
    - Steps: 1) Cloud sends `{ action: "fill", selector: "#email", value: "test@example.com" }`, 2) Pre-validate selector exists, 3) Execute action, 4) Verify result
    - Acceptance Criteria: Action executes; validation passes; rollback triggers on failure

## Phase 4: Agent Participation Compliance
- **Deliverable**: Explicit consent + evidence per canonical spec
- **QA Scenarios**:
  - Scenario: Consent flow with audit trail
    - What to verify: Consent required before agent joins; evidence captured per session
    - Tools: Consent dialog component, evidence logger
    - Steps: 1) User starts call, 2) Consent dialog shown, 3) User approves, 4) Agent joins, 5) Session ends → evidence logged
    - Acceptance Criteria: Consent stored; evidence (timestamp, transcript, commits) queryable

## Risks and Mitigations
- Risk: WebRTC ICE failures; mitigation: STUN/TURN fallback
- Risk: STT accuracy; mitigation: Test multiple providers; allow manual correction
- Risk: RPA flakiness; mitigation: Pre-condition validation + explicit selectors
- Risk: Agent participation disputes; mitigation: Evidence: timestamp, commit, transcript

## Ownership & Timeline
- Owner: Prometheus (Planner) + Cloud + Browser teams
- Phase 1: Week 1, Phase 2: Week 2, Phase 3: Week 3, Phase 4: Week 4

Plan saved to: .sisyphus/plans/2026-04-19-keledon-webrtc-rpa.md