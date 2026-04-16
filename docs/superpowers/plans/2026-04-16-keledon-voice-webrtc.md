# KELEDON Voice/WebRTC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement real-time voice communication using WebRTC, STT (Speech-to-Text), and TTS (Text-to-Speech) in the desktop agent

**Architecture:** 
- Desktop agent captures audio via WebRTC MediaStream
- STT converts speech to text using Web Speech API (primary) or VOSK (future)
- Text sent to Cloud via WebSocket for processing
- Cloud returns response, TTS converts to audio for playback

**Tech Stack:** Electron, WebRTC, Web Speech API, Socket.io

---

## Task 1: Media Layer Infrastructure

**Files:**
- Create: `browser/src/media/media-layer.ts`
- Modify: `browser/src/main.ts:183-196` (replace stub mediaLayer)
- Test: Manual verification with browser console

- [ ] **Step 1: Create media-layer.ts with full implementation**

```typescript
// browser/src/media/media-layer.ts
import { EventEmitter } from 'events';

export interface MediaLayerEvents {
  'transcript': (text: string, isFinal: boolean) => void;
  'call-status': (status: 'idle' | 'in-call' | 'on-hold') => void;
  'audio-level': (level: number) => void;
  'error': (error: Error) => void;
}

export class MediaLayer extends EventEmitter {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private currentStream: MediaStream | null = null;
  private callStatus: 'idle' | 'in-call' | 'on-hold' = 'idle';
  private isSpeaking: boolean = false;
  private isMuted: boolean = false;

  constructor() {
    super();
    this.initializeSpeechRecognition();
    this.initializeSpeechSynthesis();
  }

  private initializeSpeechRecognition(): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[MediaLayer] Speech Recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const isFinal = event.results[i].isFinal;
        this.emit('transcript', transcript, isFinal);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[MediaLayer] Recognition error:', event.error);
      this.emit('error', new Error(event.error));
    };

    this.recognition.onend = () => {
      if (this.callStatus === 'in-call') {
        this.recognition?.start();
      }
    };
  }

  private initializeSpeechSynthesis(): void {
    this.synthesis = window.speechSynthesis;
  }

  async initialize(): Promise<void> {
    console.log('[MediaLayer] Initialized');
  }

  async startCall(sessionId?: string): Promise<void> {
    try {
      this.currentStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.callStatus = 'in-call';
      this.emit('call-status', this.callStatus);
      
      if (this.recognition) {
        this.recognition.start();
      }
    } catch (error) {
      console.error('[MediaLayer] Failed to start call:', error);
      throw error;
    }
  }

  async stopCall(): Promise<void> {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
    
    this.recognition?.stop();
    this.callStatus = 'idle';
    this.emit('call-status', this.callStatus);
  }

  async speak(text: string, interruptible: boolean = true): Promise<void> {
    if (!this.synthesis) {
      console.warn('[MediaLayer] Synthesis not available');
      return;
    }

    if (interruptible && this.isSpeaking) {
      this.synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      this.isSpeaking = true;
    };

    utterance.onend = () => {
      this.isSpeaking = false;
    };

    utterance.onerror = (event) => {
      console.error('[MediaLayer] TTS error:', event.error);
      this.isSpeaking = false;
    };

    this.synthesis.speak(utterance);
  }

  async stopSpeaking(): Promise<void> {
    this.synthesis?.cancel();
    this.isSpeaking = false;
  }

  mute(): void {
    this.isMuted = true;
    if (this.currentStream) {
      this.currentStream.getAudioTracks().forEach(track => track.enabled = false);
    }
  }

  unmute(): void {
    this.isMuted = false;
    if (this.currentStream) {
      this.currentStream.getAudioTracks().forEach(track => track.enabled = true);
    }
  }

  async hold(): Promise<void> {
    this.callStatus = 'on-hold';
    this.emit('call-status', this.callStatus);
  }

  async resume(): Promise<void> {
    this.callStatus = 'in-call';
    this.emit('call-status', this.callStatus);
  }

  getCallStatus(): { status: 'idle' | 'in-call' | 'on-hold'; isSpeaking: boolean; isMuted: boolean } {
    return {
      status: this.callStatus,
      isSpeaking: this.isSpeaking,
      isMuted: this.isMuted
    };
  }
}

export const mediaLayer = new MediaLayer();
```

- [ ] **Step 2: Replace stub in main.ts**

Find lines 183-196 in main.ts and replace with:

