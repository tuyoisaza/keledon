# Cloud Decision Integration - KELEDON WebRTC

> **Status**: T5-T8 Deliverable - Phase 2 Wave 2
> **Date**: 2026-04-19

---

## T5: API Surface

### Voice Event Schema
```json
{
  "event": "voice:transcript",
  "payload": {
    "text": "Check my vendor status",
    "isFinal": true,
    "sessionId": "uuid",
    "timestamp": "ISO-8601"
  }
}
```

### Cloud Decision Response Schema
```json
{
  "decision": {
    "action": "rpa:execute",
    "params": {
      "selector": "#vendor-status",
      "action": "click"
    },
    "response": {
      "text": "Clicking vendor status now"
    },
    "tts": true
  }
}
```

---

## T6: Integration Layer

### Connection
| Component | Path | Status |
|-----------|------|--------|
| WebSocket Client | `agent/src/core/websocket-client.js` | ✅ Implemented |
| Session Manager | `agent/src/core/session-manager.js` | ✅ Implemented |
| Event Bus | Node Events | ✅ Implemented |

### Flow
1. **Voice Input** (STT) → `eventBus.emit('voice:transcript', text)`
2. **WebSocket** → Send to cloud: `{ event: 'voice:transcript', payload: { text } }`
3. **Cloud Decision** → Receive: `{ decision: { action, params, response } }`
4. **Execute** → If `rpa:execute` → Run RPA step; If `tts` → Speak response

---

## T7: Data Contracts

### Outgoing (Agent → Cloud)
| Field | Type | Required |
|-------|------|---------|
| `event` | string | ✅ |
| `payload.text` | string | ✅ |
| `payload.sessionId` | string | ✅ |
| `payload.timestamp` | ISO-8601 | ✅ |

### Incoming (Cloud → Agent)
| Field | Type | Required |
|-------|------|---------|
| `decision.action` | string | ✅ |
| `decision.params` | object | For RPA |
| `decision.response.text` | string | For TTS |
| `decision.tts` | boolean | Optional |

---

## T8: Demo Integration Test

Current state:
- WebSocket client connects to cloud endpoint
- Events flow: `voice:transcript` → WebSocket → Cloud
- RPA execution via `webrtc-flow-orchestrator.js`

**Gap identified**: Need live cloud endpoint for full E2E demo.

---

**End of Cloud Integration Specification**
Next: T9-T12 (RPA Automation)