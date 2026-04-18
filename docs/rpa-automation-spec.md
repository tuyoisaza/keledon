# RPA Automation - KELEDON WebRTC Integration

> **Status**: T9-T12 Deliverable - Phase 3 Wave 3
> **Date**: 2026-04-19

---

## T9: RPA Objectives (Aligned to WebRTC Events)

### Event → Action Mapping
| WebRTC Event | RPA Action |
|--------------|------------|
| `voice:transcript` (final) | Queue cloud decision |
| `decision:rpa:execute` | Execute RPA step |
| `decision:rpa:goto` | Navigate URL |
| `call:end` | Cleanup RPA state |

---

## T10: RPA Templates

### Core Actions
| Action | Parameters | Description |
|--------|------------|-------------|
| `click` | `selector`, `timeout` | Click element |
| `fill` | `selector`, `value` | Fill input |
| `wait_for` | `selector`, `timeout` | Wait for element |
| `read` | `selector` | Read text content |
| `select` | `selector`, `value` | Select dropdown |
| `hover` | `selector` | Hover element |

### Template Structure
```json
{
  "action": "click",
  "selector": "#vendor-status",
  "timeout": 5000,
  "rollback_on_failure": "refresh"
}
```

---

## T11: Test Cases

### Positive Scenarios
1. **Click**: User says "check status" → Cloud sends click("#status-btn") → Executed → Validated
2. **Fill**: User says "enter email" → Cloud sends fill("#email", "test@...") → Executed → Validated
3. **Navigate**: User says "go to dashboard" → Cloud sends goto("/dashboard") → Navigated

### Negative Scenarios
1. **Selector missing**: Elements not found → Pre-validate fails → Rollback triggered
2. **Timeout**: Action exceeds timeout → Retry or fail gracefully
3. **Network error**: Cloud unreachable → Queue locally, retry on reconnect

---

## T12: End-to-End Pilot

### Flow
```
Voice Input → STT → Cloud Decision → RPA Step → Validation → TTS Response
```

### Current Implementation
- `RPAStepExecutor` handles step execution with pre/post validation
- `webrtc-flow-orchestrator` coordinates the flow
- WebSocket client sends voice / receives decisions

### Gap: Need live cloud endpoint for full pilot

---

**End of RPA Automation Specification**
Next: T13-T15 (Agent Participation Compliance)