# Browser UI Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance KELEDON Desktop Agent browser UI with call controls, transcript display, brain status display, and WebSocket connectivity to cloud.

**Architecture:** Electron main process connects to cloud via WebSocket (Device Gateway + Agent Gateway). IPC forwards events to renderer. Preload exposes APIs for media controls and event listeners.

**Tech Stack:** Electron, Socket.IO client, vanilla JS renderer

---

### Task 1: Update preload.ts - Expose Media and Brain APIs

**Files:**
- Modify: `browser/src/preload.ts`

- [ ] **Step 1: Read current preload.ts**

```typescript
// Read browser/src/preload.ts
```

- [ ] **Step 2: Add media and brain APIs to preload**

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('keledon', {
  // ... existing APIs
  
  media: {
    mute: () => ipcRenderer.invoke('media:mute'),
    unmute: () => ipcRenderer.invoke('media:unmute'),
    hold: () => ipcRenderer.invoke('media:hold'),
    resume: () => ipcRenderer.invoke('media:resume'),
    hangup: () => ipcRenderer.invoke('media:hangup'),
    onTranscript: (callback: (data: TranscriptData) => void) => {
      ipcRenderer.on('media:transcript', (_event, data) => callback(data));
    },
    onCallStatus: (callback: (data: CallStatusData) => void) => {
      ipcRenderer.on('media:callStatus', (_event, data) => callback(data));
    }
  },
  
  brain: {
    onCommand: (callback: (data: CommandData) => void) => {
      ipcRenderer.on('brain:command', (_event, data) => callback(data));
    },
    setDebugMode: (enabled: boolean) => ipcRenderer.invoke('brain:setDebugMode', enabled)
  }
});

interface TranscriptData {
  text: string;
  speaker: 'agent' | 'customer';
  confidence: number;
  timestamp: string;
}

interface CallStatusData {
  status: 'idle' | 'in-call' | 'on-hold';
  duration?: number;
}

