# Draft Tests: KELEDON WebRTC + RPA Integration

## Purpose
- Define test plan and acceptance criteria for Wave 1-4 in the WebRTC + RPA integration.

## Scope
- Tests for: WebRTC media plane, cloud decision integration, RPA automation, and agent participation compliance.

## Test Strategy
- Approach: Mixed black-box (end-to-end) and white-box (internal components) where feasible.
- Execution: Agent-executed tests where possible; manual QA for critical flows.
- Evidence: Each test corresponds to an evidence artifact at `.sisyphus/evidence/`.

## Environment Assumptions
- Lab harness for WebRTC Wave 1 is available (webrtc-lab-harness.test.ts).
- Cloud endpoint stubs/mock available for Wave 2 testing; live cloud endpoint for end-to-end pilot when ready.
- RPA templates and StepExecutor tested with Playwright where applicable.

## Test Data
- Voice input samples (transcripts) for STT testing.
- UI selectors for vendor portal automation.
- Sample transcripts for gate decisions.

## Test Waves & Cases

Wave 1 – WebRTC Media Plane
- TC-1: Local media acquisition via getUserMedia; verify audio track
- TC-2: PeerConnection creation; ICE gathering lifecycle
- TC-3: Signaling exchange flow (offer/answer) using mocked signaling
- TC-4: Remote track reception and playback
- TC-5: Mute/unmute and call end path

Wave 2 – Cloud Decision Integration
- TC-6: Send transcript to cloud via WebSocket; receive decision payload
- TC-7: Validate data contracts for decision outputs
- TC-8: Gate path to RPA or TTS based on decision
- TC-9: End-to-end test harness bridging WebRTC events with cloud decisions (demo)

Wave 3 – RPA Automation
- TC-10: RPA step execution template: click/fill/wait for a simple flow
- TC-11: Validation pre-condition passes; rollback on failure
- TC-12: End-to-end RPA pilot with WebRTC-driven events

Wave 4 – Agent Participation Compliance
- TC-13: Consent capture before participation
- TC-14: Audit trail presence (transcript, events, commits)
- TC-15: Compliance verification test runs

## Evidence & Artifacts
- Each test will produce: test log, artefact screenshot/video, and a summary result placed at .sisyphus/evidence/task-<N>-<slug>..*

## Acceptance Criteria (High-Level)
- All Wave 1-4 test cases pass according to defined success criteria.
- Evidence files exist and are traceable to each test case.
- Manual QA coverage for critical flows exists.

## Open Questions
- Are cloud endpoints available for live end-to-end testing? If not, we’ll rely on mocks.
- What is the required level of telemetry in test artifacts? (latency, jank, packet loss)

---

End of Draft
