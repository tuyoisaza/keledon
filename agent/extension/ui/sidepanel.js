// ==============================
// KELEDON Side Panel (STABLE CORE)
// ==============================

// Phase O/N-2/3: Real STT/TTS implementation
let sttRecognition = null;
let isSTTListening = false;
let ttsSpeech = null;
let isTTSSpeaking = false;
let agentActive = true; // Master toggle for agent control

document.addEventListener('DOMContentLoaded', () => {
  console.log('[KELEDON] Side panel loaded - Phase O/N-1');

  const sendBtn = document.getElementById('sendBtn');
  const voiceBtn = document.getElementById('voiceBtn');
  const commandInput = document.getElementById('commandInput');

  // Phase O/N-3: Initialize TTS first
  initializeTTS();
  
  // Phase O/N-2: Initialize STT
  initializeSTT();
  
  // Phase O/N-1: Test basic connectivity
  testBasicConnectivity();

  // ---- PHASE O/N-2: VOICE BUTTON (REAL STT) ----
  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      if (isSTTListening) {
        stopSTTListening();
      } else {
        startSTTListening();
      }
    });
    
    // Enable voice button since we now have real STT
    voiceBtn.disabled = false;
    voiceBtn.title = 'Real Speech-to-Text';
  }

  // ---- TTS TEST BUTTON ----
  const testTTSDryRun = document.getElementById('testTTSDryRun');
  if (testTTSDryRun) {
    testTTSDryRun.addEventListener('click', () => {
      const testText = "KELEDON TTS test - this is real text-to-speech output";
      speakText(testText);
    });
  }

  // ---- CONNECTION TEST BUTTON ----
  const testConnectionBtn = document.getElementById('testConnectionBtn');
  if (testConnectionBtn) {
    testConnectionBtn.addEventListener('click', () => {
      addMessage('🔄 Testing service worker connection…', 'assistant');
      chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
        if (response && response.type === 'PONG') {
          addMessage('✅ Service worker connection OK', 'assistant');
        } else {
          addMessage('❌ Service worker not responding', 'assistant');
        }
      });
    });
  }

  // ---- STATUS CHECK BUTTON ----
  const checkStatusBtn = document.getElementById('checkStatusBtn');
  if (checkStatusBtn) {
    checkStatusBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
        if (response) {
          const statusText = `Agent: ${response.agentActive ? 'Active' : 'Inactive'}, STT: ${response.sttEnabled ? 'Enabled' : 'Disabled'}, TTS: ${response.ttsEnabled ? 'Enabled' : 'Disabled'}`;
          addMessage(statusText, 'assistant');
        } else {
          addMessage('❌ Failed to get status', 'assistant');
        }
      });
    });
  }

  // ---- AGENT ACTIVE TOGGLE ----
  const agentActiveToggle = document.getElementById('agentActiveToggle');
  if (agentActiveToggle) {
    agentActiveToggle.addEventListener('click', () => {
      // Update UI immediately
      agentActiveToggle.classList.toggle('active');
      
      // Send toggle request to service worker
      chrome.runtime.sendMessage({ type: 'TOGGLE_AGENT' }, (response) => {
        if (response && response.agentActive !== undefined) {
          agentActive = response.agentActive;
          console.log('[KELEDON] Agent active state:', agentActive);
          
          // Sync UI with actual state
          if (agentActive) {
            agentActiveToggle.classList.add('active');
          } else {
            agentActiveToggle.classList.remove('active');
            
            // Stop STT if agent becomes inactive
            if (isSTTListening) {
              stopSTTListening();
              addMessage('🔇 Agent deactivated - STT stopped', 'assistant');
            }
          }
        }
      });
    });
  }

  // ---- SEND COMMAND ----
  if (sendBtn && commandInput) {
    sendBtn.addEventListener('click', async () => {
      const text = commandInput.value.trim();
      if (!text) return;

      addMessage(text, 'user');
      commandInput.value = '';

      // Phase O/N-1: Simple message test (can be upgraded later)
      chrome.runtime.sendMessage({
        type: 'TEST_MESSAGE',
        text: text
      }, async (response) => {
        if (response) {
          const responseText = `✅ Message received by service worker`;
          addMessage(responseText, 'assistant');
          
          // Phase O/N-3: Speak the response using TTS
          if (agentActive) {
            await speakText(responseText);
          }
        } else {
          const errorText = `❌ No response from service worker`;
          addMessage(errorText, 'assistant');
          
          // Phase O/N-3: Speak errors too
          if (agentActive) {
            await speakText(errorText);
          }
        }
      });
    });
  }

  // ---- PHASE O/N-1: STATUS UPDATES ----
  // Request status updates periodically
  setInterval(() => {
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
      if (response) {
        updateStatusUI(response);
      } else {
        console.error('[KELEDON] No status response from service worker');
      }
    });
  }, 3000);

  // Initial status request
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (response) {
      updateStatusUI(response);
    } else {
      console.error('[KELEDON] Initial status request failed');
    }
  });

  // ---- TAB NAVIGATION ----
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      
      // Remove active class from all buttons and contents
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked button and corresponding content
      btn.classList.add('active');
      const targetContent = document.getElementById(`${targetTab}-tab`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
});

