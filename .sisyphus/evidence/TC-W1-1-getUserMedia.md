# TC-W1-1: Local Audio Capture via getUserMedia

## Test Case Summary
| Field | Value |
|-------|-------|
| Test ID | TC-W1-1 |
| Wave | 1 |
| Objective | Verify audio is captured from the microphone |

## Prerequisites
- Microphone connected to test machine
- Browser permission granted for microphone access
- Test environment: Chrome 120+

## Test Steps

### Step 1: Request Media
```javascript
const stream = await navigator.mediaDevices.getUserMedia({ 
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  } 
});
```

### Step 2: Verify Track
```javascript
const audioTrack = stream.getAudioTracks()[0];
assert(audioTrack.kind === 'audio');
assert(audioTrack.enabled === true);
assert(audioTrack.label.includes('Microphone'));
```

### Step 3: Cleanup
```javascript
audioTrack.stop();
```

## Expected Results
| Check | Pass Condition |
|-------|---------------|
| Stream returned | `stream.getAudioTracks().length === 1` |
| Track enabled | `audioTrack.enabled === true` |
| Label present | `audioTrack.label` contains "Microphone" |

## Evidence Artifacts
- Test execution log: `TC-W1-1-getUserMedia.log`
- Screenshot: `TC-W1-1-screenshot.png` (if available)

## Manual QA Steps
1. Speakinto microphone - level indicator should show audio input
2. Mute microphone physically - verify track detects mute

## Notes
- Uses Web Speech API (browser built-in) - no external dependencies
- Chrome desktop recommended for best getUserMedia support