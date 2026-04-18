# WebRTC Media Plane Requirements - KELEDON

> **Status**: T1 Deliverable - Phase 1 Wave 1
> **Date**: 2026-04-19
> **Source**: Codebase analysis + spec references

---

## 1. Media Capabilities

### Audio
| Capability | Implementation | Status |
|-----------|--------------|--------|
| Capture | `getUserMedia` via `webrtc-manager.js` | ✅ Implemented |
| Codec | Opus (audio/webm) via MediaRecorder | ✅ Implemented |
| Sample Rate | 16000 Hz (configurable) | ✅ Implemented |
| Echo Cancellation | `echoCancellation: true` | ✅ Configured |
| Noise Suppression | `noiseSuppression: true` | ✅ Configured |
| Auto Gain | `autoGainControl: true` | ✅ Configured |

### Video (Optional)
| Capability | Implementation | Status |
|-----------|--------------|--------|
| Capture | `getUserMedia` video constraints | ✅ Configured |
| Resolution | 640×480 → 1280×720 → 1920×1080 | ✅ Configured |

---

## 2. Network / Transport

### ICE Configuration
| Parameter | Value | Source |
|-----------|-------|--------|
| STUN Server | `stun:stun.l.google.com:19302` | Primary |
| STUN Backup | `stun:stun1.l.google.com:19302` | webrtc-adapter.js |
| Protocol | UDP (STUN) | Implemented |

### Media Transport
| Component | Implementation | Status |
|-----------|--------------|--------|
| Peer Connection | `RTCPeerConnection` | ✅ via webrtc-adapter.js |
| Local Tracks | `addTrack()` → peer | ✅ Implemented |
| Remote Tracks | `ontrack` event handler | ✅ Implemented |
| Offer/Answer | `createOffer`/`createAnswer` | ✅ Implemented |
| ICE Candidates | `onicecandidate` emission | ✅ Implemented |

---

## 3. State Machine

| State | Event | Transition |
|-------|-------|-----------|
| `idle` | `webrtc:start-capture` | → `ringing` |
| `ringing` | `createConnection` | → `connecting` |
| `connecting` | ICE complete | → `connected` |
| `connected` | `webrtc:end-call` | → `ended` |
| `ended` | (reset) | → `idle` |

---

## 4. Integration Points

### Cloud Communication
| Path | Purpose | Implementation |
|------|---------|--------------|
| `eventBus.on('webrtc:start-capture')` | Initiate capture | webrtc-manager.js:44 |
| `eventBus.on('webrtc:end-call')` | Terminate call | webrtc-manager.js:49 |
| `eventBus.on('webrtc:incoming-call')` | Handle incoming | webrtc-manager.js:39 |

### STT/TTS Integration
| Component | Implementation | Status |
|-----------|--------------|--------|
| STT | Web Speech API via `media-layer.ts` | ✅ Implemented |
| TTS | `speechSynthesis` via `media-layer.ts` | ✅ Implemented |
| Voice Events | `eventBus` message passing | ✅ Implemented |

### RPA Integration
| Component | Implementation |
|-----------|--------------|
| Flow Orchestration | webrtc-flow-orchestrator.js coordinates STT→TTS/RPA |
| Command Execution | Cloud decision → ui_steps → RPA |

---

## 5. Success Criteria (Pass/Fail)

### Must Pass
- [ ] `getUserMedia` returns audio stream
- [ ] Local tracks added to `RTCPeerConnection`
- [ ] ICE candidates emitted via `onicecandidate`
- [ ] Remote tracks received via `ontrack`
- [ ] Call state transitions: idle → ringing → connecting → connected → ended → idle

### Should Pass
- [ ] Audio plays back (loopback test)
- [ ] Mute/unmute functions work
- [ ] Call duration tracking accurate

### Nice to Have
- [ ] TURN server fallback (for restricted NATs)
- [ ] Video codec negotiation (VP8/VP9)
- [ ] Echo cancellation metrics

---

## 6. Test Strategy

### Unit Tests
| Test | Target | Method |
|------|--------|-------|
| ICE config parsing | webrtc-manager.js | Mock RTCPeerConnection |
| State transitions | Flow orchestrator | Event emission |
| Track addition | webrtc-adapter.js | Stub getUserMedia |

### Integration Tests
| Test | Target | Method |
|------|--------|-------|
| Full call (local) | Browser | Playwright automation |
| Cloud roundtrip | Runtime | Mock WebSocket server |

---

## 7. Dependencies

### External
- Web Speech API (browser built-in)
- STUN servers (public Google)

### Internal
- `agent/src/core/webrtc-manager.js`
- `agent/src/core/webrtc-flow-orchestrator.js`
- `runtime/src/media/adapters/webrtc-adapter.js`
- `browser/src/media/media-layer.ts`

---

## 8. Open Questions

1. **TURN**: No TURN server configured - needed for restrictive NATs?
2. **Video**: Disable by default - enable on demand?
3. **Recording**: Need call recording to file?
4. **Multiple participants**: Current design is P2P - need SFU for multi-party?

---

**End of Requirements**
Next: T2 - Architecture documentation (if needed), T3 - Lab test harness