// ==============================
// Phase O/N-3: Real TTS Implementation
// ==============================

function initializeTTS() {
  console.log('[KELEDON] Initializing TTS...');
  
  // Check if speechSynthesis is available
  if (!('speechSynthesis' in window)) {
    console.error('[KELEDON] TTS not supported in this browser');
    addMessage('❌ TTS not supported in this browser', 'assistant');
    updateTTSStatus('unsupported');
    return;
  }
  
  // Test TTS by getting voices
  const loadVoices = () => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      console.log('[KELEDON] TTS voices available:', voices.length);
      addMessage(`✅ TTS initialized (${voices.length} voices available)`, 'assistant');
      updateTTSStatus('ready');
    } else {
      console.warn('[KELEDON] No TTS voices available');
      addMessage('⚠️ No TTS voices available', 'assistant');
      updateTTSStatus('error');
    }
  };
  
  // Chrome loads voices asynchronously
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
  }
  
  // Initial voice load
  loadVoices();
  
  console.log('[KELEDON] TTS initialization started');
}

function speakText(text) {
  if (!agentActive) {
    addMessage('❌ Agent is inactive - TTS disabled', 'assistant');
    return Promise.resolve(false);
  }
  
  if (!('speechSynthesis' in window)) {
    addMessage('❌ TTS not available', 'assistant');
    return Promise.resolve(false);
  }
  
  // Cancel any ongoing speech
  speechSynthesis.cancel();
  
  // Create utterance
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Configure utterance
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    // Prefer English voices
    const englishVoice = voices.find(voice => 
      voice.lang.startsWith('en') && voice.localService
    ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
    utterance.voice = englishVoice;
  }
  
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  // Setup event handlers
  utterance.onstart = () => {
    console.log('[KELEDON] TTS started speaking:', text);
    isTTSSpeaking = true;
    updateTTSStatus('speaking');
    addMessage(`🔊 Speaking: "${text}"`, 'assistant');
  };
  
  utterance.onend = () => {
    console.log('[KELEDON] TTS finished speaking');
    isTTSSpeaking = false;
    updateTTSStatus('ready');
  };
  
  utterance.onerror = (event) => {
    console.error('[KELEDON] TTS error:', event.error);
    isTTSSpeaking = false;
    updateTTSStatus('error');
    
    let errorMessage = '❌ TTS error';
    switch (event.error) {
      case 'network':
        errorMessage = '❌ TTS network error';
        break;
      case 'synthesis-unavailable':
        errorMessage = '❌ TTS synthesis unavailable';
        break;
      case 'language-unavailable':
        errorMessage = '❌ TTS language unavailable';
        break;
      default:
        errorMessage = `❌ TTS error: ${event.error}`;
    }
    
    addMessage(errorMessage, 'assistant');
  };
  
  // Start speaking
  try {
    speechSynthesis.speak(utterance);
    console.log('[KELEDON] TTS speak requested for:', text);
    return Promise.resolve(true);
  } catch (error) {
    console.error('[KELEDON] Failed to start TTS:', error);
    addMessage('❌ Failed to start TTS', 'assistant');
    return Promise.resolve(false);
  }
}

function stopTTS() {
  if (!isTTSSpeaking) {
    return;
  }
  
  try {
    speechSynthesis.cancel();
    console.log('[KELEDON] TTS stop requested');
    isTTSSpeaking = false;
    updateTTSStatus('ready');
  } catch (error) {
    console.warn('[KELEDON] TTS stop error:', error);
  }
}

function updateTTSStatus(status) {
  const ttsStatus = document.getElementById('ttsStatus');
  if (!ttsStatus) return;
  
  // Remove all status classes
  ttsStatus.className = 'status-dot';
  
  // Apply appropriate status
  switch (status) {
    case 'speaking':
      ttsStatus.className = 'status-dot speaking';
      break;
    case 'ready':
      ttsStatus.className = 'status-dot ready';
      break;
    case 'error':
      ttsStatus.className = 'status-dot error';
      break;
    case 'unsupported':
      ttsStatus.className = 'status-dot error';
      break;
    default:
      ttsStatus.className = 'status-dot';
  }
  
  console.log('[KELEDON] TTS status updated to:', status);
}

