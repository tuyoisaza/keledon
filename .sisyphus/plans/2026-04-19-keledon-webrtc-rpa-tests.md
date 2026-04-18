# Plan: KELEDON WebRTC + RPA Tests

## TL;DR
- Introduce a formal test plan for Wave 1-4 of the WebRTC + RPA integration, including lab harness tests, cloud decision integration, RPA automation, and agent participation compliance. All tests produce traceable evidence and support an end-to-end test pilot when cloud endpoints are available.

## Context
- Tests align with Wave 1-4 execution plan of the ultrawork workflow. The goal is to validate media plane, cloud decision gating, and deterministic RPA flows, plus compliance.

## Test Objectives
- Verify WebRTC media plane functionality end-to-end in Wave 1
- Validate cloud decision integration surfaces and data contracts (Wave 2)
- Validate RPA templates and end-to-end automation (Wave 3)
- Validate agent participation compliance with consent and audit trails (Wave 4)

## Verification Strategy
- For each test case: provide a clear acceptance criterion and a command to reproduce, plus evidence artifact path.
- All tests will be collected under `.sisyphus/evidence/task-<N>-<slug>`

## Test Waves & Test Cases

### Wave 1: WebRTC Media Plane

#### TC-W1-1: Local audio capture via getUserMedia
- **Objective**: Verify audio is captured from the microphone
- **Prerequisites**: Microphone connected, browser permission granted
- **Steps**:
  1. Call `navigator.mediaDevices.getUserMedia({ audio: true })`
  2. Verify audio track is present in returned stream
- **Expected Output**: Audio track exists, `enabled: true`
- **Evidence**: `.sisyphus/evidence/TC-W1-1-getUserMedia.md`

#### TC-W1-2: RTCPeerConnection creation and ICE flow
- **Objective**: Verify RTCPeerConnection initializes with ICE servers
- **Prerequisites**: STUN server available
- **Steps**:
  1. Create `new RTCPeerConnection({ iceServers: [...] })`
  2. Verify `iceGatheringState` transitions to 'complete' 
- **Expected Output**: ICE gathering completes within 5 seconds
- **Evidence**: `.sisyphus/evidence/TC-W1-2-ICE-flow.md`

#### TC-W1-3: Signaling (offer/answer) handshake
- **Objective**: Verify offer/answer exchange completes
- **Prerequisites**: Mock signaling server
- **Steps**:
  1. Caller creates offer via `createOffer()`
  2. Callee receives and creates answer via `createAnswer()`
  3. Both set local/remote descriptions
- **Expected Output**: `connectionState` = 'connected'
- **Evidence**: `.sisyphus/evidence/TC-W1-3-signaling.md`

#### TC-W1-4: Remote track reception and playback
- **Objective**: Verify remote audio is received and playable
- **Prerequisites**: Two peers connected
- **Steps**:
  1. Peer A adds audio track to connection
  2. Peer B receives via `ontrack` event
  3. Attach to audio element and verify playback
- **Expected Output**: Audio plays without errors
- **Evidence**: `.sisyphus/evidence/TC-W1-4-remote-track.md`

#### TC-W1-5: Call end/cleanup
- **Objective**: Verify resources are released properly
- **Prerequisites**: Active call
- **Steps**:
  1. Call `close()` on peer connection
  2. Stop all local tracks
  3. Verify state returns to 'idle'
- **Expected Output**: No memory leaks, state = 'idle'
- **Evidence**: `.sisyphus/evidence/TC-W1-5-cleanup.md`

### Wave 2: Cloud Decision Integration

#### TC-W2-1: Transcript to cloud via WebSocket
- **Objective**: Verify transcript is sent to cloud endpoint
- **Prerequisites**: WebSocket client connected to mock cloud
- **Steps**:
  1. Send `{ event: 'voice:transcript', payload: { text: 'test', sessionId: 'xyz' } }`
  2. Verify cloud receives message
- **Expected Output**: Cloud receives matching payload
- **Evidence**: `.sisyphus/evidence/TC-W2-1-transcript-send.md`

#### TC-W2-2: Data contract conformance
- **Objective**: Verify decision payload matches expected schema
- **Prerequisites**: Cloud sends decision
- **Steps**:
  1. Receive decision payload
  2. Validate against JSON schema
- **Expected Output**: Schema validation passes
- **Evidence**: `.sisyphus/evidence/TC-W2-2-contract.md`

