# KELEDON CONTRACTS V1

This document is the **Law** for communication between Cloud and Agent. No field may be added or removed without incrementing the version.

## 1. WebSocket Events (Cloud <-> Agent)

### 1.1 Agent -> Cloud

#### `AUDIO_CHUNK`
Stream raw audio bytes from the browser tab or microphone.
```json
{
  "type": "audio/webm",
  "payload": "<base64_encoded_chunk>",
  "source": "mic" | "tab",
  "timestamp": 1234567890
}
```

#### `FLOW_RESULT`
Result of a deterministic execution command.
```json
{
  "correlation_id": "uuid-v4",
  "status": "SUCCESS" | "FAILURE",
  "data": { ...extracted_data }, // Optional, if reading data
  "error": {
    "step_index": 3,
    "action": "click",
    "message": "Element #submit-btn not found after 5000ms"
  }
}
```

#### `PAGE_SNAPSHOT`
Periodic or event-driven snapshot of the current DOM state (for debugging/context).
```json
{
  "url": "https://...",
  "title": "Page Title",
  "dom_hash": "sha256-hash",
  "html_snippet": "..." // heavily truncated or sanitized
}
```

### 1.2 Cloud -> Agent

#### `EXECUTE_FLOW`
Command to run a specific deterministic sequence.
```json
{
  "correlation_id": "uuid-v4",
  "flow_id": "flow_login_v1",
  "params": {
    "username": "user@example.com",
    "password": "..."
  }
}
```

#### `PLAY_AUDIO`
Stream TTS audio to be played in the browser.
```json
{
  "format": "mp3",
  "payload": "<base64_encoded_chunk>",
  "interruptible": true
}
```

#### `STOP_EXECUTION`
Emergency stop or barge-in interrupt.
```json
{
  "reason": "user_interruption" | "system_error"
}
```

## 2. Data Types

### `FlowID`
String. Format: `domain_action_version` (e.g., `genesys_answer_v3`, `salesforce_create_case_v1`).

### `Selector`
String. CSS Selector or XPath. Must be robust and verified during recording.
