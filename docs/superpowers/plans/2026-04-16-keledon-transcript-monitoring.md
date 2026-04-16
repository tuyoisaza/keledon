# KELEDON Transcript Monitoring Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement real-time monitoring of STT transcripts against team escalation triggers, automatically showing escalation modal when keywords are detected

**Architecture:**
- Media layer emits transcript events
- Transcript monitor checks each transcript against escalation triggers
- On match: pause call, show modal, notify cloud via WebSocket
- Modal offers: Continue (dismiss), Fix (retry), Abort (escalate)

**Tech Stack:** Electron, Media Layer, Socket.io WebSocket

---

## Task 1: Transcript Monitor Module

**Files:**
- Create: `browser/src/media/transcript-monitor.ts`
- Modify: `browser/src/main.ts` - Integrate monitor

- [ ] **Step 1: Create transcript-monitor.ts**

```typescript
// browser/src/media/transcript-monitor.ts
import { EventEmitter } from 'events';
import { mediaLayer } from './media-layer.js';

export interface EscalationMatch {
  trigger: string;
  transcript: string;
  timestamp: string;
}

export class TranscriptMonitor extends EventEmitter {
  private triggers: string[] = [];
  private isMonitoring: boolean = false;
  private lastTranscript: string = '';
  private debounceMs: number = 2000;
  private lastAlertTime: number = 0;

  setTriggers(triggers: string[]): void {
    this.triggers = triggers.map(t => t.toLowerCase());
    console.log('[TranscriptMonitor] Triggers updated:', this.triggers.length);
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('[TranscriptMonitor] Started');
    
    mediaLayer.on('transcript', (text: string, isFinal: boolean) => {
      if (isFinal) {
        this.checkTranscript(text);
      }
    });
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('[TranscriptMonitor] Stopped');
  }

  private checkTranscript(text: string): void {
    if (!text || text.trim().length < 3) return;
    
    const lowerText = text.toLowerCase();
    
    for (const trigger of this.triggers) {
      if (lowerText.includes(trigger)) {
        this.triggerEscalation(trigger, text);
        return;
      }
    }
    
    this.lastTranscript = text;
  }

  private triggerEscalation(trigger: string, transcript: string): void {
    const now = Date.now();
    
    // Debounce: don't alert more than once per 30 seconds
    if (now - this.lastAlertTime < 30000) {
      console.log('[TranscriptMonitor] Debouncing alert for:', trigger);
      return;
    }
    
    this.lastAlertTime = now;
    
    const match: EscalationMatch = {
      trigger,
      transcript,
      timestamp: new Date().toISOString()
    };
    
    console.log('[TranscriptMonitor] ESCALATION TRIGGERED:', trigger);
    console.log('[TranscriptMonitor] Transcript:', transcript);
    
    this.emit('escalation', match);
    
    // Also emit to main process via IPC (will be handled in main.ts)
    if (global.sendToMainProcess) {
      global.sendToMainProcess('transcript:escalation', match);
    }
  }

  getLastTranscript(): string {
    return this.lastTranscript;
  }

  getActiveTriggers(): string[] {
    return [...this.triggers];
  }
}

export const transcriptMonitor = new TranscriptMonitor();
```

- [ ] **Step 2: Integrate in main.ts**

Add after mediaLayer initialization (around line 315):

```typescript
// Transcript Monitor
import { transcriptMonitor } from './media/transcript-monitor.js';

// Update triggers when paired with team
function updateEscalationTriggers(triggers: string[]) {
  runtimeStatus.escalationTriggers = triggers;
  transcriptMonitor.setTriggers(triggers);
  log.info('[Escalation] Triggers updated:', triggers.length);
}

// Listen for escalation events
transcriptMonitor.on('escalation', (match) => {
  showEscalation('trigger', {
    triggerWord: match.trigger,
    message: `Detected escalation keyword: "${match.trigger}"`,
    transcript: match.transcript
  });
  
  // Send to cloud
  if (deviceSocket && deviceSocket.connected) {
    deviceSocket.emit('escalation:trigger', {
      trigger: match.trigger,
      transcript: match.transcript,
      timestamp: match.timestamp
    });
  }
});

// Start monitoring when call starts
ipcMain.handle('media:startCall', async (_event, sessionId: string) => {
  try {
    await mediaLayerWrapper.startCall(sessionId);
    runtimeStatus.sessionId = sessionId;
    transcriptMonitor.startMonitoring();
    return { success: true, sessionId };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// Stop monitoring when call ends
ipcMain.handle('media:stopCall', async () => {
  try {
    await mediaLayerWrapper.stopCall();
    runtimeStatus.sessionId = null;
    transcriptMonitor.stopMonitoring();
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add browser/src/media/transcript-monitor.ts browser/src/main.ts
git commit -m "feat(escalation): implement transcript monitoring for triggers"
```

---

## Task 2: Escalation Modal Enhancement

