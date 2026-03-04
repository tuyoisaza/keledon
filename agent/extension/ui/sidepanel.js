// ==============================
// KELEDON Side Panel (STABLE CORE)
// ==============================

// Log messages storage (defined early)
const logMessages = [];

function addLogMessage(level, message) {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  logMessages.push(logEntry);

  const logsContent = document.getElementById('logs-content');
  if (logsContent) {
    const logElement = document.createElement('div');
    logElement.className = `log-entry ${level}`;
    logElement.textContent = logEntry;
    logsContent.appendChild(logElement);
    logsContent.scrollTop = logsContent.scrollHeight;

    if (logsContent.children.length > 100) {
      logsContent.removeChild(logsContent.firstChild);
    }
  }
}

// Override console.log to also write to log panel
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = function (...args) {
  originalLog.apply(console, args);
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  addLogMessage('info', msg);
};

console.warn = function (...args) {
  originalWarn.apply(console, args);
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  addLogMessage('warning', msg);
};

console.error = function (...args) {
  originalError.apply(console, args);
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  addLogMessage('error', msg);
};

// ==============================
// Tab Audio Capture (for STT from browser tab)
// ==============================
async function populateTabSelector() {
  const tabSelector = document.getElementById('tabSelector');
  if (!tabSelector) return;

  try {
    const tabs = await chrome.tabs.query({});
    tabSelector.innerHTML = '<option value="">Select tab to capture audio...</option>';

    for (const tab of tabs) {
      if (tab.id === chrome.tabs.TAB_ID_NONE) continue;
      const option = document.createElement('option');
      option.value = tab.id;
      option.textContent = tab.title.substring(0, 50) + (tab.title.length > 50 ? '...' : '');
      option.title = tab.url;
      tabSelector.appendChild(option);
    }
    console.log('[KELEDON] Tab selector populated with', tabs.length, 'tabs');
  } catch (err) {
    console.error('[KELEDON] Failed to populate tabs:', err.message);
  }
}

function getBackendUrl() {
  const backendInput = document.getElementById('backendUrl');
  if (backendInput && backendInput.value) {
    return backendInput.value;
  }
  return 'http://localhost:3001';
}

let sttWebSocket = null;
let sttAudioRecorder = null;

