# Manual QA Scenarios - WebRTC + RPA Integration

## Wave 1: WebRTC Media Plane

### QA-W1-1: Audio Capture Physical Test
- **Step**: Speak into microphone while observing browser DevTools → Media → getUserMedia
- **Expected**: Audio level bars move
- **Pass**: Audio is captured and visualized

### QA-W1-2: Peer Connection Physical Test  
- **Step**: Initiate call between two browser tabs using internal test page
- **Expected**: Both tabs show connected status
- **Pass**: ICE completes, tracks flow

### QA-W1-3: Audio Playback Test
- **Step**: Play audio from remote peer
- **Expected**: Audio plays through speakers without distortion
- **Pass**: Clean audio output

## Wave 2: Cloud Decision Integration

### QA-W2-1: WebSocket Connection Test
- **Step**: Connect via browser DevTools → Network → WS
- **Expected**: WS connection shows "Connected"
- **Pass**: Connection established and messageable

### QA-W2-2: End-to-End Voice Test
- **Step**: Speak phrase → Send to cloud → Hear response
- **Expected**: Full roundtrip completes within 10s
- **Pass**: Voice → TTS response heard

## Wave 3: RPA Automation

### QA-W3-1: Click Action Browser Test
- **Step**: Trigger click action → Observe UI change
- **Expected**: Element clickable, UI updates
- **Pass**: Action executed, UI reflects change

### QA-W3-2: Error Handling Test
- **Step**: Trigger action with invalid selector
- **Expected**: Rollback executes, error displayed
- **Pass**: Graceful degradation

## Wave 4: Agent Participation Compliance

### QA-W4-1: Consent Dialog Test
- **Step**: Agent attempts join → Observe consent dialog
- **Expected**: Dialog appears before join
- **Pass**: Reject/Approve both functional

### QA-W4-2: Audit Trail Test
- **Step**: Complete session → Query audit API
- **Expected**: Full transcript and events returned
- **Pass**: Complete audit trail present

## QA Procedures

### Pre-Flight Checks
- [ ] Microphone connected and permitted
- [ ] Browser is Chrome 120+
- [ ] DevTools available for debugging
- [ ] Test page loads without errors

### Post-Flight Checks
- [ ] No console errors in DevTools
- [ ] Memory returns to baseline
- [ ] WebSocket disconnects cleanly