**Files:**
- Modify: `browser/renderer/index.html` - Enhance modal
- Modify: `browser/src/preload.ts` - Add escalation action handler

- [ ] **Step 1: Enhance escalation modal in HTML**

Find the escalation modal section (search for "escalation" in index.html) and enhance:

```html
<!-- Enhanced Escalation Modal -->
<div class="escalation-modal" id="escalationModal" style="display: none;">
  <div class="escalation-content">
    <div class="escalation-header">
      <span class="escalation-icon">⚠️</span>
      <h2>Escalation Detected</h2>
    </div>
    
    <div class="escalation-body">
      <div class="escalation-type" id="escalationType">Type: Keyword Trigger</div>
      <div class="escalation-trigger" id="escalationTrigger">Trigger: lawsuit</div>
      <div class="escalation-transcript" id="escalationTranscript">
        "I want to sue this company..."
      </div>
      <div class="escalation-message" id="escalationMessage">
        A sensitive keyword was detected in the conversation.
      </div>
    </div>
    
    <div class="escalation-actions">
      <button class="btn-escalation continue" id="escalationContinue">
        Continue Session
      </button>
      <button class="btn-escalation fix" id="escalationFix">
        Fix / Retry
      </button>
      <button class="btn-escalation abort" id="escalationAbort">
        Abort & Escalate
      </button>
    </div>
  </div>
</div>

<style>
.escalation-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.escalation-content {
  background: var(--bg-secondary);
  border: 2px solid var(--warning);
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
}

.escalation-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.escalation-icon {
  font-size: 32px;
}

.escalation-header h2 {
  color: var(--warning);
  margin: 0;
}

.escalation-body {
  margin-bottom: 20px;
}

.escalation-type {
  color: var(--text-dim);
  font-size: 12px;
  margin-bottom: 8px;
}

.escalation-trigger {
  color: var(--danger);
  font-weight: 600;
  font-size: 18px;
  margin-bottom: 12px;
}

.escalation-transcript {
  background: var(--bg-tertiary);
  padding: 12px;
  border-radius: 6px;
  font-style: italic;
  color: var(--text);
  margin-bottom: 12px;
}

.escalation-message {
  color: var(--text-dim);
  font-size: 14px;
}

.escalation-actions {
  display: flex;
  gap: 12px;
}

.btn-escalation {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-escalation.continue {
  background: var(--primary);
  color: var(--bg);
}

.btn-escalation.continue:hover {
  background: var(--primary-dim);
}

.btn-escalation.fix {
  background: var(--warning);
  color: var(--bg);
}

.btn-escalation.fix:hover {
  background: #b57d02;
}

.btn-escalation.abort {
  background: var(--danger);
  color: white;
}

.btn-escalation.abort:hover {
  background: #b93a37;
}
</style>

<script>
// Escalation modal handling
const escalationModal = document.getElementById('escalationModal');
const escalationType = document.getElementById('escalationType');
const escalationTrigger = document.getElementById('escalationTrigger');
const escalationTranscript = document.getElementById('escalationTranscript');
const escalationMessage = document.getElementById('escalationMessage');

window.keledon.escalation.onShow((data) => {
  if (data.type === 'trigger') {
    escalationType.textContent = 'Type: Keyword Trigger';
    escalationTrigger.textContent = `Trigger: ${data.data.triggerWord || 'unknown'}`;
    escalationTranscript.textContent = `"${data.data.message || ''}"`;
    escalationMessage.textContent = 'A sensitive keyword was detected. How would you like to proceed?';
  } else if (data.type === 'failure') {
    escalationType.textContent = 'Type: RPA Failure';
    escalationTrigger.textContent = `Step: ${data.data.step || 'unknown'}`;
    escalationTranscript.textContent = `"${data.data.message || ''}"`;
    escalationMessage.textContent = 'An automation step failed. How would you like to proceed?';
  }
  
  escalationModal.style.display = 'flex';
});

document.getElementById('escalationContinue').addEventListener('click', () => {
  window.keledon.escalation.onAction('continue');
  escalationModal.style.display = 'none';
});

document.getElementById('escalationFix').addEventListener('click', () => {
  window.keledon.escalation.onAction('fix');
  escalationModal.style.display = 'none';
});

document.getElementById('escalationAbort').addEventListener('click', () => {
  window.keledon.escalation.onAction('abort');
  escalationModal.style.display = 'none';
});
</script>
```

- [ ] **Step 2: Add action handler in preload.ts**

Update escalation section:

```typescript
escalation: {
  onShow: (callback: (data: { type: string; data: EscalationData }) => void) => {
    ipcRenderer.on('escalation:show', (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('escalation:show');
  },
  onAction: (callback: (action: 'continue' | 'fix' | 'abort', data?: any) => void) => {
    ipcRenderer.on('escalation:action', (_event, data) => callback(data.action, data.data));
    return () => ipcRenderer.removeAllListeners('escalation:action');
  },
  action: (action: 'continue' | 'fix' | 'abort', data?: any) => {
    ipcRenderer.invoke('escalation:action', action, data);
  }
}
```

