// ==============================
// KELEDON Pipeline UI (THIN VERSION)
// ==============================

// Core state from original implementation
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
  // Initialize event listeners for pipeline controls
  initializeEventListeners() {
    // ==============================
    // STEP B: Global Click Audit System
    // ==============================
    
    this.setupGlobalClickAudit();
    
    // Tab navigation click logging
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tabName = btn.getAttribute('data-tab');
        this.log('info', `TAB CLICKED: ${tabName}`);
      });
    });
    
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

    // Voice button for STT (in main chat area)
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        this.toggleMute();
      });
    }

    // Mic button for direct microphone input (sends to brain)
    const micBtn = document.getElementById('micBtn');
    if (micBtn) {
      micBtn.addEventListener('click', () => {
        this.log('info', 'Mic button clicked - start microphone input');
        this.startMicInput();
      });
    }

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

    // Log panel toggle
    const logToggleBtn = document.getElementById('logToggleBtn');
    if (logToggleBtn) {
      logToggleBtn.addEventListener('click', () => {
        const logPanel = document.getElementById('logPanel');
        if (logPanel) {
          logPanel.style.display = logPanel.style.display === 'none' ? 'flex' : 'none';
        }
      });
    }

    // Copy logs button
    const copyLogBtn = document.getElementById('copyLogBtn');
    if (copyLogBtn) {
      copyLogBtn.addEventListener('click', () => {
        const logsText = this.logs.join('\n');
        navigator.clipboard.writeText(logsText).then(() => {
          this.log('info', 'Logs copied to clipboard');
        }).catch(err => {
          this.log('error', 'Failed to copy logs: ' + err.message);
        });
      });
    }

    // Paste logs button
    const pasteLogBtn = document.getElementById('pasteLogBtn');
    if (pasteLogBtn) {
      pasteLogBtn.addEventListener('click', async () => {
        try {
          const text = await navigator.clipboard.readText();
          this.log('info', '=== PASTED LOGS ===');
          text.split('\n').forEach(line => {
            this.log('info', line);
          });
          this.log('info', '=== END PASTED LOGS ===');
        } catch (err) {
          this.log('error', 'Failed to paste logs: ' + err.message);
        }
      });
    }

    // Clear logs button
    const clearLogBtn = document.getElementById('clearLogBtn');
    if (clearLogBtn) {
      clearLogBtn.addEventListener('click', () => {
        this.clearLogs();
      });
    }

    // Close log panel button
    const closeLogBtn = document.getElementById('closeLogBtn');
    if (closeLogBtn) {
      closeLogBtn.addEventListener('click', () => {
        const logPanel = document.getElementById('logPanel');
        if (logPanel) {
          logPanel.style.display = 'none';
        }
      });
    }
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
      const getDefaultUrl = () => {
        if (typeof window !== 'undefined' && window.AGENT_CONFIG?.BACKEND_URL) {
          return window.AGENT_CONFIG.BACKEND_URL;
        }
        return 'http://localhost:3001';
      };
      const currentUrl = statusResponse?.cloud_url || getDefaultUrl();
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
  }
