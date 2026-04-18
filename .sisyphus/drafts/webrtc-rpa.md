# Draft Plan: KELEDON WebRTC + RPA Integration

## Metadata
- **Plan Name**: 2026-04-19-keledon-webrtc-rpa
- **Status**: Draft (in review)
- **Owner**: Prometheus (Planner)
- **Target**: Complete Phases 1-3 within 4 weeks

---

## TL;DR
Establish end-to-end voice conversations via WebRTC for KELEDON Browser and deterministic RPA automation for vendor portal actions, backed by the "cloud decision, agent execution" contract, enabling real-time voice and automated workflow execution.

---

## Context
- **KELEDON Browser**: Electron app with embedded Chrome for desktop automation
- **Cloud Brain**: Centralized decision engine (via WebSocket)
- **Voice Agent**: Real-time WebRTC for voice input/output
- **RPA**: Browser automation for vendor portal actions (deterministic, pre/post validated, with rollback)
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

---

## Goals
1. **WebRTC Voice Channel**: Real-time bidirectional voice via WebRTC in KELEDON Browser
2. **Cloud Decision Integration**: Voice input → STT → Cloud Decision → TTS/RPA response
3. **RPA Automation**: Deterministic browser actions (click, fill, read, wait_for...) with pre/post validation
4. **Agent Participation Compliance**: Explicit consent + evidence per `keledon_webrtc_agent_participation_v_1.md`

---

## Scope Boundaries

### IN
- WebRTC signaling in KELEDON Browser (Electron)
- STT (Speech-to-Text) integration
- TTS (Text-to-Speech) integration
- WebSocket cloud communication for voice events
- RPA step executor with pre/post validation
- Autobrowse orchestrator integration
- Agent participation consent flow

### OUT
- External telephony (PSTN) — future Phase
- Multi-party WebRTC (more than 2 participants) — future Phase
- Third-party RPA platforms — future Phase

---

## Phase 1: WebRTC Media Layer

### Deliverable
Media + signaling infrastructure for real-time voice in KELEDON Browser.

### Actions
1. **Media Layer Infrastructure** (from existing `keledon-voice-webrtc.md` Task 1)
   - Initialize `webrtc-adapter.ts` with `RTCPeerConnection`
   - Implement `getUserMedia` for audio capture
   - Add local/remote stream handling
2. **Signaling Hub**
   - Refactor `webrtc-manager.js` as event emitter
   - Add ICE candidate handling
3. **Integration Hooks**
   - Wire into `webrtc-flow-orchestrator.js`
   - Add state transitions (idle → listening → processing → speaking → idle)
4. **Testing**
   - Unit tests for WebRTCAdapter (mock RTCPeerConnection)
   - Integration test with local loopback

### Acceptance Criteria
- [ ] Local audio captures via getUserMedia and plays back
- [ ] ICE candidate exchange completes (local)
- [ ] State machine transitions correctly
- [ ] Unit tests pass

---

## Phase 2: Cloud Decision Integration

### Deliverable
Voice → STT → Cloud Brain → TTS/RPA response flow.

### Actions
1. **STT Integration**
   - Integrate Web Speech API or VOSK for local STT
2. **WebSocket Cloud Communication**
   - Implement voice event transmission from browser to cloud
   - Receive commands from cloud (TTS, RPA steps)
3. **TTS Integration**
   - Integrate Web Speech API TTS
   - Queue management for responses
4. **Flow Orchestration**
   - Refactor `webrtc-flow-orchestrator.js` to connect STT → Cloud → TTS/RPA
5. **Testing**
   - E2E voice roundtrip test (speak → cloud decision → response)

### Acceptance Criteria
- [ ] Voice input captured and sent to cloud
- [ ] Cloud decision received and executed (TTS or RPA)
- [ ] Response spoken back to user

---

## Phase 3: RPA Automation

### Deliverable
Deterministic RPA execution with validation and rollback.

### Actions
1. **Step Executor Refinement**
   - Finalize `StepExecutor.ts` with pre/post validation
   - Add rollback support
2. **Autobrowse Integration**
   - Wire `orchestrator.ts` to cloud decision commands
   - Add step grouping for parallelization
3. **Cloud → RPA Command Flow**
   - Define command schema: `{ action, selector, value, timeout, rollback_on_failure }`
   - Map cloud commands to RPA step execution
4. **Testing**
   - Playwright-based test for deterministic steps
   - Rollback test

### Acceptance Criteria
- [ ] Cloud sends RPA command → step executed in browser
- [ ] Pre-condition validation passes before action
- [ ] Rollback triggers on failure
- [ ] Results reported back to cloud

---

## Phase 4: Agent Participation Compliance

### Deliverable
Explicit consent + evidence per canonical spec.

### Actions
1. **Consent Flow**
   - Add "Agent Participation" consent dialog
   - Store consent per session (local)
2. **Evidence Collection**
   - Capture meeting start/commit timestamp
   - Log agent join/leave events
   - Capture session transcript screenshot
3. **Compliance Audit**
   - Audit trail accessible for review

### Acceptance Criteria
- [ ] Consent required before agent joins
- [ ] Evidence captured per session
- [ ] Audit trail queryable

---

## QA Scenarios

### WebRTC Scenarios
1. **Local audio loopback**: Verify getUserMedia + remote stream plays
2. **Cloud roundtrip**: Speak → STT → Cloud → TTS → speak back
3. **State transitions**: Idle → Listening → Processing → Speaking → Idle

### RPA Scenarios
1. **Deterministic fill**: Cloud sends `fill("input#email", "test@example.com")` → verified
2. **Validation failure**: Pre-validate fails before action → rollback triggers
3. **Parallel steps**: Two independent clicks in same flow execute in parallel

### Combined Scenarios
1. **Voice-triggered RPA**: Voice "Check my vendor status" → STT → Cloud sends RPA step → fills vendor portal → reads result → TTS reads result
2. **Agent participation**: User joins call → consents → agent joins → speaks → leaves → evidence logged

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| WebRTC ICE failures | Use STUN/TURN fallback |
| STT accuracy | Test multiple providers; allow manual correction |
| RPA flakiness | Pre-condition validation + explicit selectors |
| Agent participation disputes | Evidence: timestamp, commit, transcript |

---

## Ownership & Timeline
- **Owner**: Prometheus (Planner) + Cloud + Browser teams
- **Phase 1**: Week 1
- **Phase 2**: Week 2
- **Phase 3**: Week 3
- **Phase 4**: Week 4

---

**Next**: Review with Momus for high-accuracy validation.