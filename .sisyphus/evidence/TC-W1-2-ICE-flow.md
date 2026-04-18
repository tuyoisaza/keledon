# TC-W1-2: RTCPeerConnection Creation and ICE Flow

## Test Case Summary
| Field | Value |
|-------|-------|
| Test ID | TC-W1-2 |
| Wave | 1 |
| Objective | Verify RTCPeerConnection initializes with ICE servers |

## Prerequisites
- STUN server reachable: `stun:stun.l.google.com:19302`
- Test environment: Chrome 120+

## Test Steps

### Step 1: Create Peer Connection
```javascript
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};
const pc = new RTCPeerConnection(config);
```

### Step 2: Verify ICE Gathering
```javascript
let iceGatheringComplete = false;

pc.onicecandidate = (event) => {
  if (event.candidate) {
    console.log('ICE candidate:', event.candidate.candidate);
  } else {
    iceGatheringComplete = true;
  }
};

// Wait for ICE gathering to complete (timeout: 5s)
await new Promise((resolve, reject) => {
  setTimeout(() => reject(new Error('ICE timeout')), 5000);
  const check = setInterval(() => {
    if (pc.iceGatheringState === 'complete') {
      clearInterval(check);
      resolve();
    }
  }, 100);
});
```

### Step 3: Cleanup
```javascript
pc.close();
```

## Expected Results
| Check | Pass Condition |
|-------|---------------|
| Connection created | `pc !== null` |
| ICE servers configured | `pc.getConfiguration().iceServers.length === 1` |
| Gathering state transitions | `iceGatheringState` reaches 'complete' within 5s |
| Candidates emitted | At least 1 ICE candidate logged |

## Evidence Artifacts
- Test execution log: `TC-W1-2-ICE-flow.log`
- ICE candidate dump: `TC-W1-2-candidates.json`

## Notes
- Public STUN server used for testing
- ICE timeout should be generous in CI environments (firewalls/NATs may delay)