async function startWithTabCapture() {
  console.log('[KELEDON] Requesting tab audio capture for STT...');

  const backendUrl = getBackendUrl();
  console.log('[KELEDON] Using backend URL:', backendUrl);

  addMessage('🔄 Connecting to STT service...', 'assistant');

  try {
    // Create a listening session
    const sessionResponse = await fetch(`${backendUrl}/listening-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'tab', tabUrl: 'extension', tabTitle: 'Keledon Extension' })
    });

    if (!sessionResponse.ok) {
      throw new Error(`Session creation failed: ${sessionResponse.status}`);
    }

    const session = await sessionResponse.json();
    console.log('[KELEDON] Listening session created:', session);
    addMessage('📡 Session created, starting audio capture...', 'assistant');

    // Use chrome.tabCapture.capture() with callback style
    chrome.tabCapture.capture({
      audio: true,
      video: false
    }, (stream) => {
      if (chrome.runtime.lastError) {
        console.error('[KELEDON] Tab capture error:', chrome.runtime.lastError.message);
        addMessage('❌ Error: ' + chrome.runtime.lastError.message, 'assistant');
        return;
      }

      if (!stream) {
        console.error('[KELEDON] Tab capture returned no stream');
        addMessage('❌ No stream returned', 'assistant');
        return;
      }

      console.log('[KELEDON] Tab audio capture started');

      const wsUrl = session.wsUrl;
      console.log('[KELEDON] Connecting to WebSocket:', wsUrl);

      sttWebSocket = new WebSocket(wsUrl);

      sttWebSocket.onopen = () => {
        console.log('[KELEDON] WebSocket connected');
        addMessage('✅ Connected! Capturing and transcribing audio...', 'assistant');
      };

      sttWebSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[KELEDON] STT response:', data);

          if (data.text) {
            addMessage(`🎤 "${data.text}"`, 'user');
          }
          if (data.final && data.text) {
            handleCommand(data.text);
          }
        } catch (e) {
          console.log('[KELEDON] STT message:', event.data);
        }
      };

      sttWebSocket.onerror = (error) => {
        console.error('[KELEDON] WebSocket error:', error);
        addMessage('❌ STT connection error', 'assistant');
      };

      sttWebSocket.onclose = (event) => {
        console.log('[KELEDON] WebSocket closed:', event.code);
        addMessage('🔴 STT disconnected', 'assistant');
      };

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);

      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        if (sttWebSocket && sttWebSocket.readyState === WebSocket.OPEN) {
          const inputBuffer = event.inputBuffer;
          const channelData = inputBuffer.getChannelData(0);

          const pcmData = new Int16Array(channelData.length);
          for (let i = 0; i < channelData.length; i++) {
            pcmData[i] = Math.max(-1, Math.min(1, channelData[i])) * 0x7FFF;
          }

          const base64 = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
          sttWebSocket.send(JSON.stringify({ type: 'AUDIO_CHUNK', audio: base64 }));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      window.keledonTabAudioStream = stream;
      window.keledonAudioContext = audioContext;
      window.keledonProcessor = processor;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkAudio = () => {
        if (!window.keledonTabAudioStream) return;
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

        if (average > 20 && Math.random() < 0.05) {
          console.log(`[KELEDON] Audio level: ${Math.round(average)}`);
        }

        if (window.keledonTabAudioStream) {
          requestAnimationFrame(checkAudio);
        }
      };
      checkAudio();

      console.log('[KELEDON] STT listening started - capturing audio from tab');
      addMessage('🎤 Listening... Speak now!', 'assistant');
    }); // Close tabCapture callback

  } catch (err) {
    console.error('[KELEDON] Tab capture/STT error:', err.message);
    let errorMsg = err.message;
    if (errorMsg.includes('Chrome pages')) {
      errorMsg = 'Cannot capture Chrome pages. Open a regular website (YouTube, etc.) and try again.';
    }
    addMessage('❌ Error: ' + errorMsg, 'assistant');
  }
}

// Phase O/N-2/3: Real STT/TTS implementation
let sttRecognition = null;
let isSTTListening = false;
let ttsSpeech = null;
let isTTSSpeaking = false;
let agentActive = true; // Master toggle for agent control

document.addEventListener('DOMContentLoaded', () => {
  console.log('[KELEDON] Side panel loaded - C57 Restructure');

  // Initialize version from manifest
  const manifest = chrome.runtime.getManifest();
  const versionLabel = document.getElementById('versionLabel');
  if (versionLabel) versionLabel.textContent = `v${manifest.version}`;

  const sendBtn = document.getElementById('sendBtn');
  const voiceBtn = document.getElementById('voiceBtn');
  const commandInput = document.getElementById('commandInput');

  // Phase O/N-3: Initialize TTS first
  initializeTTS();

  // Phase O/N-2: Initialize STT (pass DOM elements)
  initializeSTT(voiceBtn, commandInput);

  // Phase O/N-1: Test basic connectivity
  testBasicConnectivity();

  // Populate tab selector
  populateTabSelector();

  // Refresh tabs button
  const refreshTabsBtn = document.getElementById('refreshTabsBtn');
  if (refreshTabsBtn) {
    refreshTabsBtn.addEventListener('click', () => {
      populateTabSelector();
    });
  }

  // ---- PHASE O/N-2: VOICE BUTTON (REAL STT) ----
  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      console.log('[KELEDON] Voice button clicked - toggle STT');
      if (isSTTListening) {
        stopSTTListening();
      } else {
        startSTTListening();
      }
    });

    // Enable voice button since we now have real STT
    voiceBtn.disabled = false;
    voiceBtn.title = 'Transcribe WebRTC Audio';
  }

  // ---- MIC BUTTON (Direct mic input - for future use) ----
  const micBtn = document.getElementById('micBtn');
  if (micBtn) {
    micBtn.addEventListener('click', () => {
      console.log('[KELEDON] Mic button clicked');
      addMessage('🎤 Mic input ready for future use (WebRTC streaming)', 'assistant');
    });
    micBtn.disabled = false;
    micBtn.title = 'Mic - Future use';
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

  // ---- HANDLE COMMAND (from STT) ----
  async function handleCommand(text) {
    if (!text || !text.trim()) return;

    console.log('[KELEDON] Processing command:', text);
    addMessage(`📤 Sending: "${text}"`, 'system');

    const backendUrl = getBackendUrl();

    try {
      const response = await fetch(`${backendUrl}/agent/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: text,
          source: 'stt'
        })
      });

      if (response.ok) {
        const result = await response.json();
        addMessage(`✅ ${result.response || result.message || 'Command processed'}`, 'assistant');
      } else {
        addMessage(`⚠️ Command failed: ${response.status}`, 'assistant');
      }
    } catch (err) {
      console.error('[KELEDON] Command error:', err);
      addMessage(`❌ Error: ${err.message}`, 'assistant');
    }
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
    }
  });

  // ---- TAB NAVIGATION ----
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetTab = btn.getAttribute('data-tab');
      tabButtons.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const targetContent = document.getElementById(`${targetTab}-tab`);
      if (targetContent) {
        targetContent.classList.add('active');
        if (targetTab === 'tabs') {
          loadBrowserTabs();
        } else if (targetTab === 'history') {
          loadHistory();
        }
      }
    });
  });
});