- [ ] **Step 3: Add IPC handler in main.ts**

Add handler for escalation actions:

```typescript
ipcMain.handle('escalation:action', async (_event, action: 'continue' | 'fix' | 'abort', data?: any) => {
  log.info('[Escalation] Action:', action);
  
  // Handle each action
  if (action === 'continue') {
    // Continue with session, no changes needed
    return { success: true, action: 'continue' };
  } else if (action === 'fix') {
    // Retry the failed action (for failure type)
    return { success: true, action: 'fix' };
  } else if (action === 'abort') {
    // End session and escalate to human
    await mediaLayerWrapper.stopCall();
    if (deviceSocket && deviceSocket.connected) {
      deviceSocket.emit('escalation:abort', {
        reason: data?.reason || 'manual_abort',
        timestamp: new Date().toISOString()
      });
    }
    return { success: true, action: 'abort' };
  }
  
  return { success: false };
});
```

- [ ] **Step 4: Commit**

```bash
git add browser/renderer/index.html browser/src/preload.ts browser/src/main.ts
git commit -m "feat(ui): enhance escalation modal with actions"
```

---

## Task 3: Cloud Escalation Handling

**Files:**
- Modify: `cloud/src/gateways/device.gateway.ts` - Handle escalation events
- Create: `cloud/src/services/escalation.service.ts`

- [ ] **Step 1: Create escalation service**

```typescript
// cloud/src/services/escalation.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EscalationAlert {
  type: 'trigger' | 'failure' | 'abort';
  triggerWord?: string;
  transcript?: string;
  step?: string;
  message?: string;
  timestamp: string;
}

@Injectable()
export class EscalationService {
  constructor(private prisma: PrismaService) {}

  async logEscalation(
    deviceId: string,
    keledonId: string,
    alert: EscalationAlert
  ): Promise<void> {
    // Log to audit trail
    console.log('[EscalationService] Alert:', deviceId, alert);
    
    // TODO: Store in database for analytics
    // await this.prisma.auditLog.create({
    //   data: {
    //     userId: deviceId,
    //     action: 'escalation',
    //     entity: 'keledon',
    //     entityId: keledonId,
    //     changes: JSON.stringify(alert)
    //   }
    // });
  }

  async notifyHuman(
    teamId: string,
    alert: EscalationAlert
  ): Promise<void> {
    // TODO: Send notification to human (email, Slack, etc.)
    console.log('[EscalationService] Notify human:', teamId, alert);
  }
}
```

- [ ] **Step 2: Update device gateway**

In device.gateway.ts, add handlers:

```typescript
@SubscribeMessage('escalation:alert')
async handleEscalationAlert(
  client: Socket,
  payload: { type: string; triggerWord?: string; message?: string; timestamp: string }
) {
  console.log('[DeviceGateway] Escalation alert:', payload);
  
  const device = await this.deviceService.getDeviceBySocketId(client.id);
  if (device) {
    await this.escalationService.logEscalation(
      device.id,
      device.keledonId,
      payload as EscalationAlert
    );
  }
}

@SubscribeMessage('escalation:abort')
async handleEscalationAbort(
  client: Socket,
  payload: { reason: string; timestamp: string }
) {
  console.log('[DeviceGateway] Escalation abort:', payload);
  
  const device = await this.deviceService.getDeviceBySocketId(client.id);
  if (device?.keledonId) {
    await this.escalationService.logEscalation(
      device.id,
      device.keledonId,
      { type: 'abort', ...payload }
    );
    
    await this.escalationService.notifyHuman(
      device.teamId,
      { type: 'abort', ...payload }
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add cloud/src/services/escalation.service.ts cloud/src/gateways/device.gateway.ts
git commit -m "feat(cloud): add escalation event handling"
```

---

## Task 4: End-to-End Test

**Files:**
- Test: Manual verification

- [ ] **Step 1: Verify triggers load on device pairing**

Check that escalationTriggers are received from cloud:
```
Expected in device pairing response: team.escalationTriggers
```

- [ ] **Step 2: Test keyword detection**

Start a call and say a trigger word (e.g., "lawyer")
Expected: Modal appears with "lawyer" highlighted

- [ ] **Step 3: Test Continue action**

Click "Continue Session"
Expected: Modal closes, call continues

- [ ] **Step 4: Test Abort action**

Click "Abort & Escalate"
Expected: Call ends, escalation sent to cloud

- [ ] **Step 5: Commit**

```bash
git commit -m "test: verify escalation system end-to-end"
```

---

## Verification

```bash
# Test cloud health
curl -s https://keledon.tuyoisaza.com/health

# Test escalation event
# (Requires active device connection)
```

---

**End of Transcript Monitoring Plan**