```typescript
import { mediaLayer } from './media/media-layer.js';

const mediaLayerWrapper = {
  initialize: async () => mediaLayer.initialize(),
  getCallStatus: () => mediaLayer.getCallStatus(),
  startCall: async (sessionId?: string) => mediaLayer.startCall(sessionId),
  stopCall: async () => mediaLayer.stopCall(),
  speak: async (text: string, interruptible?: boolean) => mediaLayer.speak(text, interruptible),
  stopSpeaking: async () => mediaLayer.stopSpeaking(),
  mute: () => mediaLayer.mute(),
  unmute: () => mediaLayer.unmute(),
  hold: async () => mediaLayer.hold(),
  resume: async () => mediaLayer.resume(),
  on: (event: string, callback: any) => mediaLayer.on(event, callback),
  emit: (event: string, data?: any) => mediaLayer.emit(event, data)
};
```

- [ ] **Step 3: Update preload.ts to expose media APIs**

Add to preload.ts interface and exposure:

```typescript
// Add to interface
interface CallStatusData {
  status: 'idle' | 'in-call' | 'on-hold';
  isSpeaking?: boolean;
  isMuted?: boolean;
  duration?: number;
}

// Update media section in contextBridge
media: {
  startCall: (sessionId?: string) => ipcRenderer.invoke('media:startCall', sessionId),
  stopCall: () => ipcRenderer.invoke('media:stopCall'),
  speak: (text: string, interruptible?: boolean) => ipcRenderer.invoke('media:speak', text, interruptible),
  stopSpeaking: () => ipcRenderer.invoke('media:stopSpeaking'),
  mute: () => ipcRenderer.invoke('media:mute'),
  unmute: () => ipcRenderer.invoke('media:unmute'),
  hold: () => ipcRenderer.invoke('media:hold'),
  resume: () => ipcRenderer.invoke('media:resume'),
  getStatus: () => ipcRenderer.invoke('media:getStatus'),
  onTranscript: (callback: (data: TranscriptData) => void) => {
    ipcRenderer.on('media:transcript', (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('media:transcript');
  },
  onCallStatus: (callback: (data: CallStatusData) => void) => {
    ipcRenderer.on('media:callStatus', (_event, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('media:callStatus');
  }
}
```

- [ ] **Step 4: Update IPC handlers in main.ts**

Add/update these handlers around line 983:

```typescript
ipcMain.handle('media:getStatus', async () => {
  return mediaLayerWrapper.getCallStatus();
});

ipcMain.handle('media:speak', async (_event, text: string, interruptible: boolean = true) => {
  await mediaLayerWrapper.speak(text, interruptible);
  return { success: true };
});

// Set up media layer event forwarding
mediaLayer.on('transcript', (text: string, isFinal: boolean) => {
  mainWindow?.webContents.send('media:transcript', {
    text,
    isFinal,
    timestamp: new Date().toISOString()
  });
});

mediaLayer.on('call-status', (status: 'idle' | 'in-call' | 'on-hold') => {
  mainWindow?.webContents.send('media:callStatus', {
    status,
    ...mediaLayerWrapper.getCallStatus()
  });
});
```

- [ ] **Step 5: Test media layer**

Run: Build browser and test manually
Expected: Start call button triggers microphone permission, transcript appears in console

- [ ] **Step 6: Commit**

```bash
git add browser/src/media/ browser/src/main.ts browser/src/preload.ts
git commit -m "feat(voice): implement media layer with STT/TTS"
```

---

## Task 2: WebSocket Cloud Communication

**Files:**
- Modify: `browser/src/main.ts` - Integrate with deviceSocket
- Modify: `cloud/src/gateways/` - Add voice endpoints
- Test: Verify text flows to cloud

- [ ] **Step 1: Extend device socket to send transcripts**

In main.ts, find the deviceSocket connection and add transcript forwarding:

```typescript
function connectWebSockets(cloudUrl: string, token: string) {
  // Existing code...
  
  // Add transcript listener
  mediaLayer.on('transcript', (text: string, isFinal: boolean) => {
    if (deviceSocket && deviceSocket.connected) {
      deviceSocket.emit('voice:transcript', {
        text,
        isFinal,
        timestamp: new Date().toISOString()
      });
    }
  });
}
```

- [ ] **Step 2: Add voice event handlers in main.ts**

After connectWebSockets function, add:

```typescript
// Voice command handlers
ipcMain.handle('media:getLastTranscript', async () => {
  return { text: '', isFinal: false };
});
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(voice): connect media layer to cloud via WebSocket"
```

---

## Task 3: Cloud Decision Response

**Files:**
- Create: `cloud/src/voice/voice.gateway.ts`
- Modify: `cloud/src/decision/decision.service.ts`
- Test: Send text, receive response

- [ ] **Step 1: Create voice gateway**