// Update Status UI (C57)
function updateStatusUI(status) {
  if (!status) return;

  // Update branding
  if (status.branding) {
    const company = document.getElementById('companyName');
    const brand = document.getElementById('brandName');
    const team = document.getElementById('teamName');
    if (company) company.textContent = status.branding.company || '—';
    if (brand) brand.textContent = status.branding.brand || '—';
    if (team) team.textContent = status.branding.team || '—';
  }

  // Update LEDs
  const indicators = {
    'led-sw': status.socketConnected ? 'green' : 'red',
    'led-ws': status.socketConnected ? 'green' : 'red',
    'led-stt': status.sttEnabled ? 'green' : (status.agentActive ? 'yellow' : 'red'),
    'led-tts': status.ttsEnabled ? 'green' : (status.agentActive ? 'yellow' : 'red'),
    'led-rtc': status.webRTCDetected ? (status.webRTCReady ? 'green' : 'yellow') : 'red',
    'led-agent': status.sessionId ? 'green' : 'red'
  };

  for (const [id, color] of Object.entries(indicators)) {
    const led = document.getElementById(id);
    if (led) led.className = `led ${color}`;
  }
}

// Load browser tabs
async function loadBrowserTabs() {
  const tabList = document.getElementById('tabList');
  if (!tabList) return;

  try {
    const tabs = await chrome.tabs.query({});

    if (tabs.length === 0) {
      tabList.innerHTML = '<div class="empty-state">No tabs found</div>';
      return;
    }

    tabList.innerHTML = tabs.map(tab => `
      <div class="tab-item" data-tab-id="${tab.id}">
        <div class="tab-favicon">${tab.favIconUrl ? '<img src="' + tab.favIconUrl + '">' : '🌐'}</div>
        <div class="tab-info">
          <div class="tab-title">${tab.title || 'Untitled'}</div>
          <div class="tab-url">${tab.url || ''}</div>
        </div>
      </div>
    `).join('');

    addMessage(`📑 Loaded ${tabs.length} tabs`, 'system');
  } catch (error) {
    console.error('[KELEDON] Failed to load tabs:', error);
    tabList.innerHTML = '<div class="error">Failed to load tabs</div>';
  }
}

// History Loader
async function loadHistory() {
  const historyList = document.getElementById('historyList');
  if (!historyList) return;
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_HISTORY' });
    if (response && response.history && response.history.length > 0) {
      historyList.innerHTML = response.history.map(item => `
        <div class="history-item">
          <div style="font-size:9px;color:var(--muted)">${item.timestamp || ''}</div>
          <div>${item.content || ''}</div>
        </div>
      `).join('');
    } else {
      historyList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--muted)">No history yet</div>';
    }
  } catch (err) {
    console.warn('[KELEDON] History error:', err);
  }
}

// Load provider config from background service (configured in Supabase)
let currentProviderConfig = {
  sttProvider: 'webspeech-stt',
  ttsProvider: 'webspeech-tts',
  rpaProvider: 'native-dom'
};

async function loadProviderConfig() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_PROVIDER_CONFIG' });
    if (response && response.providerConfig) {
      currentProviderConfig = response.providerConfig;
      console.log('[KELEDON] Provider config loaded:', currentProviderConfig);
      addMessage(`📋 Providers: STT=${currentProviderConfig.sttProvider}, TTS=${currentProviderConfig.ttsProvider}, RPA=${currentProviderConfig.rpaProvider}`, 'system');
    }
  } catch (error) {
    console.warn('[KELEDON] Failed to load provider config:', error);
  }
}

