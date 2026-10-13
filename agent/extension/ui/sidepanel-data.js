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

// ==============================