interface CommandData {
  type: string;
  payload: any;
  flow_id?: string;
  timestamp: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add browser/src/preload.ts
git commit -m "feat(browser): add media and brain APIs to preload"
```

---

### Task 2: Update main.ts - Add WebSocket Client and Event Forwarding

**Files:**
- Modify: `browser/src/main.ts`

- [ ] **Step 1: Read main.ts to find import section**

```typescript
// Read first 50 lines of browser/src/main.ts
```

- [ ] **Step 2: Add Socket.IO client import and WebSocket state**

```typescript
import { io, Socket } from 'socket.io-client';
// ... existing imports

let deviceSocket: Socket | null = null;
let agentSocket: Socket | null = null;
let debugMode = false;
```

- [ ] **Step 3: Add WebSocket connection function after createWindow()**

```typescript
const connectWebSockets = (cloudUrl: string, token: string): void => {
  // Connect to Device Gateway
  deviceSocket = io(`${cloudUrl}/ws/runtime`, {
    auth: { token, device_id: runtimeStatus.deviceId },
    transports: ['websocket']
  });
  
  deviceSocket.on('connect', () => {
    log.info('Device WebSocket connected');
  });
  
  deviceSocket.on('transcript', (data) => {
    mainWindow?.webContents.send('media:transcript', data);
  });
  
  deviceSocket.on('call_status', (data) => {
    mainWindow?.webContents.send('media:callStatus', data);
  });
  
  // Connect to Agent Gateway for brain commands
  agentSocket = io(`${cloudUrl}/agent`, {
    auth: { token },
    transports: ['websocket']
  });
  
  agentSocket.on('connect', () => {
    log.info('Agent WebSocket connected');
  });
  
  // Listen for command.{sessionId} events
  agentSocket.on(`command.${runtimeStatus.sessionId}`, (command) => {
    mainWindow?.webContents.send('brain:command', command);
  });
};
```

- [ ] **Step 4: Add IPC handlers for debug mode and hangup**

```typescript
ipcMain.handle('brain:setDebugMode', async (_event, enabled: boolean) => {
  debugMode = enabled;
  return { success: true };
});

ipcMain.handle('media:hangup', async () => {
  try {
    await mediaLayer.stopCall();
    runtimeStatus.sessionId = null;
    if (deviceSocket) {
      deviceSocket.emit('session:end');
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});
```

- [ ] **Step 5: Update runtime:connect to call WebSocket after successful pairing**

Find `ipcMain.handle('runtime:connect'...)` and add after successful connection:

```typescript
// After getting authToken, connect WebSockets
connectWebSockets(config.cloudUrl, data.auth_token);
```

- [ ] **Step 6: Commit**

```bash
git add browser/src/main.ts
git commit -m "feat(browser): add WebSocket client for device and agent gateways"
```

---

### Task 3: Update index.html - Enhanced UI

**Files:**
- Modify: `browser/renderer/index.html`

- [ ] **Step 1: Read current index.html**

```html
<!-- Read browser/renderer/index.html -->
```

- [ ] **Step 2: Replace body content with enhanced UI**

```html
<body>
  <header>
    <h1>KELEDON Browser</h1>
    <div class="header-right">
      <span id="connectionStatus" class="status">Disconnected</span>
      <div class="menu-dots">●●●</div>
    </div>
  </header>
  
  <div class="device-info">
    <div class="info-item">
      <span class="label">Device:</span>
      <span id="deviceId" class="value">-</span>
    </div>
    <div class="info-item">
      <span class="label">Session:</span>
      <span id="sessionId" class="value">-</span>
    </div>
  </div>
  
  <div class="call-controls">
    <button id="muteBtn" class="btn btn-secondary">🔇 Mute</button>
    <button id="holdBtn" class="btn btn-secondary">⏸ Hold</button>
    <button id="hangupBtn" class="btn btn-danger">📞 Hang Up</button>
    <span id="callStatus" class="status-badge idle">Idle</span>
  </div>
  
  <div class="panels">
    <div class="panel">
      <div class="panel-header">
        <h2>Transcript</h2>
      </div>
      <div id="transcript" class="panel-content"></div>
    </div>
    
    <div class="panel">
      <div class="panel-header">
        <h2>Brain Status</h2>
        <label class="toggle">
          <input type="checkbox" id="debugToggle">
          <span>Debug</span>
        </label>
      </div>
      <div id="brainStatus" class="panel-content"></div>
    </div>
  </div>
  
  <div class="card">
    <h2>Cloud Connection</h2>
    <input type="text" id="cloudUrl" placeholder="Cloud URL" value="https://keledon.tuyoisaza.com">
    <input type="text" id="pairingCode" placeholder="Pairing Code">
    <button class="btn" id="connectBtn">Connect</button>
  </div>
  
  <div class="card">
    <h2>Execution</h2>
    <input type="text" id="goalInput" placeholder="Enter goal">
    <button class="btn" id="executeBtn" disabled>Execute Goal</button>
  </div>
  
  <div class="card">
    <h2>Activity Log</h2>
    <div id="activityLog" class="log"></div>
  </div>
</body>
```

- [ ] **Step 3: Add enhanced styles**

```css
<style>
  /* Add to existing styles */
  .header-right { display: flex; align-items: center; gap: 12px; }
  .menu-dots { color: #666; letter-spacing: 2px; }
  
  .device-info {
    background: #16213e;
    padding: 12px 24px;
    display: flex;
    gap: 24px;
    border-bottom: 1px solid #0f3460;
  }
  .info-item { font-size: 12px; }
  .info-item .label { color: #888; }
  .info-item .value { color: #eee; margin-left: 8px; }
  
  .call-controls {
    background: #16213e;
    padding: 12px 24px;
    display: flex;
    gap: 12px;
    align-items: center;
    border-bottom: 1px solid #0f3460;
  }
  .btn-secondary { background: #0f3460; }
  .btn-secondary:hover { background: #1a4a7a; }
  .btn-danger { background: #dc2626; }
  .btn-danger:hover { background: #b91c1c; }
  
  .status-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
  }
  .status-badge.idle { background: #374151; color: #9ca3af; }
  .status-badge.in-call { background: #16a34a; color: #fff; }
  .status-badge.on-hold { background: #f59e0b; color: #000; }
  
  .panels {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    padding: 16px 24px;
    flex: 1;
    overflow: hidden;
  }
  
  .panel {
    background: #16213e;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .panel-header {
    padding: 12px 16px;
    border-bottom: 1px solid #0f3460;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .panel-header h2 { font-size: 14px; margin: 0; }
  .panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
  }
  
  .toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; }
  .toggle input { cursor: pointer; }
  
  .transcript-entry, .command-entry {
    padding: 8px;
    margin-bottom: 8px;
    background: #1a1a2e;
    border-radius: 4px;
    font-size: 12px;
  }
  .transcript-entry .speaker { font-weight: 600; }
  .transcript-entry .speaker.agent { color: #4ade80; }
  .transcript-entry .speaker.customer { color: #60a5fa; }
  .transcript-entry .confidence { color: #888; font-size: 10px; margin-left: 8px; }
  .transcript-entry .timestamp { color: #666; font-size: 10px; }
  
  .command-entry .type { 
    display: inline-block;
    padding: 2px 8px;
    background: #e94560;
    border-radius: 4px;
    font-size: 10px;
    margin-right: 8px;
  }
  .command-entry .payload { color: #aaa; margin-top: 4px; }
  .command-entry .flow-id { color: #f59e0b; font-size: 10px; }
  .command-entry .debug-info { 
    display: none; 
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #333;
    font-size: 10px;
    color: #666;
  }
  .command-entry.show-debug .debug-info { display: block; }
</style>
```

- [ ] **Step 4: Add JavaScript for new panels**

```javascript
// Add to existing script section
const transcriptEl = document.getElementById('transcript');
const brainStatusEl = document.getElementById('brainStatus');
const muteBtn = document.getElementById('muteBtn');
const holdBtn = document.getElementById('holdBtn');
const hangupBtn = document.getElementById('hangupBtn');
const callStatusEl = document.getElementById('callStatus');
const debugToggle = document.getElementById('debugToggle');
const deviceIdEl = document.getElementById('deviceId');
const sessionIdEl = document.getElementById('sessionId');

let isMuted = false;
let isOnHold = false;
let debugMode = false;

// Load device info
async function loadDeviceInfo() {
  const info = await window.keledon.device.getInfo();
  deviceIdEl.textContent = info.deviceId;
  deviceInfo.innerHTML = `
    <p><strong>Platform:</strong> ${info.platform}</p>
    <p><strong>Electron:</strong> ${info.electron}</p>
  `;
}

// Transcript listener
window.keledon.media.onTranscript((data) => {
  const entry = document.createElement('div');
  entry.className = 'transcript-entry';
  entry.innerHTML = `
    <span class="timestamp">${new Date(data.timestamp).toLocaleTimeString()}</span>
    <span class="speaker ${data.speaker}">${data.speaker}:</span>
    ${data.text}
    <span class="confidence">${Math.round(data.confidence * 100)}%</span>
  `;
  transcriptEl.appendChild(entry);
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
});

// Call status listener
window.keledon.media.onCallStatus((data) => {
  callStatusEl.className = `status-badge ${data.status.replace('-', '-')}`;
  callStatusEl.textContent = data.status === 'in-call' ? 'In Call' : data.status === 'on-hold' ? 'On Hold' : 'Idle';
});

// Brain command listener
window.keledon.brain.onCommand((data) => {
  const entry = document.createElement('div');
  entry.className = 'command-entry';
  const payload = data.payload || {};
  const sayText = payload.say?.text || payload.text || JSON.stringify(payload);
  entry.innerHTML = `
    <span class="timestamp">${new Date(data.timestamp).toLocaleTimeString()}</span>
    <span class="type">${data.type}</span>
    <span class="payload">${sayText}</span>
    ${data.flow_id ? `<span class="flow-id">Flow: ${data.flow_id}</span>` : ''}
    <div class="debug-info">${JSON.stringify(data, null, 2)}</div>
  `;
  brainStatusEl.appendChild(entry);
  brainStatusEl.scrollTop = brainStatusEl.scrollHeight;
});

// Debug toggle
debugToggle.addEventListener('change', async (e) => {
  debugMode = e.target.checked;
  await window.keledon.brain.setDebugMode(debugMode);
  document.querySelectorAll('.command-entry').forEach(el => {
    el.classList.toggle('show-debug', debugMode);
  });
});

// Mute button
muteBtn.addEventListener('click', async () => {
  isMuted = !isMuted;
  if (isMuted) {
    await window.keledon.media.mute();
    muteBtn.textContent = '🔊 Unmute';
  } else {
    await window.keledon.media.unmute();
    muteBtn.textContent = '🔇 Mute';
  }
});

// Hold button
holdBtn.addEventListener('click', async () => {
  isOnHold = !isOnHold;
  if (isOnHold) {
    await window.keledon.media.hold();
    holdBtn.textContent = '▶ Resume';
  } else {
    await window.keledon.media.resume();
    holdBtn.textContent = '⏸ Hold';
  }
});

// Hangup button
hangupBtn.addEventListener('click', async () => {
  await window.keledon.media.hangup();
  isMuted = false;
  isOnHold = false;
  muteBtn.textContent = '🔇 Mute';
  holdBtn.textContent = '⏸ Hold';
  callStatusEl.className = 'status-badge idle';
  callStatusEl.textContent = 'Idle';
});

// Update connect to show session
const originalConnect = connectBtn.onclick;
connectBtn.onclick = async () => {
  // ... existing connect logic
  if (result.success) {
    sessionIdEl.textContent = 'session-' + Date.now();
  }
};
```

- [ ] **Step 5: Commit**

```bash
git add browser/renderer/index.html
git commit -m "feat(browser): add enhanced UI with call controls, transcript, brain status panels"
```

---

### Task 4: Test and Verify

**Files:**
- Test: Build and run the Electron app

- [ ] **Step 1: Install dependencies and build**

```bash
cd browser && npm install && npm run build
```

- [ ] **Step 2: Run in development mode**

```bash
cd browser && npm run dev
```

- [ ] **Step 3: Verify UI loads**

- [ ] **Step 4: Test cloud connection with pairing code**

- [ ] **Step 5: Commit**

```bash
git commit -m "test(browser): verify UI and cloud connection"
```

---

### Summary

| Task | Description |
|------|-------------|
| 1 | Update preload.ts with media and brain APIs |
| 2 | Update main.ts with WebSocket client |
| 3 | Update index.html with enhanced UI |
| 4 | Test and verify |