// Initialize provider config on load
loadProviderConfig();

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
      addMessage(`✅ TTS ready (${voices.length} voices)`, 'assistant');
      updateTTSStatus('ready');
    } else {
      // Chrome loads voices asynchronously - don't show error, just log
      console.log('[KELEDON] TTS: Voices loading asynchronously...');
      updateTTSStatus('ready'); // Still mark as ready - Chrome will load on demand
    }
  };

  // Chrome loads voices asynchronously - try immediately and on callback
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  // Initial voice load attempt
  loadVoices();

  // Retry after delay if no voices loaded (Chrome extension context)
  if (speechSynthesis.getVoices().length === 0) {
    setTimeout(() => {
      loadVoices();
    }, 1000);
  }

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

function initializeSTT(voiceBtn, commandInput) {
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
      voiceBtn.textContent = '📝';
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

    // If permission denied, try tab capture instead
    if (event.error === 'not-allowed' || event.error === 'audio-capture') {
      console.warn('[KELEDON] STT permission denied, trying tab audio capture...');
      startWithTabCapture();
      return;
    }

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

  isSTTListening = true;
  updateSTTStatus('listening');

  const voiceBtn = document.getElementById('voiceBtn');
  if (voiceBtn) {
    voiceBtn.classList.add('recording');
    voiceBtn.textContent = '🛑';
  }

  // Use tab capture with backend STT
  startWithTabCapture();
}

function stopSTTListening() {
  if (!isSTTListening) {
    return;
  }

  isSTTListening = false;
  updateSTTStatus('ready');

  const voiceBtn = document.getElementById('voiceBtn');
  if (voiceBtn) {
    voiceBtn.classList.remove('recording');
    voiceBtn.textContent = '📝';
  }

  // Stop the tab capture and WebSocket
  if (window.keledonProcessor) {
    window.keledonProcessor.disconnect();
    window.keledonProcessor = null;
  }
  if (window.keledonTabAudioStream) {
    window.keledonTabAudioStream.getTracks().forEach(track => track.stop());
    window.keledonTabAudioStream = null;
  }
  if (sttWebSocket) {
    sttWebSocket.close();
    sttWebSocket = null;
  }
  addMessage('⏹️ STT stopped', 'assistant');
}

// Phase O/N-2/3: Real STT/TTS implementation

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
// Log Panel Setup (inside DOMContentLoaded)
// ==============================

// Log panel toggle
const logToggleBtn = document.getElementById('logToggleBtn');
if (logToggleBtn) {
  logToggleBtn.addEventListener('click', () => {
    const logPanel = document.getElementById('logPanel');
    if (logPanel) {
      const isHidden = logPanel.style.display === 'none' || logPanel.style.display === '';
      logPanel.style.display = isHidden ? 'flex' : 'none';
      addLogMessage('info', `Log panel ${isHidden ? 'opened' : 'closed'}`);
    }
  });
}

// Copy logs
const copyLogBtn = document.getElementById('copyLogBtn');
if (copyLogBtn) {
  copyLogBtn.addEventListener('click', () => {
    const logsText = logMessages.join('\n');
    navigator.clipboard.writeText(logsText).then(() => {
      addLogMessage('info', 'Logs copied to clipboard');
    }).catch(err => {
      addLogMessage('error', 'Failed to copy logs: ' + err.message);
    });
  });
}

// Paste logs
const pasteLogBtn = document.getElementById('pasteLogBtn');
if (pasteLogBtn) {
  pasteLogBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      addLogMessage('info', '=== PASTED LOGS ===');
      text.split('\n').forEach(line => {
        addLogMessage('info', line);
      });
      addLogMessage('info', '=== END PASTED LOGS ===');
    } catch (err) {
      addLogMessage('error', 'Failed to paste logs: ' + err.message);
    }
  });
}

// Clear logs
const clearLogBtn = document.getElementById('clearLogBtn');
if (clearLogBtn) {
  clearLogBtn.addEventListener('click', () => {
    logMessages.length = 0;
    const logsContent = document.getElementById('logs-content');
    if (logsContent) {
      logsContent.innerHTML = '';
    }
    addLogMessage('info', 'Logs cleared');
  });
}