// ==============================
// Phase O/N-2: Real STT Implementation
// ==============================

function initializeSTT() {
  console.log('[KELEDON] Initializing STT...');
  
  // Check if Web Speech API is supported
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.error('[KELEDON] STT not supported in this browser');
    addMessage('❌ STT not supported in this browser', 'assistant');
    
    // Update UI to show STT unavailable
    updateSTTStatus('unsupported');
    return;
  }
  
  // Create SpeechRecognition instance
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  sttRecognition = new SpeechRecognition();
  
  // Configure STT
  sttRecognition.continuous = false;
  sttRecognition.interimResults = true;
  sttRecognition.lang = 'en-US';
  sttRecognition.maxAlternatives = 1;
  
  // Setup event handlers
  sttRecognition.onstart = () => {
    console.log('[KELEDON] STT listening started');
    isSTTListening = true;
    updateSTTStatus('listening');
    addMessage('🎤 Listening...', 'assistant');
    
    if (voiceBtn) {
      voiceBtn.classList.add('recording');
      voiceBtn.textContent = '⏹️';
    }
  };
  
  sttRecognition.onresult = (event) => {
    console.log('[KELEDON] STT result:', event);
    
    let finalTranscript = '';
    let interimTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interimTranscript += result[0].transcript;
      }
    }
    
    if (finalTranscript) {
      console.log('[KELEDON] Final transcript:', finalTranscript);
      addMessage(`🎤 "${finalTranscript}"`, 'user');
      
      // Update command input with transcript
      if (commandInput) {
        commandInput.value = finalTranscript;
      }
      
      // Stop listening after final result
      stopSTTListening();
    } else if (interimTranscript) {
      console.log('[KELEDON] Interim transcript:', interimTranscript);
      // Could show interim results in UI if desired
    }
  };
  
  sttRecognition.onerror = (event) => {
    console.error('[KELEDON] STT error:', event.error);
    
    let errorMessage = '❌ STT error';
    switch (event.error) {
      case 'no-speech':
        errorMessage = '❌ No speech detected';
        break;
      case 'audio-capture':
        errorMessage = '❌ Microphone not available';
        break;
      case 'not-allowed':
        errorMessage = '❌ Microphone permission denied';
        break;
      case 'network':
        errorMessage = '❌ Network error';
        break;
      default:
        errorMessage = `❌ STT error: ${event.error}`;
    }
    
    addMessage(errorMessage, 'assistant');
    stopSTTListening();
  };
  
  sttRecognition.onend = () => {
    console.log('[KELEDON] STT listening ended');
    stopSTTListening();
  };
  
  console.log('[KELEDON] STT initialized successfully');
  addMessage('✅ STT initialized', 'assistant');
  updateSTTStatus('ready');
}

function startSTTListening() {
  if (!agentActive) {
    addMessage('❌ Agent is inactive - STT disabled', 'assistant');
    return;
  }
  
  if (!sttRecognition) {
    addMessage('❌ STT not initialized', 'assistant');
    return;
  }
  
  if (isSTTListening) {
    console.log('[KELEDON] STT already listening');
    return;
  }
  
  try {
    sttRecognition.start();
    console.log('[KELEDON] STT start requested');
  } catch (error) {
    console.error('[KELEDON] Failed to start STT:', error);
    addMessage('❌ Failed to start STT', 'assistant');
  }
}

function stopSTTListening() {
  if (!isSTTListening) {
    return;
  }
  
  isSTTListening = false;
  updateSTTStatus('ready');
  
  if (voiceBtn) {
    voiceBtn.classList.remove('recording');
    voiceBtn.textContent = '🎤';
  }
  
  // Stop recognition if it's running
  if (sttRecognition) {
    try {
      sttRecognition.stop();
      console.log('[KELEDON] STT stop requested');
    } catch (error) {
      console.warn('[KELEDON] STT stop error:', error);
    }
  }
}

function updateSTTStatus(status) {
  const sttStatus = document.getElementById('sttStatus');
  if (!sttStatus) return;
  
  // Remove all status classes
  sttStatus.className = 'status-dot';
  
  // Apply appropriate status
  switch (status) {
    case 'listening':
      sttStatus.className = 'status-dot listening';
      break;
    case 'ready':
      sttStatus.className = 'status-dot ready';
      break;
    case 'error':
      sttStatus.className = 'status-dot error';
      break;
    case 'unsupported':
      sttStatus.className = 'status-dot error';
      break;
    default:
      sttStatus.className = 'status-dot';
  }
  
  console.log('[KELEDON] STT status updated to:', status);
}

