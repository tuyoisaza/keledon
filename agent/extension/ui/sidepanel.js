// ==============================
// KELEDON Side Panel (STABLE CORE)
// ==============================

// Phase O/N-2/3: Real STT/TTS implementation

document.addEventListener('DOMContentLoaded', () => {
  console.log('[KELEDON] Side panel loaded - C57 Restructure');

  // Initialize version from manifest
  const manifest = chrome.runtime.getManifest();
  const versionLabel = document.getElementById('versionLabel');
  if (versionLabel) versionLabel.textContent = `v${manifest.version}`;

  // ==============================
  // Auth Status Functions
  // ==============================
  let currentAuthStatus = {
    isAuthenticated: false,
    userAuth: null
  };

  async function updateAuthStatus() {
    const authStatusText = document.getElementById('authStatusText');
    const authUserInfo = document.getElementById('authUserInfo');
    const connectBtn = document.getElementById('connectToKeledonBtn');
    
    if (!authStatusText) return;

    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });
      
      if (response && response.isAuthenticated) {
        currentAuthStatus.isAuthenticated = true;
        currentAuthStatus.userAuth = response.userAuth;
        
        authStatusText.innerHTML = '<span style="color: var(--success);">✓ Connected to Keledon</span>';
        authUserInfo.innerHTML = `
          <div style="margin-bottom: 4px;"><strong>${response.userAuth?.name || 'Unknown'}</strong></div>
          <div style="color: var(--muted);">${response.userAuth?.email || ''}</div>
          <div style="color: var(--muted); margin-top: 4px;">Role: ${response.userAuth?.role || 'user'}</div>
        `;
        if (connectBtn) {
          connectBtn.textContent = 'Reconnect';
          connectBtn.style.background = 'var(--muted)';
        }
        
        // Update branding in header
        updateBrandingFromAuth(response.userAuth);
        
        // Hide auth overlay in chat
        hideAuthOverlay();
        
      } else {
        currentAuthStatus.isAuthenticated = false;
        currentAuthStatus.userAuth = null;
        
        authStatusText.innerHTML = '<span style="color: var(--warning);">⚠ Not connected</span>';
        authUserInfo.innerHTML = 'Please login to Keledon first';
        if (connectBtn) {
          connectBtn.textContent = 'Connect to Keledon';
          connectBtn.style.background = 'var(--accent)';
        }
        
        // Show auth overlay in chat
        showAuthOverlay();
      }
    } catch (error) {
      console.error('[KELEDON] Failed to get auth status:', error);
      if (authStatusText) {
        authStatusText.innerHTML = '<span style="color: var(--danger);">✕ Error checking status</span>';
      }
    }
  }

  function updateBrandingFromAuth(userAuth) {
    if (!userAuth) return;
    
    const companyName = document.getElementById('companyName');
    const brandName = document.getElementById('brandName');
    const teamName = document.getElementById('teamName');
    
    if (companyName) companyName.textContent = userAuth.companyName || userAuth.companyId?.substring(0, 8) || '—';
    if (brandName) brandName.textContent = userAuth.brandName || '—';
    if (teamName) teamName.textContent = userAuth.teamName || userAuth.teamId?.substring(0, 8) || '—';
  }

  function showAuthOverlay() {
    const conversation = document.getElementById('conversation');
    if (!conversation) return;
    
    // Check if overlay already exists
    if (document.getElementById('authOverlay')) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'authOverlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 19, 26, 0.95);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 50;
      padding: 20px;
      text-align: center;
    `;
    overlay.innerHTML = `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 32px; margin-bottom: 8px;">🔐</div>
        <div style="font-size: 14px; font-weight: 600; color: var(--text);">Please login to Keledon</div>
        <div style="font-size: 12px; color: var(--muted); margin-top: 8px;">
          Connect to your Keledon account to use the agent
        </div>
      </div>
      <button id="authOverlayConnectBtn" class="input-btn" style="background: var(--accent); padding: 10px 20px;">
        Connect to Keledon
      </button>
    `;
    
    conversation.style.position = 'relative';
    conversation.appendChild(overlay);
    
    // Add click handler
    const connectBtnInOverlay = document.getElementById('authOverlayConnectBtn');
    if (connectBtnInOverlay) {
      connectBtnInOverlay.addEventListener('click', handleConnectToKeledon);
    }
  }

  function hideAuthOverlay() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) {
      overlay.remove();
    }
  }

  async function handleConnectToKeledon() {
    const connectBtn = document.getElementById('connectToKeledonBtn');
    
    try {
      if (connectBtn) {
        connectBtn.textContent = 'Connecting...';
        connectBtn.disabled = true;
      }
      
      // Request auth sync from landing page
      const response = await chrome.runtime.sendMessage({ type: 'CONNECT_TO_KEELEDON' });
      
      if (response.success) {
        addMessage(response.message || 'Connection initiated', 'assistant');
        
        // If it opened a new tab, notify user
        if (response.message && response.message.includes('login')) {
          addMessage('Please login in the new tab, then click "Reconnect"', 'assistant');
        }
      } else {
        addMessage('Connection failed: ' + (response.error || 'Unknown error'), 'assistant');
      }
    } catch (error) {
      console.error('[KELEDON] Connect error:', error);
      addMessage('Connection error: ' + error.message, 'assistant');
    } finally {
      if (connectBtn) {
        connectBtn.textContent = 'Reconnect';
        connectBtn.disabled = false;
      }
      // Refresh auth status after connection attempt
      setTimeout(updateAuthStatus, 1000);
    }
  }

  // Add Connect to Keledon button handler
  const connectBtn = document.getElementById('connectToKeledonBtn');
  if (connectBtn) {
    connectBtn.addEventListener('click', handleConnectToKeledon);
  }

  // Initial auth status check
  updateAuthStatus();

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

loadProviderConfig();

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