// Close log panel
const closeLogBtn = document.getElementById('closeLogBtn');
if (closeLogBtn) {
  closeLogBtn.addEventListener('click', () => {
    const logPanel = document.getElementById('logPanel');
    if (logPanel) {
      logPanel.style.display = 'none';
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

// ==============================
// Collapsible Tools & Diagnostics (Legacy/Cleaned)
// ==============================
function initCollapsibleTools() {
  const toolsHeader = document.getElementById('toolsHeader');
  const toolsContent = document.getElementById('toolsContent');
  const toolsToggle = document.getElementById('toolsToggle');

  if (!toolsHeader || !toolsContent) return;

  // Load persisted state
  chrome.storage?.local.get(['toolsCollapsed'], (result) => {
    if (result.toolsCollapsed === true) {
      toolsContent.classList.remove('open');
      if (toolsToggle) toolsToggle.classList.remove('open');
    } else {
      toolsContent.classList.add('open');
      if (toolsToggle) toolsToggle.classList.add('open');
    }
  });

  toolsHeader.addEventListener('click', () => {
    const isOpen = toolsContent.classList.contains('open');
    if (isOpen) {
      toolsContent.classList.remove('open');
      if (toolsToggle) toolsToggle.classList.remove('open');
      chrome.storage?.local.set({ toolsCollapsed: true });
    } else {
      toolsContent.classList.add('open');
      if (toolsToggle) toolsToggle.classList.add('open');
      chrome.storage?.local.set({ toolsCollapsed: false });
    }
  });
}

// ==============================
// LED Status System (Task 2)
// ==============================
function updateLEDs() {
  if (typeof runtimeHealth !== 'undefined') {
    runtimeHealth.evaluate().then(state => {
      const ledSw = document.getElementById('led-sw');
      const ledWs = document.getElementById('led-ws');
      const ledStt = document.getElementById('led-stt');
      const ledTts = document.getElementById('led-tts');
      const ledRtc = document.getElementById('led-rtc');
      const ledAgent = document.getElementById('led-agent');

      if (ledSw) ledSw.className = 'led ' + state.sw;
      if (ledWs) ledWs.className = 'led ' + state.ws;
      if (ledStt) ledStt.className = 'led ' + state.stt;
      if (ledTts) ledTts.className = 'led ' + state.tts;
      if (ledRtc) ledRtc.className = 'led ' + state.rtc;
      if (ledAgent) ledAgent.className = 'led ' + state.agent;
    });
  }
}

// Initialize collapsible tools
initCollapsibleTools();

// Start LED health polling
setInterval(updateLEDs, 5000);
updateLEDs(); // Initial check

// Additional tool buttons
const healthCheckBtn = document.getElementById('healthCheckBtn');
if (healthCheckBtn) {
  healthCheckBtn.addEventListener('click', async () => {
    addMessage('Running health check...', 'assistant');
    if (typeof runtimeHealth !== 'undefined') {
      const state = await runtimeHealth.evaluate();
      let report = 'Health Report:\n';
      report += `SW: ${state.sw.toUpperCase()}\n`;
      report += `WS: ${state.ws.toUpperCase()}\n`;
      report += `STT: ${state.stt.toUpperCase()}\n`;
      report += `TTS: ${state.tts.toUpperCase()}\n`;
      report += `RTC: ${state.rtc.toUpperCase()}\n`;
      report += `AG: ${state.agent.toUpperCase()}`;
      addMessage(report, 'assistant');
    } else {
      addMessage('Runtime health service not loaded', 'assistant');
    }
  });
}

const testSTTBtn = document.getElementById('testSTTBtn');
if (testSTTBtn) {
  testSTTBtn.addEventListener('click', () => {
    addMessage('Testing STT...', 'assistant');
    if (isSTTListening) {
      stopSTTListening();
    } else {
      startSTTListening();
    }
  });
}

const testTTSBtn = document.getElementById('testTTSBtn');
if (testTTSBtn) {
  testTTSBtn.addEventListener('click', () => {
    const testText = "KELEDON TTS test - this is real text to speech output";
    speakText(testText);
    addMessage('TTS test: ' + testText, 'assistant');
  });
}