#### TC-W2-3: Gate to TTS/RPA
- **Objective**: Verify correct action is taken based on decision
- **Prerequisites**: Decision payload received
- **Steps**:
  1. Parse decision: if `action === 'tts'` → speak; if `action === 'rpa:execute'` → run RPA
  2. Verify correct branch executes
- **Expected Output**: Correct path chosen
- **Evidence**: `.sisyphus/evidence/TC-W2-3-gate.md`

#### TC-W2-4: Demo harness bridging WebRTC → cloud
- **Objective**: Verify full bridge works in demo mode
- **Prerequisites**: Mock cloud endpoint
- **Steps**:
  1. Simulate voice transcript
  2. Send to mock cloud
  3. Receive decision
  4. Execute TTS or RPA
- **Expected Output**: End-to-end flow completes
- **Evidence**: `.sisyphus/evidence/TC-W2-4-bridge.md`

### Wave 3: RPA Automation

#### TC-W3-1: RPA template perform basic action
- **Objective**: Verify click/fill action executes
- **Prerequisites**: Playwright page with test elements
- **Steps**:
  1. Cloud sends `{ action: 'click', selector: '#btn' }`
  2. RPAStepExecutor executes
  3. Verify element clicked
- **Expected Output**: Action succeeds, element clicked
- **Evidence**: `.sisyphus/evidence/TC-W3-1-click.md`

#### TC-W3-2: Pre-condition validation and rollback
- **Objective**: Verify validation fails gracefully
- **Prerequisites**: Non-existent selector
- **Steps**:
  1. Cloud sends `{ action: 'click', selector: '#non-existent' }`
  2. Pre-validate fails
  3. Rollback triggers
- **Expected Output**: Rollback executes, error reported
- **Evidence**: `.sisyphus/evidence/TC-W3-2-rollback.md`

#### TC-W3-3: End-to-end RPA pilot
- **Objective**: Verify complete RPA flow with WebRTC events
- **Prerequisites**: Mock vendor portal page
- **Steps**:
  1. Voice triggers RPA
  2. Cloud sends RPA command
  3. RPA executes on mock portal
  4. Result returned to TTS
- **Expected Output**: Full flow executes
- **Evidence**: `.sisyphus/evidence/TC-W3-3-e2e-pilot.md`

### Wave 4: Agent Participation Compliance

#### TC-W4-1: Consent captured before participation
- **Objective**: Verify user consent is required
- **Prerequisites**: Browser UI
- **Steps**:
  1. Agent attempts to join
  2. Consent dialog appears
  3. User approves
- **Expected Output**: Consent stored, agent joins
- **Evidence**: `.sisyphus/evidence/TC-W4-1-consent.md`

#### TC-W4-2: Audit trail presence
- **Objective**: Verify complete audit trail
- **Prerequisites**: Session completed
- **Steps**:
  1. Query audit API for session
  2. Verify transcript, events, commits present
- **Expected Output**: All expected entries present
- **Evidence**: `.sisyphus/evidence/TC-W4-2-audit-trail.md`

#### TC-W4-3: Compliance validation run
- **Objective**: Verify compliance checks pass
- **Prerequisites**: Test session
- **Steps**:
  1. Run compliance check script
  2. Verify all checks pass
- **Expected Output**: All checks pass
- **Evidence**: `.sisyphus/evidence/TC-W4-3-compliance.md`

## Test Data & Environment

### Transcript Samples
- "Check my vendor status"
- "What is my balance?"
- "Navigate to dashboard"

### RPA Selectors (Mock Portal)
- Button: `#vendor-status-btn`
- Input: `#vendor-email`
- Form: `#login-form`

### Mock Endpoints
- WebSocket: `ws://localhost:8080` (mock)
- Cloud: `https://mock-keledon-cloud.example.com`

## Evidence & Layout
- Path: `.sisyphus/evidence/TC-<WAVE>-<NUMBER>-<slug>.*`
- Formats: `.md` (summary), `.log` (test output), `.png` (screenshot)

## Acceptance Criteria
- [ ] All Wave 1-4 test cases execute with defined steps
- [ ] Expected outputs match for each test case
- [ ] Evidence artifacts exist in `.sisyphus/evidence/`
- [ ] Manual QA scenarios documented for critical flows

## Risks & Mitigations
- Mock cloud endpoints used where live not available
- Use stable selectors to minimize RPA flakiness
- Timeouts tuned for CI environment