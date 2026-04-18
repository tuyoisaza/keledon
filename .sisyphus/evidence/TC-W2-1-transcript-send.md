# TC-W2-1: Transcript to Cloud via WebSocket

## Test Case Summary
| Field | Value |
|-------|-------|
| Test ID | TC-W2-1 |
| Wave | 2 |
| Objective | Verify transcript is sent to cloud endpoint |

## Prerequisites
- WebSocket client connected to mock cloud server
- Session ID: `test-session-001`

## Test Steps

### Step 1: Connect to Mock Cloud
```javascript
const ws = new WebSocket('ws://localhost:8080');
await new Promise(r => ws.onopen = r);
```

### Step 2: Send Transcript
```javascript
const payload = {
  event: 'voice:transcript',
  payload: {
    text: 'Check my vendor status',
    isFinal: true,
    sessionId: 'test-session-001',
    timestamp: new Date().toISOString()
  }
};
ws.send(JSON.stringify(payload));
```

### Step 3: Verify Receipt
```javascript
const received = await new Promise(r => ws.onmessage = e => r(JSON.parse(e.data)));
assert(received.event === 'voice:transcript');
assert(received.payload.text === 'Check my vendor status');
```

## Expected Results
| Check | Pass Condition |
|-------|---------------|
| Connection | WebSocket state = OPEN |
| Sent | Message delivered to server |
| Acknowledged | Server response received |

## Evidence Artifacts
- WebSocket log: `TC-W2-1-ws-log.json`

## Manual QA Steps
1. Open browser DevTools → Network
2. Filter by "ws://"
3. Verify message in Frames tab