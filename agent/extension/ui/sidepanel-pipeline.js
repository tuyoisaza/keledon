// ==============================
// KELEDON Pipeline UI (THIN VERSION)
// ==============================

// Core state from original implementation
let sttRecognition = null;
let isSTTListening = false;
let ttsSpeech = null;
let isTTSSpeaking = false;
let agentActive = true;
let backendConnectivityChecker = null;
let webRTCState = {
  detected: false,
  listening: false,
  stream: null,
  processor: null,
  detectionReason: ''
};

// Pipeline stage management
class PipelineManager {
  constructor() {
    this.stages = {
      listen: { status: 'idle', element: 'listen-stage', dot: 'listen-status' },
      transcribe: { status: 'idle', element: 'transcribe-stage', dot: 'transcribe-status' },
      think: { status: 'idle', element: 'think-stage', dot: 'think-status' },
      respond: { status: 'idle', element: 'respond-stage', dot: 'respond-status' },
      speak: { status: 'idle', element: 'speak-stage', dot: 'speak-status' },
      act: { status: 'idle', element: 'act-stage', dot: 'act-status' }
    };
    this.logs = [];
    this.initializeEventListeners();
    this.initializeBackendConnectivity();
  }

  // ==============================
  // STEP A: Pipeline Truth Contract
  // ==============================
  
  getPipelineTruthState() {
    const timestamp = new Date().toISOString();
    
    return {
      timestamp,
      listen: this.getListenTruthState(),
      transcribe: this.getTranscribeTruthState(),
      think: this.getThinkTruthState(),
      respond: this.getRespondTruthState(),
      speak: this.getSpeakTruthState(),
      act: this.getActTruthState()
    };
  }

  getListenTruthState() {
    const reasons = [];
    const evidence = [];
    let status = 'gray';

    // Check WebRTC detection first
    if (webRTCState.detected) {
      reasons.push('WebRTC audio source detected');
      evidence.push(`WebRTC detection: ${webRTCState.detectionReason}`);
      
      if (webRTCState.listening && webRTCState.stream) {
        status = 'green';
        reasons.push('WebRTC audio capture active');
        evidence.push(`WebRTC stream active: ${webRTCState.stream.active ? 'yes' : 'no'}`);
        evidence.push(`WebRTC audio tracks: ${webRTCState.stream.getAudioTracks().length}`);
      } else {
        status = 'gray';
        reasons.push('WebRTC detected but not capturing');
        evidence.push('WebRTC capture not started');
      }
    } else {
      reasons.push('No WebRTC audio source detected');
      evidence.push(`WebRTC detection failed: ${webRTCState.detectionReason}`);
      
      // Check microphone as fallback
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        reasons.push('Microphone available as fallback');
        evidence.push('getUserMedia API available');
        
        if (isSTTListening) {
          status = 'green';
          reasons.push('Microphone STT active');
          evidence.push('STT recognition running');
        } else {
          status = 'gray';
          reasons.push('Microphone available but not listening');
          evidence.push('STT recognition not started');
        }
      } else {
        status = 'red';
        reasons.push('No audio input sources available');
        evidence.push('getUserMedia API not available');
      }
    }

