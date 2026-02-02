# KELEDON V1 - Canonical Technical Spec (Production)

**Status: IN PROGRESS - This content needs to be populated from GitHub source**

This document is the **technical source of truth** for KELEDON V1.

---

## CORE ARCHITECTURE

KELEDON consists of:

1. **Browser Agent** (Chrome Extension)
2. **Cloud Brain** (Backend Service)
3. **Canonical Contracts** (Event Schemas)

---

## RUNTIME CONTRACTS

### Agent → Cloud Events

All events follow this structure:
```json
{
  "session_id": "string",
  "event_type": "text_input | ui_result | system",
  "payload": {},
  "ts": "ISO-8601",
  "agent_id": "string"
}
```

### Cloud → Agent Commands

```json
{
  "say": { "text": "string", "interruptible": true },
  "ui_steps": ["step_id_1", "step_id_2"],
  "confidence": 0.0,
  "mode": "normal | safe",
  "flow_id": "string",
  "flow_run_id": "string"
}
```

---

## DATA MODEL (MINIMUM)

- `sessions`
- `events` (append-only)
- `flows`
- `flow_runs`
- `ui_executions`

---

## ACCEPTANCE CRITERIA

KELEDON V1 is complete when:
1. One inbound WebRTC flow runs end-to-end
2. All events are persisted and replayable
3. Side Panel reflects real runtime state
4. No demo data exists in production mode

---

## AUTHORITY

This document overrides all other specifications.
All implementation must comply with these contracts.