```typescript
// cloud/src/voice/voice.gateway.ts
import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ namespace: 'voice', cors: { origin: '*' } })
export class VoiceGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log('[VoiceGateway] Client connected:', client.id);
  }

  @SubscribeMessage('transcript')
  handleTranscript(client: Socket, payload: { text: string; isFinal: boolean; sessionId?: string }) {
    console.log('[VoiceGateway] Transcript received:', payload.text, payload.isFinal);
    
    // TODO: Route to decision engine
    // This will be implemented in Task 4
    
    return { received: true };
  }

  sendCommand(sessionId: string, command: { say?: { text: string; interruptible: boolean }; ui_steps?: string[] }) {
    this.server.emit(`command:${sessionId}`, command);
  }
}
```

- [ ] **Step 2: Register gateway in app.module.ts**

- [ ] **Step 3: Commit**

```bash
git add cloud/src/voice/ cloud/src/app.module.ts
git commit -m "feat(cloud): add voice WebSocket gateway"
```

---

## Task 4: Decision Engine Integration

**Files:**
- Modify: `cloud/src/decision/decision.service.ts`
- Create: `cloud/src/voice/decision-handler.ts`
- Test: End-to-end voice flow

- [ ] **Step 1: Create decision handler**

```typescript
// cloud/src/voice/decision-handler.ts
import { Injectable } from '@nestjs/common';
import { DecisionService } from '../decision/decision.service';
import { VoiceGateway } from './voice.gateway';

@Injectable()
export class VoiceDecisionHandler {
  constructor(
    private decisionService: DecisionService,
    private voiceGateway: VoiceGateway
  ) {}

  async processTranscript(sessionId: string, text: string, isFinal: boolean): Promise<void> {
    if (!isFinal) return;
    
    console.log('[VoiceDecisionHandler] Processing:', text);
    
    const decision = await this.decisionService.decide(text, { sessionId });
    
    if (decision.command.say) {
      this.voiceGateway.sendCommand(sessionId, {
        say: {
          text: decision.command.say.text,
          interruptible: decision.command.say.interruptible ?? true
        },
        ui_steps: decision.command.ui_steps
      });
    }
  }
}
```

- [ ] **Step 2: Connect voice gateway to decision handler**

In voice.gateway.ts, add dependency:

```typescript
@WebSocketGateway({ namespace: 'voice', cors: { origin: '*' } })
export class VoiceGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private decisionHandler: VoiceDecisionHandler;

  constructor(private decisionHandler: VoiceDecisionHandler) {}

  afterInit(server: Server) {
    this.decisionHandler = decisionHandler;
  }

  @SubscribeMessage('transcript')
  async handleTranscript(client: Socket, payload: { text: string; isFinal: boolean; sessionId?: string }) {
    const sessionId = payload.sessionId || 'default';
    await this.decisionHandler.processTranscript(sessionId, payload.text, payload.isFinal);
    return { received: true };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(cloud): connect voice gateway to decision engine"
```

---

## Task 5: UI Call Controls

**Files:**
- Modify: `browser/renderer/index.html` - Add call control buttons
- Test: Manual test of call controls

- [ ] **Step 1: Add call control section in HTML**

Find quick-actions section (around line 146) and add:

```html
<!-- Call Controls -->
<div class="call-controls" id="callControls" style="display: none;">
  <button class="btn-call" id="startCall">📞</button>
  <button class="btn-call active" id="endCall" style="display:none;">📵</button>
  <button class="btn-call" id="muteBtn">🔊</button>
  <button class="btn-call" id="holdBtn">⏸️</button>
  <div class="call-status" id="callStatus">Idle</div>
</div>

<script>
// Add call control logic
const callControls = document.getElementById('callControls');
const startCallBtn = document.getElementById('startCall');
const endCallBtn = document.getElementById('endCall');
const muteBtn = document.getElementById('muteBtn');
const holdBtn = document.getElementById('holdBtn');
const callStatus = document.getElementById('callStatus');

startCallBtn.addEventListener('click', async () => {
  await window.keledon.media.startCall();
  callControls.style.display = 'flex';
  startCallBtn.style.display = 'none';
  endCallBtn.style.display = 'block';
  callStatus.textContent = 'In Call';
});

endCallBtn.addEventListener('click', async () => {
  await window.keledon.media.stopCall();
  startCallBtn.style.display = 'block';
  endCallBtn.style.display = 'none';
  callStatus.textContent = 'Idle';
});

muteBtn.addEventListener('click', () => {
  window.keledon.media.mute();
  muteBtn.textContent = '🔇';
});

holdBtn.addEventListener('click', async () => {
  await window.keledon.media.hold();
  callStatus.textContent = 'On Hold';
});
</script>
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(ui): add call control buttons to renderer"
```

---

## Verification

Run these commands to verify the implementation:

```bash
# Test 1: Browser builds
cd browser && npm run build

# Test 2: Cloud builds
cd cloud && npm run build

# Test 3: Start browser and check console for media layer init
# Expected: "[MediaLayer] Initialized"
```

---

**End of Voice/WebRTC Implementation Plan**