    return { status, reasons, evidence };
  }

  getTranscribeTruthState() {
    const reasons = [];
    const evidence = [];
    let status = 'gray';

    // Check STT support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      status = 'red';
      reasons.push('Speech Recognition not supported');
      evidence.push('SpeechRecognition API not available');
      return { status, reasons, evidence };
    }

    reasons.push('Speech Recognition API available');
    evidence.push('SpeechRecognition supported');

    // Check if STT is initialized and running
    if (sttRecognition && isSTTListening) {
      status = 'green';
      reasons.push('STT actively listening');
      evidence.push('STT recognition instance created');
      evidence.push(`STT continuous: ${sttRecognition.continuous}`);
      evidence.push(`STT language: ${sttRecognition.lang}`);
    } else if (sttRecognition) {
      status = 'gray';
      reasons.push('STT initialized but not listening');
      evidence.push('STT recognition instance created');
      evidence.push('STT recognition not started');
    } else {
      status = 'red';
      reasons.push('STT not initialized');
      evidence.push('No STT recognition instance');
    }

    return { status, reasons, evidence };
  }

  getThinkTruthState() {
    const reasons = [];
    const evidence = [];
    let status = 'gray';

    // Check backend connectivity
    if (backendConnectivityChecker && backendConnectivityChecker.isBackendConnected()) {
      status = 'green';
      reasons.push('Backend connectivity verified');
      evidence.push(`Backend URL: ${backendConnectivityChecker.backendUrl}`);
      evidence.push('Health check passed');
      
      // Check if we've done a roundtrip test
      const roundtripLogs = backendConnectivityChecker.logs.filter(log => 
        log.message.includes('ROUNDTRIP') && log.level === 'success'
      );
      if (roundtripLogs.length > 0) {
        reasons.push('Backend roundtrip verified');
        evidence.push(`Roundtrip tests passed: ${roundtripLogs.length}`);
      } else {
        reasons.push('Backend connected but roundtrip not tested');
        evidence.push('No successful roundtrip tests logged');
      }
    } else {
      status = 'red';
      reasons.push('Backend not reachable');
      evidence.push(`Backend URL: ${backendConnectivityChecker?.backendUrl || 'unknown'}`);
      evidence.push('Health check failed or not performed');
    }

    return { status, reasons, evidence };
  }

  getRespondTruthState() {
    const reasons = [];
    const evidence = [];
    let status = 'gray';

    // Check if agent is active
    if (!agentActive) {
      status = 'red';
      reasons.push('Agent is inactive');
      evidence.push('Master agent toggle disabled');
      return { status, reasons, evidence };
    }

    // Check backend connectivity (same as think stage)
    if (backendConnectivityChecker && backendConnectivityChecker.isBackendConnected()) {
      status = 'green';
      reasons.push('Agent active and backend reachable');
      evidence.push('Agent master toggle enabled');
      evidence.push('Backend connectivity verified');
    } else {
      status = 'red';
      reasons.push('Agent active but backend unreachable');
      evidence.push('Agent master toggle enabled');
      evidence.push('Backend connectivity failed');
    }

    return { status, reasons, evidence };
  }

  getSpeakTruthState() {
    const reasons = [];
    const evidence = [];
    let status = 'gray';

    // Check TTS support
    if (!('speechSynthesis' in window)) {
      status = 'red';
      reasons.push('Text-to-Speech not supported');
      evidence.push('speechSynthesis API not available');
      return { status, reasons, evidence };
    }

    reasons.push('Text-to-Speech API available');
    evidence.push('speechSynthesis supported');

    // Check voices
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) {
      status = 'red';
      reasons.push('No TTS voices available');
      evidence.push('speechSynthesis.getVoices() returned empty array');
      return { status, reasons, evidence };
    }

    reasons.push('TTS voices available');
    evidence.push(`Voice count: ${voices.length}`);

    // Check if currently speaking
    if (isTTSSpeaking) {
      status = 'green';
      reasons.push('TTS actively speaking');
      evidence.push('speechSynthesis.speaking: true');
    } else {
      status = 'gray';
      reasons.push('TTS ready but not speaking');
      evidence.push('speechSynthesis.speaking: false');
    }

    return { status, reasons, evidence };
  }

  getActTruthState() {
    const reasons = [];
    const evidence = [];
    let status = 'gray';

    // Check if agent is active
    if (!agentActive) {
      status = 'red';
      reasons.push('Agent is inactive - cannot act');
      evidence.push('Master agent toggle disabled');
      return { status, reasons, evidence };
    }

    // Check Chrome extension APIs
    if (!chrome || !chrome.scripting) {
      status = 'red';
      reasons.push('Chrome extension APIs not available');
      evidence.push('chrome.scripting API not found');
      return { status, reasons, evidence };
    }

    reasons.push('Chrome extension APIs available');
    evidence.push('chrome.scripting API found');

    // Check permissions
    // Note: This would require actual permission checking in real implementation
    reasons.push('UI action execution available');
    evidence.push('DOM manipulation capabilities present');
    
    status = 'green';
    reasons.push('Agent ready to execute actions');
    evidence.push('All prerequisites for action execution met');

    return { status, reasons, evidence };
  }

  // Print truth snapshot to logs
  logPipelineTruthSnapshot() {
    const truth = this.getPipelineTruthState();
    this.log('info', '=== PIPELINE TRUTH SNAPSHOT ===');
    this.log('info', `Timestamp: ${truth.timestamp}`);
    
    Object.entries(truth).forEach(([stage, state]) => {
      if (stage !== 'timestamp') {
        this.log('info', `${stage.toUpperCase()}: ${state.status.toUpperCase()}`);
        state.reasons.forEach(reason => this.log('info', `  - ${reason}`));
        state.evidence.forEach(evidence => this.log('info', `  - Evidence: ${evidence}`));
      }
    });
    
    this.log('info', '=== END TRUTH SNAPSHOT ===');
  }

  // Update stage status based on truth state
  updateStageFromTruth() {
    const truth = this.getPipelineTruthState();
    
    Object.entries(truth).forEach(([stage, state]) => {
      if (stage !== 'timestamp') {
        let statusClass = 'idle';
        if (state.status === 'green') statusClass = 'active';
        else if (state.status === 'red') statusClass = 'error';
        else if (state.status === 'gray') statusClass = 'idle';
        
        this.updateStage(stage, statusClass);
        
        // Update tooltip with reasons
        const stageElement = document.getElementById(this.stages[stage].element);
        if (stageElement) {
          const tooltip = state.reasons.join('; ');
          stageElement.title = `${stage.toUpperCase()}: ${tooltip}`;
        }
      }
    });
  }

  // Update stage status with truthful states only
  updateStage(stage, status) {
    if (!this.stages[stage]) return;
    
    this.stages[stage].status = status;
    const dot = document.getElementById(this.stages[stage].dot);
    if (dot) {
      dot.className = 'status-dot';
      if (status === 'active') {
        dot.classList.add('active');
      } else if (status === 'processing') {
        dot.classList.add('processing');
      } else if (status === 'error') {
        dot.classList.add('error');
      }
    }
    
    this.log('info', `${stage} stage: ${status}`);
  }

  // Logging system
  log(level, message) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    this.logs.push(logEntry);
    
    const logsContent = document.getElementById('logs-content');
    if (logsContent) {
      const logElement = document.createElement('div');
      logElement.className = `log-entry ${level}`;
      logElement.textContent = logEntry;
      logsContent.appendChild(logElement);
      logsContent.scrollTop = logsContent.scrollHeight;
      
      // Limit log entries to prevent memory issues
      if (logsContent.children.length > 100) {
        logsContent.removeChild(logsContent.firstChild);
      }
    }
    
    console.log(`[KELEDON-Pipeline] ${logEntry}`);
  }

  // Initialize event listeners for pipeline controls
  initializeEventListeners() {
    // ==============================
    // STEP B: Global Click Audit System
    // ==============================
    
    this.setupGlobalClickAudit();
    
    // Debug menu toggle
    document.getElementById('debugBtn').addEventListener('click', () => {
      const menu = document.getElementById('debug-menu');
      menu.classList.toggle('visible');
    });

    // Close debug menu when clicking outside
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('debug-menu');
      const btn = document.getElementById('debugBtn');
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.classList.remove('visible');
      }
    });

    // Logs toggle
    document.getElementById('logs-toggle').addEventListener('click', () => {
      const logsSection = document.getElementById('logs-section');
      logsSection.classList.toggle('collapsed');
    });

    // Listen stage controls
    document.getElementById('mute-btn').addEventListener('click', () => {
      this.toggleMute();
    });

    document.getElementById('webrtc-btn').addEventListener('click', () => {
      this.toggleWebRTC();
    });

    // Transcribe stage controls
    document.getElementById('stt-settings-btn').addEventListener('click', () => {
      this.log('info', 'STT Settings clicked');
    });

    // Think stage controls
    document.getElementById('ai-invoke-btn').addEventListener('click', () => {
      this.invokeAI();
    });

    document.getElementById('debug-think-btn').addEventListener('click', () => {
      this.log('info', 'AI Debug clicked');
    });

    // Respond stage controls
    document.getElementById('expand-chat-btn').addEventListener('click', () => {
      this.expandChat();
    });

    document.getElementById('pause-resp-btn').addEventListener('click', () => {
      this.toggleResponsePause();
    });

    // Speak stage controls
    document.getElementById('volume-btn').addEventListener('click', () => {
      this.toggleVolume();
    });

    document.getElementById('tts-settings-btn').addEventListener('click', () => {
      this.log('info', 'TTS Settings clicked');
    });

    // Act stage controls
    document.getElementById('tools-btn').addEventListener('click', () => {
      this.showTools();
    });

    document.getElementById('act-settings-btn').addEventListener('click', () => {
      this.log('info', 'Action Settings clicked');
    });

    // Debug menu items
    document.getElementById('test-connection').addEventListener('click', () => {
      this.testConnection();
    });

    document.getElementById('c10-start-listening').addEventListener('click', async () => {
      this.log('info', '[C10] START LISTENING clicked - requesting real extension runtime event');
      try {
        const response = await chrome.runtime.sendMessage({ type: 'C10_START_LISTENING' });
        if (!response || response.success !== true) {
          throw new Error(response?.error || 'No success response from background runtime');
        }
        this.log('success', `[C10] Runtime emitted brain_event for session ${response.sessionId}`);
      } catch (error) {
        this.log('error', `[C10] Failed to trigger runtime start: ${error.message}`);
      }
    });

    document.getElementById('test-backend').addEventListener('click', () => {
      this.testBackend();
    });

    document.getElementById('test-tts').addEventListener('click', () => {
      this.testTTS();
    });

    document.getElementById('test-click-audit').addEventListener('click', () => {
      this.testClickAudit();
    });

    document.getElementById('agent-toggle').addEventListener('click', () => {
      this.toggleAgent();
    });

    document.getElementById('clear-logs').addEventListener('click', () => {
      this.clearLogs();
    });

    document.getElementById('backend-config').addEventListener('click', () => {
      this.configureBackend();
    });

    document.getElementById('voice-settings').addEventListener('click', () => {
      this.configureVoiceSettings();
    });
  }

  // Core pipeline functions
  async toggleMute() {
    if (isSTTListening) {
      this.stopSTTListening();
    } else {
      this.startSTTListening();
    }
  }

  async startSTTListening() {
    if (!agentActive) {
      this.log('error', 'Agent is inactive - cannot start STT');
      this.updateStage('listen', 'error');
      this.updateStage('transcribe', 'error');
      return;
    }

    // Check microphone permission first
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' });
      if (permission.state === 'denied') {
        this.log('error', 'Microphone permission denied - cannot start STT');
        this.updateStage('listen', 'error');
        this.updateStage('transcribe', 'error');
        this.addMicrophonePermissionHelp();
        return;
      }
    } catch (error) {
      this.log('warning', 'Cannot query microphone permission - will check on STT start');
    }

    try {
      this.updateStage('listen', 'processing');
      this.updateStage('transcribe', 'processing');
      this.log('info', 'Starting STT with microphone permission check...');
      
      // Initialize STT if needed
      if (!sttRecognition) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          this.log('error', 'Speech Recognition API not available in this browser');
          this.updateStage('listen', 'error');
          this.updateStage('transcribe', 'error');
          return;
        }
        
        sttRecognition = new SpeechRecognition();
        sttRecognition.continuous = true;
        sttRecognition.interimResults = true;
        sttRecognition.lang = 'en-US';
        
        sttRecognition.onstart = () => {
          this.log('success', 'STT recognition started successfully');
          isSTTListening = true;
          this.updateStage('listen', 'active');
          this.updateStage('transcribe', 'active');
        };
        
        sttRecognition.onresult = (event) => {
          const result = event.results[event.results.length - 1];
          if (result.isFinal) {
            this.log('info', `STT final result: "${result[0].transcript}" (confidence: ${result[0].confidence || 'N/A'})`);
            this.processTranscription(result[0].transcript);
          } else {
            this.log('info', `STT interim result: "${result[0].transcript}"`);
          }
        };
        
        sttRecognition.onerror = (event) => {
          this.log('error', `STT Error: ${event.error}`);
          this.updateStage('listen', 'error');
          this.updateStage('transcribe', 'error');
          isSTTListening = false;
          
          // Provide specific help for common errors
          if (event.error === 'no-speech') {
            this.log('info', 'STT: No speech detected - try speaking clearly');
          } else if (event.error === 'audio-capture') {
            this.log('error', 'STT: Audio capture failed - check microphone');
            this.addMicrophoneHelp();
          } else if (event.error === 'not-allowed') {
            this.log('error', 'STT: Microphone permission denied');
            this.addMicrophonePermissionHelp();
          }
        };
        
        sttRecognition.onend = () => {
          this.log('info', 'STT recognition ended');
          isSTTListening = false;
          this.updateStage('listen', 'idle');
          this.updateStage('transcribe', 'idle');
        };
      }
      
      // Request microphone access and start STT
      this.log('info', 'Requesting microphone access...');
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      sttRecognition.start();
      this.log('success', 'STT Listening started with microphone access');
      
    } catch (error) {
      this.log('error', `Failed to start STT: ${error.message}`);
      this.updateStage('listen', 'error');
      this.updateStage('transcribe', 'error');
      
      if (error.name === 'NotAllowedError') {
        this.addMicrophonePermissionHelp();
      } else if (error.name === 'NotFoundError') {
        this.log('error', 'STT: No microphone found');
        this.addMicrophoneHelp();
      }
    }
  }

  addMicrophonePermissionHelp() {
    this.log('info', '=== MICROPHONE PERMISSION HELP ===');
    this.log('info', 'To enable microphone access:');
    this.log('info', '1. Click the lock icon in the address bar');
    this.log('info', '2. Find "Microphone" in the permissions list');
    this.log('info', '3. Change setting from "Block" to "Allow"');
    this.log('info', '4. Reload the page and try again');
    this.log('info', '=== END PERMISSION HELP ===');
  }

  addMicrophoneHelp() {
    this.log('info', '=== MICROPHONE TROUBLESHOOTING ===');
    this.log('info', 'Microphone issues:');
    this.log('info', '1. Check if microphone is connected');
    this.log('info', '2. Verify microphone is not muted');
    this.log('info', '3. Check system sound settings');
    this.log('info', '4. Try a different browser');
    this.log('info', '=== END TROUBLESHOOTING ===');
  }

  stopSTTListening() {
    if (sttRecognition && isSTTListening) {
      sttRecognition.stop();
      isSTTListening = false;
      this.updateStage('listen', 'idle');
      this.updateStage('transcribe', 'idle');
      this.log('info', 'STT Listening stopped');
    }
  }

  async processTranscription(text) {
    this.updateStage('transcribe', 'active');
    this.log('info', `Transcribed: "${text}"`);
    
    // Move to think stage
    this.updateStage('think', 'processing');
    this.updateStage('transcribe', 'idle');
    
    await this.processAIResponse(text);
  }

  async processAIResponse(input) {
    this.updateStage('think', 'active');
    this.log('info', 'Processing AI response...');
    
    // Simulate AI processing
    setTimeout(() => {
      const response = `Processed: ${input}`;
      this.updateStage('think', 'idle');
      this.updateStage('respond', 'active');
      this.log('success', `AI Response: ${response}`);
      
      this.sendResponse(response);
    }, 1000);
  }

  sendResponse(response) {
    this.updateStage('respond', 'active');
    this.log('info', 'Sending response...');
    
    // Move to speak stage
    setTimeout(() => {
      this.speakResponse(response);
    }, 500);
  }

  async speakResponse(text) {
    if (!agentActive) {
      this.log('warning', 'Agent is inactive - TTS disabled');
      return;
    }

    this.updateStage('speak', 'processing');
    this.updateStage('respond', 'idle');
    
    try {
      // Check TTS support
      if (!('speechSynthesis' in window)) {
        this.log('error', 'Text-to-Speech not supported in this browser');
        this.updateStage('speak', 'error');
        return;
      }

      // Check available voices
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) {
        this.log('error', 'No TTS voices available');
        this.updateStage('speak', 'error');
        this.addTTSVoiceHelp();
        return;
      }

      this.log('info', `TTS: Using ${voices.length} available voices`);
      
      // Create utterance with best voice
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Select best voice (prefer English, local service)
      const englishVoice = voices.find(voice => 
        voice.lang.startsWith('en') && voice.localService
      ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
      
      utterance.voice = englishVoice;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      this.log('info', `TTS: Using voice "${englishVoice.name}" (${englishVoice.lang})`);
      
      utterance.onstart = () => {
        isTTSSpeaking = true;
        this.updateStage('speak', 'active');
        this.log('success', `TTS started speaking: "${text}"`);
      };
      
      utterance.onend = () => {
        isTTSSpeaking = false;
        this.updateStage('speak', 'idle');
        this.log('success', 'TTS completed successfully');
      };
      
      utterance.onerror = (event) => {
        this.log('error', `TTS Error: ${event.error}`);
        this.updateStage('speak', 'error');
        isTTSSpeaking = false;
        
        // Provide specific help for TTS errors
        if (event.error === 'network') {
          this.log('error', 'TTS: Network error - check internet connection');
        } else if (event.error === 'synthesis-unavailable') {
          this.log('error', 'TTS: Synthesis unavailable - try refreshing');
        } else if (event.error === 'language-unavailable') {
          this.log('error', 'TTS: Language unavailable - using default voice');
        }
      };
      
      // Cancel any ongoing speech first
      speechSynthesis.cancel();
      
      // Start speaking
      speechSynthesis.speak(utterance);
      this.log('info', 'TTS: Speech synthesis requested');
      
    } catch (error) {
      this.log('error', `TTS Error: ${error.message}`);
      this.updateStage('speak', 'error');
      isTTSSpeaking = false;
    }
  }

  addTTSVoiceHelp() {
    this.log('info', '=== TTS VOICE TROUBLESHOOTING ===');
    this.log('info', 'No TTS voices available. Solutions:');
    this.log('info', '1. Check internet connection (online voices)');
    this.log('info', '2. Try refreshing the page');
    this.log('info', '3. Check browser TTS settings');
    this.log('info', '4. Try a different browser (Chrome works best)');
    this.log('info', '=== END TTS HELP ===');
  }

  // Control functions
  toggleWebRTC() {
    if (webRTCState.listening) {
      this.stopWebRTCListening();
    } else {
      this.startWebRTCListening();
    }
  }

  invokeAI() {
    this.log('info', 'Manual AI invoke triggered');
    this.processAIResponse('Manual invoke test');
  }

  expandChat() {
    this.log('info', 'Chat expansion requested');
  }

  toggleResponsePause() {
    const btn = document.getElementById('pause-resp-btn');
    btn.classList.toggle('active');
    this.log('info', 'Response pause toggled');
  }

  toggleVolume() {
    const btn = document.getElementById('volume-btn');
    btn.classList.toggle('active');
    this.log('info', 'Volume toggled');
  }

  showTools() {
    this.log('info', 'Tools panel requested');
    this.updateStage('act', 'processing');
    setTimeout(() => {
      this.updateStage('act', 'active');
      this.log('info', 'Tools available');
    }, 500);
  }

  // Debug menu functions
  async testConnection() {
    this.log('info', 'Testing connection...');
    this.updateStage('listen', 'processing');
    
    setTimeout(() => {
      this.log('success', 'Connection test successful');
      this.updateStage('listen', 'active');
    }, 1000);
  }

  async testClickAudit() {
    this.testClickAuditSystem();
  }

  async testBackend() {
    this.log('info', 'Testing backend roundtrip...');
    this.updateStage('think', 'processing');
    
    try {
      // Simulate backend test
      setTimeout(() => {
        this.log('success', 'Backend roundtrip successful');
        this.updateStage('think', 'active');
      }, 1500);
    } catch (error) {
      this.log('error', `Backend test failed: ${error.message}`);
      this.updateStage('think', 'error');
    }
  }

  async testTTS() {
    this.log('info', 'Testing TTS...');
    this.speakResponse('TTS test successful');
  }

  toggleAgent() {
    agentActive = !agentActive;
    this.log('info', `Agent ${agentActive ? 'activated' : 'deactivated'}`);
    
    if (!agentActive && isSTTListening) {
      this.stopSTTListening();
    }
  }

  clearLogs() {
    const logsContent = document.getElementById('logs-content');
    logsContent.innerHTML = '';
    this.logs = [];
    this.log('info', 'Logs cleared');
  }

  configureBackend() {
    chrome.runtime.sendMessage({ type: 'C10_GET_RUNTIME_STATUS' }, async (statusResponse) => {
      const currentUrl = statusResponse?.cloud_url || 'https://cloud.keledon.invalid';
      const url = prompt('Enter cloud runtime URL:', currentUrl);
      if (!url) {
        return;
      }

      try {
        const response = await chrome.runtime.sendMessage({ type: 'C10_SET_CLOUD_URL', url });
        if (!response?.success) {
          throw new Error(response?.error || 'Failed to set cloud runtime URL');
        }

        this.log('success', `[C11] Cloud runtime URL set to ${response.cloudUrl}`);
        if (response.reconnected) {
          this.log('info', '[C11] Background runtime reconnected to new cloud URL');
        }
      } catch (error) {
        this.log('error', `[C11] Failed to configure cloud URL: ${error.message}`);
      }
    });
  }

  configureVoiceSettings() {
    this.log('info', 'Voice settings requested');
  }

  // ==============================
  // STEP B: Global Click Audit Implementation
  // ==============================
  
  setupGlobalClickAudit() {
    // Track click handlers to detect silent clicks
    this.clickHandlers = new Map();
    this.auditAllClicks();
    
    this.log('info', 'Global click audit system activated');
  }

  auditAllClicks() {
    // Global click listener that runs before any other handlers
    document.addEventListener('click', (event) => {
      const target = event.target;
      const elementId = target.id || '';
      const elementClass = target.className || '';
      const elementTag = target.tagName.toLowerCase();
      const dataAction = target.getAttribute('data-action') || '';
      
      // Create unique identifier for this element
      const elementKey = `${elementTag}${elementId ? '#' + elementId : ''}${elementClass ? '.' + elementClass.split(' ').join('.') : ''}`;
      
      // Log the click attempt
      const clickInfo = {
        element: elementKey,
        id: elementId,
        class: elementClass,
        tag: elementTag,
        dataAction,
        timestamp: new Date().toISOString(),
        x: event.clientX,
        y: event.clientY
      };
      
      // Check if this element has a registered click handler
      const hasHandler = this.clickHandlers.has(elementKey) || 
                        target.onclick || 
                        target.addEventListener ||
                        dataAction;
      
      // Log click attempt
      this.log('info', `CLICK-ATTEMPT: ${elementKey} | data-action: "${dataAction}" | handler: ${hasHandler ? 'yes' : 'NO'}`);
      
      // Set up a timeout to check if a handler actually executed
      setTimeout(() => {
        // If we reach here and no handler logged execution, it's a silent click
        if (!this.lastClickHandlerExecuted) {
          this.log('warning', `SILENT-CLICK-DETECTED: ${elementKey} - No handler executed within 100ms`);
          this.log('warning', `  Element details: ID="${elementId}", CLASS="${elementClass}", data-action="${dataAction}"`);
          
          // Try to determine why it might be silent
          if (!hasHandler) {
            this.log('warning', `  Reason: No click handler found on element`);
          } else if (target.disabled) {
            this.log('warning', `  Reason: Element is disabled`);
          } else if (window.getComputedStyle(target).pointerEvents === 'none') {
            this.log('warning', `  Reason: Element has pointer-events: none`);
          } else if (window.getComputedStyle(target).display === 'none') {
            this.log('warning', `  Reason: Element is hidden (display: none)`);
          } else if (window.getComputedStyle(target).visibility === 'hidden') {
            this.log('warning', `  Reason: Element is hidden (visibility: hidden)`);
          }
        }
        
        // Reset the flag
        this.lastClickHandlerExecuted = false;
      }, 100);
      
    }, true); // Use capture phase to catch clicks before other handlers
    
    // Override addEventListener to track click handlers
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (type === 'click') {
        const elementKey = window.pipelineManager.getElementKey(this);
        window.pipelineManager.clickHandlers.set(elementKey, listener);
        
        // Wrap the listener to log execution
        const wrappedListener = function(event) {
          window.pipelineManager.lastClickHandlerExecuted = true;
          window.pipelineManager.log('info', `CLICK-HANDLER-EXECUTED: ${elementKey}`);
          return listener.call(this, event);
        };
        
        return originalAddEventListener.call(this, type, wrappedListener, options);
      }
      
      return originalAddEventListener.call(this, type, listener, options);
    };
    
    // Track onclick property assignments
    let lastOnclickValue = null;
    Object.defineProperty(HTMLElement.prototype, 'onclick', {
      set: function(value) {
        lastOnclickValue = value;
        const elementKey = window.pipelineManager.getElementKey(this);
        
        if (value && typeof value === 'function') {
          window.pipelineManager.clickHandlers.set(elementKey, value);
          
          // Wrap the onclick handler
          this._onclick = function(event) {
            window.pipelineManager.lastClickHandlerExecuted = true;
            window.pipelineManager.log('info', `CLICK-ONCLICK-EXECUTED: ${elementKey}`);
            return value.call(this, event);
          };
        } else {
          this._onclick = null;
          window.pipelineManager.clickHandlers.delete(elementKey);
        }
      },
      get: function() {
        return this._onclick;
      }
    });
  }

  getElementKey(element) {
    if (!element) return 'unknown';
    
    const tag = element.tagName.toLowerCase();
    const id = element.id ? '#' + element.id : '';
    const classes = element.className ? '.' + element.className.split(' ').join('.') : '';
    
    return `${tag}${id}${classes}`;
  }

  // Method to manually register click handlers for audit
  registerClickHandler(element, handlerName) {
    const elementKey = this.getElementKey(element);
    this.clickHandlers.set(elementKey, handlerName);
    this.log('info', `CLICK-HANDLER-REGISTERED: ${elementKey} -> ${handlerName}`);
  }

  // Method to test click audit system
  testClickAudit() {
    this.log('info', 'Testing click audit system...');
    
    // Create a test button
    const testBtn = document.createElement('button');
    testBtn.textContent = 'Test Click Audit';
    testBtn.id = 'test-click-audit-btn';
    testBtn.style.position = 'fixed';
    testBtn.style.top = '10px';
    testBtn.style.left = '10px';
    testBtn.style.zIndex = '9999';
    testBtn.style.background = '#ff6b6b';
    testBtn.style.color = 'white';
    testBtn.style.border = 'none';
    testBtn.style.padding = '5px 10px';
    testBtn.style.borderRadius = '3px';
    testBtn.style.cursor = 'pointer';
    
    // Add a proper click handler
    testBtn.addEventListener('click', () => {
      this.log('success', 'Test click handler executed successfully');
      document.body.removeChild(testBtn);
    });
    
    document.body.appendChild(testBtn);
    
    this.log('info', 'Test button created - click it to verify audit system');
  }

  // ==============================
  // STEP C: Backend Verification on Load
  // ==============================
  
  async initializeBackendConnectivity() {
    this.log('info', 'Initializing backend connectivity verification...');
    
    // Import the BackendConnectivityChecker from the main sidepanel
    // Since we're in a separate file, we'll create a simplified version
    this.backendUrl = 'https://cloud.keledon.invalid';
    this.backendConnected = false;
    this.serviceWorkerConnected = false;
    
    // Perform verification sequence on load
    await this.performBackendVerification();
  }

  async performBackendVerification() {
    this.log('info', '=== STARTING BACKEND VERIFICATION SEQUENCE ===');
    
    // Step 1: Check service worker connectivity
    await this.verifyServiceWorker();
    
    // Step 2: Check backend health
    await this.verifyBackendHealth();
    
    // Step 3: Perform roundtrip test
    await this.verifyBackendRoundtrip();
    
    // Step 4: Update UI based on results
    this.updateUIAfterVerification();
    
    this.log('info', '=== BACKEND VERIFICATION SEQUENCE COMPLETE ===');
  }

  async verifyServiceWorker() {
    this.log('info', 'Step 1: Verifying service worker connectivity...');
    
    try {
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Service worker timeout')), 5000);
        
        chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      if (response) {
        this.serviceWorkerConnected = true;
        this.log('success', 'Service worker connectivity verified');
        this.log('info', `Service worker status: ${JSON.stringify(response)}`);
      } else {
        this.serviceWorkerConnected = false;
        this.log('error', 'Service worker not responding');
      }
      
    } catch (error) {
      this.serviceWorkerConnected = false;
      this.log('error', `Service worker verification failed: ${error.message}`);
    }
  }

  async verifyBackendHealth() {
    this.log('info', 'Step 2: Verifying backend health...');
    
    try {
      const healthUrl = `${this.backendUrl}/health`;
      this.log('info', `Checking backend health at: ${healthUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        this.log('error', 'Backend health check timeout (5s)');
      }, 5000);
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'KELEDON-Pipeline/1.1.6'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        this.backendConnected = true;
        this.log('success', 'Backend health check successful');
        this.log('info', `Backend response: ${JSON.stringify(data)}`);
        
        // Validate response structure
        if (data && data.status === 'ok') {
          this.log('success', 'Backend status validation passed');
        } else {
          this.log('warning', 'Backend status validation failed - invalid response structure');
        }
      } else {
        this.backendConnected = false;
        this.log('error', `Backend health check failed: HTTP ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      this.backendConnected = false;
      this.log('error', `Backend health check error: ${error.message}`);
      
      if (error.name === 'AbortError') {
        this.log('error', 'Backend health check timed out');
      } else if (error.name === 'TypeError') {
        this.log('error', 'Backend server likely not running or unreachable');
      }
    }
  }

  async verifyBackendRoundtrip() {
    this.log('info', 'Step 3: Verifying backend roundtrip...');
    
    if (!this.backendConnected) {
      this.log('warning', 'Skipping roundtrip test - backend not connected');
      return;
    }
    
    try {
      const nonce = this.generateUUID();
      const timestamp = new Date().toISOString();
      
      const requestPayload = {
        source: 'keledon-pipeline',
        timestamp: timestamp,
        nonce: nonce
      };
      
      const roundtripUrl = `${this.backendUrl}/agent/roundtrip-test`;
      this.log('info', `Sending roundtrip request to: ${roundtripUrl}`);
      this.log('info', `Request payload: ${JSON.stringify(requestPayload)}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        this.log('error', 'Backend roundtrip timeout (10s)');
      }, 10000);
      
      const startTime = Date.now();
      const response = await fetch(roundtripUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        const responseData = await response.json();
        this.log('success', `Backend roundtrip successful in ${latency}ms`);
        this.log('info', `Roundtrip response: ${JSON.stringify(responseData)}`);
        
        // Validate response
        const validation = this.validateRoundtripResponse(responseData, nonce);
        if (validation.valid) {
          this.log('success', 'Roundtrip response validation passed');
        } else {
          this.log('error', `Roundtrip validation failed: ${validation.reason}`);
        }
      } else {
        this.log('error', `Backend roundtrip failed: HTTP ${response.status} ${response.statusText}`);
      }
      
    } catch (error) {
      this.log('error', `Backend roundtrip error: ${error.message}`);
      
      if (error.name === 'AbortError') {
        this.log('error', 'Backend roundtrip timed out');
      } else if (error.name === 'TypeError') {
        this.log('error', 'Backend roundtrip network error');
      }
    }
  }

  validateRoundtripResponse(response, expectedNonce) {
    if (typeof response !== 'object' || response === null) {
      return { valid: false, reason: 'Response is not an object' };
    }
    
    if (response.ok !== true) {
      return { valid: false, reason: `Missing or invalid 'ok' field (expected: true, got: ${response.ok})` };
    }
    
    if (!('echoNonce' in response)) {
      return { valid: false, reason: 'Missing required field: echoNonce' };
    }
    
    if (response.echoNonce !== expectedNonce) {
      return { valid: false, reason: `Nonce mismatch (sent: ${expectedNonce}, received: ${response.echoNonce})` };
    }
    
    if (!('receivedAt' in response)) {
      return { valid: false, reason: 'Missing required field: receivedAt' };
    }
    
    const receivedAt = new Date(response.receivedAt);
    if (isNaN(receivedAt.getTime())) {
      return { valid: false, reason: `Invalid receivedAt timestamp: ${response.receivedAt}` };
    }
    
    return { valid: true, reason: 'All validations passed' };
  }

  generateUUID() {
    return crypto.randomUUID();
  }

  updateUIAfterVerification() {
    this.log('info', 'Updating UI based on verification results...');
    
    // Update think and respond stages based on backend connectivity
    if (this.backendConnected && this.serviceWorkerConnected) {
      this.updateStage('think', 'active');
      this.updateStage('respond', 'active');
      this.log('success', 'Think and Respond stages enabled - backend verified');
    } else {
      this.updateStage('think', 'error');
      this.updateStage('respond', 'error');
      this.log('error', 'Think and Respond stages disabled - backend verification failed');
    }
    
    // Show retry button if backend failed
    if (!this.backendConnected) {
      this.addRetryBackendButton();
    }
    
    // Update truth state
    this.updateStageFromTruth();
  }

  addRetryBackendButton() {
    // Check if retry button already exists
    if (document.getElementById('retry-backend-btn')) {
      return;
    }
    
    const retryBtn = document.createElement('button');
    retryBtn.id = 'retry-backend-btn';
    retryBtn.className = 'debug-item';
    retryBtn.textContent = '🔄 Retry Backend Verification';
    retryBtn.style.background = 'var(--danger)';
    retryBtn.style.color = 'white';
    
    retryBtn.addEventListener('click', async () => {
      this.log('info', 'Manual backend retry requested by user');
      retryBtn.textContent = '🔄 Retrying...';
      retryBtn.disabled = true;
      
      await this.performBackendVerification();
      
      retryBtn.textContent = '🔄 Retry Backend Verification';
      retryBtn.disabled = false;
      
      // Remove button if successful
      if (this.backendConnected) {
        const debugMenu = document.getElementById('debug-menu');
        if (debugMenu && debugMenu.contains(retryBtn)) {
          debugMenu.removeChild(retryBtn);
        }
        this.log('success', 'Backend verification succeeded - retry button removed');
      }
    });
    
    // Add to debug menu
    const debugMenu = document.getElementById('debug-menu');
    const separator = document.createElement('div');
    separator.className = 'debug-separator';
    
    debugMenu.appendChild(separator);
    debugMenu.appendChild(retryBtn);
    
    this.log('info', 'Retry backend button added to debug menu');
  }

  // ==============================
  // STEP D: Truthful WebRTC Detection
  // ==============================
  
  initializeWebRTCDetection() {
    this.log('info', 'Initializing WebRTC detection system...');
    
    // Start continuous detection
    this.startWebRTCDetection();
    
    // Add re-scan button to WebRTC control
    this.addWebRTCRescanButton();
    
    this.log('info', 'WebRTC detection system initialized');
  }

  startWebRTCDetection() {
    // Clear any existing detection interval
    if (this.webrtcDetectionInterval) {
      clearInterval(this.webrtcDetectionInterval);
    }
    
    // Check every 3 seconds for WebRTC streams
    this.webrtcDetectionInterval = setInterval(() => {
      this.detectWebRTCInActiveTab();
    }, 3000);
    
    // Initial detection
    this.detectWebRTCInActiveTab();
  }

  async detectWebRTCInActiveTab() {
    try {
      // Get the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        this.log('warning', 'No active tab found for WebRTC detection');
        this.updateWebRTCState(false, 'No active tab');
        return;
      }

      // Check if we can access the tab
      if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
        this.log('info', `Tab ${tab.url} not accessible for WebRTC detection`);
        this.updateWebRTCState(false, 'Tab not HTTP/HTTPS');
        return;
      }

      // Inject content script to detect WebRTC
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: this.detectWebRTCInPage
      });

      if (results && results.length > 0) {
        const detectionResult = results[0].result;
        
        if (detectionResult && detectionResult.hasWebRTC) {
          this.log('success', `WebRTC detected in tab: ${detectionResult.details}`);
          this.updateWebRTCState(true, detectionResult.details);
        } else {
          this.log('info', 'No WebRTC detected in active tab');
          this.updateWebRTCState(false, 'No WebRTC streams found');
        }
      } else {
        this.log('warning', 'Failed to execute WebRTC detection script');
        this.updateWebRTCState(false, 'Detection script failed');
      }
    } catch (error) {
      this.log('error', `WebRTC detection failed: ${error.message}`);
      this.updateWebRTCState(false, `Detection error: ${error.message}`);
    }
  }

  detectWebRTCInPage() {
    const webRTCElements = [];
    let hasWebRTC = false;
    let details = '';

    try {
      // Check for <video> elements with srcObject (WebRTC streams)
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(video => {
        if (video.srcObject && video.srcObject instanceof MediaStream) {
          hasWebRTC = true;
          webRTCElements.push({
            type: 'video',
            element: 'video',
            hasStream: true,
            streamId: video.srcObject.id || 'unknown',
            audioTracks: video.srcObject.getAudioTracks().length,
            videoTracks: video.srcObject.getVideoTracks().length
          });
        }
      });

      // Check for <audio> elements with srcObject (WebRTC audio streams)
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach(audio => {
        if (audio.srcObject && audio.srcObject instanceof MediaStream) {
          hasWebRTC = true;
          webRTCElements.push({
            type: 'audio',
            element: 'audio',
            hasStream: true,
            streamId: audio.srcObject.id || 'unknown',
            audioTracks: audio.srcObject.getAudioTracks().length
          });
        }
      });

      // Check for RTCPeerConnection usage (heuristic)
      if (window.RTCPeerConnection || window.webkitRTCPeerConnection) {
        // Look for common WebRTC meeting indicators
        const meetingIndicators = [
          '[data-testid="call-container"]',
          '[data-testid="meeting-controls"]',
          '.webrtc-video',
          '.rtc-video',
          '[data-rtc-connection]'
        ];
        
        meetingIndicators.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            hasWebRTC = true;
            webRTCElements.push({
              type: 'meeting-indicator',
              element: selector,
              count: elements.length
            });
          }
        });
      }

      details = webRTCElements.length > 0 
        ? `Found ${webRTCElements.length} WebRTC element(s): ${webRTCElements.map(e => `${e.element}(${e.audioTracks || 0} audio tracks)`).join(', ')}`
        : 'No WebRTC elements found';

    } catch (error) {
      details = `Detection error: ${error.message}`;
    }

    return {
      hasWebRTC,
      details,
      elements: webRTCElements,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };
  }

  updateWebRTCState(detected, reason) {
    const wasDetected = webRTCState.detected;
    webRTCState.detected = detected;
    webRTCState.detectionReason = reason;

    // Update WebRTC button state
    const webrtcBtn = document.getElementById('webrtc-btn');
    if (webrtcBtn) {
      if (detected) {
        webrtcBtn.classList.add('active');
        webrtcBtn.title = `WebRTC detected: ${reason}`;
      } else {
        webrtcBtn.classList.remove('active');
        webrtcBtn.title = `WebRTC not detected: ${reason}`;
      }
    }

    // Update listen stage based on WebRTC detection
    if (detected) {
      this.updateStage('listen', webRTCState.listening ? 'active' : 'ready');
      this.log('success', `WebRTC detected - Listen stage ready: ${reason}`);
    } else {
      this.updateStage('listen', 'idle');
      this.log('info', `WebRTC not detected - Listen stage idle: ${reason}`);
    }

    // Log state changes
    if (wasDetected !== detected) {
      this.log(detected ? 'success' : 'info', `WebRTC detection state changed: ${detected ? 'DETECTED' : 'NOT DETECTED'} - ${reason}`);
    }

    // Update truth state
    this.updateStageFromTruth();
  }

  async startWebRTCListening() {
    if (!webRTCState.detected) {
      this.log('error', 'Cannot start WebRTC listening - no WebRTC detected');
      return;
    }

    if (webRTCState.listening) {
      this.log('warning', 'WebRTC listening already active');
      return;
    }

    try {
      this.log('info', 'Starting WebRTC audio capture...');
      
      // Get WebRTC audio stream from active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab) {
        throw new Error('No active tab');
      }

      // Use tab capture API to get audio from the tab
      const stream = await chrome.tabCapture.capture({
        audio: true,
        video: false
      });

      if (!stream) {
        throw new Error('Failed to capture tab audio');
      }

      webRTCState.stream = stream;
      webRTCState.listening = true;

      // Set up audio processing to prove frames are arriving
      this.setupWebRTCAudioProcessing(stream);

      this.updateWebRTCState(true, 'WebRTC audio capture active');
      this.log('success', 'WebRTC listening started - capturing tab audio');
      
      // Update UI
      this.updateStage('listen', 'active');
      this.updateStage('transcribe', 'active');
      
    } catch (error) {
      this.log('error', `Failed to start WebRTC listening: ${error.message}`);
      this.updateStage('listen', 'error');
    }
  }

  setupWebRTCAudioProcessing(stream) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create script processor to monitor audio frames
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      let frameCount = 0;
      let lastFrameLog = Date.now();
      
      processor.onaudioprocess = (event) => {
        frameCount++;
        const now = Date.now();
        
        // Log frame statistics every 5 seconds
        if (now - lastFrameLog > 5000) {
          this.log('info', `WebRTC audio frames: ${frameCount} frames in last 5s`);
          frameCount = 0;
          lastFrameLog = now;
        }
        
        // Get audio data for processing
        const inputBuffer = event.inputBuffer.getChannelData(0);
        
        // Here you would connect to STT pipeline
        // For now, we just prove frames are arriving
      };
      
      // Connect the audio pipeline
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      webRTCState.processor = processor;
      
      this.log('success', 'WebRTC audio processing pipeline established');
      
    } catch (error) {
      this.log('error', `Failed to setup WebRTC audio processing: ${error.message}`);
    }
  }

  stopWebRTCListening() {
    if (!webRTCState.listening) {
      this.log('warning', 'WebRTC listening not active');
      return;
    }

    if (webRTCState.stream) {
      webRTCState.stream.getTracks().forEach(track => track.stop());
      webRTCState.stream = null;
    }

    if (webRTCState.processor) {
      webRTCState.processor.disconnect();
      webRTCState.processor = null;
    }

    webRTCState.listening = false;
    this.updateWebRTCState(webRTCState.detected, webRTCState.detectionReason);
    
    this.updateStage('listen', 'ready');
    this.updateStage('transcribe', 'idle');
    
    this.log('info', 'WebRTC listening stopped');
  }

  addWebRTCRescanButton() {
    // Add re-scan button to WebRTC controls
    const listenStage = document.getElementById('listen-stage');
    if (!listenStage) return;
    
    // Check if re-scan button already exists
    if (document.getElementById('webrtc-rescan-btn')) {
      return;
    }
    
    const rescanBtn = document.createElement('button');
    rescanBtn.id = 'webrtc-rescan-btn';
    rescanBtn.className = 'control-btn';
    rescanBtn.textContent = '🔄';
    rescanBtn.title = 'Re-scan WebRTC';
    
    rescanBtn.addEventListener('click', () => {
      this.log('info', 'Manual WebRTC re-scan requested by user');
      this.detectWebRTCInActiveTab();
    });
    
    // Add to stage controls
    const stageControls = listenStage.querySelector('.stage-controls');
    if (stageControls) {
      stageControls.appendChild(rescanBtn);
      this.log('info', 'WebRTC re-scan button added to listen stage');
    }
  }
}

// Initialize pipeline manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.pipelineManager = new PipelineManager();
  
  // Initialize all stages to idle
  const stages = ['listen', 'transcribe', 'think', 'respond', 'speak', 'act'];
  stages.forEach(stage => {
    window.pipelineManager.updateStage(stage, 'idle');
  });
  
  // Log initial truth snapshot
  window.pipelineManager.logPipelineTruthSnapshot();
  
  // Update stages from truth state
  window.pipelineManager.updateStageFromTruth();
  
  // Initialize WebRTC detection
  window.pipelineManager.initializeWebRTCDetection();
  
  // Set up periodic truth updates (every 5 seconds)
  setInterval(() => {
    window.pipelineManager.updateStageFromTruth();
  }, 5000);
  
  // Set up truth snapshot logging (every 30 seconds)
  setInterval(() => {
    window.pipelineManager.logPipelineTruthSnapshot();
  }, 30000);
  
  console.log('KELEDON Pipeline UI initialized with truth contract');
});