// ==============================
// Phase O/N-1 Functions
// ==============================

function testBasicConnectivity() {
  console.log('[KELEDON] Testing basic connectivity...');
  
  chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
    if (response && response.type === 'PONG') {
      console.log('[KELEDON] ✅ Service worker connectivity OK');
      addMessage('✅ Extension loaded successfully', 'assistant');
    } else {
      console.error('[KELEDON] ❌ Service worker not responding');
      addMessage('❌ Extension failed to load', 'assistant');
    }
  });
}

// ==============================
// Helpers
// ==============================

function addMessage(text, role) {
  const conversation = document.getElementById('conversation');
  if (!conversation) return;

  const msg = document.createElement('div');
  msg.className = `message ${role}`;

  const body = document.createElement('div');
  body.textContent = text;

  const time = document.createElement('div');
  time.className = 'message-time';
  time.textContent = new Date().toLocaleTimeString();

  msg.appendChild(body);
  msg.appendChild(time);
  conversation.appendChild(msg);
  conversation.scrollTop = conversation.scrollHeight;
}

function updateStatusUI(status) {
  console.log('[KELEDON] Status update:', status);
  
  // Update connection status (Phase O/N-2: Service worker only)
  const connectionDot = document.getElementById('connectionDot');
  const connectionStatus = document.getElementById('connectionStatus');
  const statusIndicator = document.getElementById('statusIndicator');
  
  // We're always "connected" to service worker if we get a response
  if (connectionDot && connectionStatus) {
    connectionDot.className = 'status-dot connected';
    connectionStatus.textContent = 'Service Worker OK';
    if (statusIndicator) {
      statusIndicator.className = 'status-indicator active';
    }
  }

  // Update session info with agent status
  const sessionInfo = document.getElementById('sessionInfo');
  if (sessionInfo) {
    if (status.agentActive !== undefined) {
      agentActive = status.agentActive; // Sync local state
      sessionInfo.textContent = status.agentActive ? 'Agent Active' : 'Agent Inactive';
    } else {
      sessionInfo.textContent = 'Status unknown';
    }
  }

// Update component status
  const websocketStatus = document.getElementById('websocketStatus');
  const sttStatus = document.getElementById('sttStatus');
  const ttsStatus = document.getElementById('ttsStatus');
  
  if (websocketStatus) {
    websocketStatus.className = 'status-dot'; // No WebSocket yet
  }
  
  // STT/TTS status: If agent inactive, force to disabled state
  if (sttStatus) {
    if (!status.sttEnabled) {
      sttStatus.className = 'status-dot'; // Disabled by master toggle
    }
    // If enabled, actual status is managed by updateSTTStatus()
  }
  
  if (ttsStatus) {
    if (!status.ttsEnabled) {
      ttsStatus.className = 'status-dot'; // Disabled by master toggle
    }
    // If enabled, actual status is managed by updateTTSStatus()
  }
  
  
  // Update voice button based on agent state
  const voiceBtnUpdate = document.getElementById('voiceBtn');
  if (voiceBtnUpdate) {
    voiceBtnUpdate.disabled = !agentActive;
    voiceBtnUpdate.title = agentActive ? 'Real Speech-to-Text' : 'Agent inactive';
  }
  
  // Update TTS test button
  const testTTSDryRunUpdate = document.getElementById('testTTSDryRun');
  if (testTTSDryRunUpdate) {
    testTTSDryRunUpdate.disabled = !agentActive;
    testTTSDryRunUpdate.style.opacity = agentActive ? '1' : '0.5';
  }
  
  // STT status is managed by updateSTTStatus() based on real STT state
  // TTS status is managed by updateTTSStatus() based on real TTS state
  // But also respect the master toggle
  if (ttsStatus) {
    if (!status.ttsEnabled) {
      ttsStatus.className = 'status-dot'; // Disabled by master toggle
    }
    // If enabled, actual status is managed by updateTTSStatus()
  }
  
  // Update voice button based on agent state
  const voiceBtnFinal = document.getElementById('voiceBtn');
  if (voiceBtnFinal) {
    voiceBtnFinal.disabled = !agentActive;
    voiceBtnFinal.title = agentActive ? 'Real Speech-to-Text' : 'Agent inactive';
  }
}