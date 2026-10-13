    // ==================== ELEMENTS ====================
    const tabBar = document.getElementById('tabBar');
    const tabAddBtn = document.getElementById('tabAddBtn');
    const navBack = document.getElementById('navBack');
    const navForward = document.getElementById('navForward');
    const navRefresh = document.getElementById('navRefresh');
    const navHome = document.getElementById('navHome');
    const navUrl = document.getElementById('navUrl');
    const navLoading = document.getElementById('navLoading');
    const connDot = document.getElementById('connDot');
    const panelBtn = document.getElementById('panelBtn');
    const versionBtn = document.getElementById('versionBtn');
    const contentArea = document.getElementById('contentArea');
    const newTabUrl = document.getElementById('newTabUrl');
    const sidePanel = document.getElementById('sidePanel');
    const panelOverlay = document.getElementById('panelOverlay');
    const panelClose = document.getElementById('panelClose');
    const panelConnStatus = document.getElementById('panelConnStatus');

    // Side panel form elements
    const cloudUrlInput = document.getElementById('cloudUrl');
    const pairingCodeInput = document.getElementById('pairingCode');
    const keledonIdInput = document.getElementById('keledonId');
    const connectBtn = document.getElementById('connectBtn');
    const goalInput = document.getElementById('goalInput');
    const executeBtn = document.getElementById('executeBtn');
    const startCallBtn = document.getElementById('startCallBtn');
    const muteBtn = document.getElementById('muteBtn');
    const holdBtn = document.getElementById('holdBtn');
    const hangupBtn = document.getElementById('hangupBtn');
    const callSection = document.getElementById('callSection');
    const activityLogEl = document.getElementById('activityLog');
    const copyActivityBtn = document.getElementById('copyActivityBtn');
    const activityCopyStatus = document.getElementById('activityCopyStatus');
    const loadingBar = document.getElementById('loadingBar');

    let isMuted = false;
    let isOnHold = false;
    let isConnected = false;
    let tabs = [];
    let activeTabId = 'home';
    let panelOpen = false;
    let deviceVersion = 'v5.0.54';

    // BrowserView is rendered by Electron above normal DOM, so z-index alone cannot
    // keep KELEDON controls visible over a loaded tab. Whenever a first-party
    // panel/modal opens, tell the main process to inset or detach the active tab view.
    function syncKeledonChromeLayer(reason = 'sync') {
      if (!window.keledon?.tabs?.setChromeOverlayState) return;
      const commandLogOpen = Boolean(cmdlogModal?.classList.contains('show'));
      const escalationOpen = Boolean(document.getElementById('escalationModal')?.classList.contains('show'));
      if (commandLogOpen || escalationOpen) {
        window.keledon.tabs.setChromeOverlayState({ hideContent: true, rightInset: 0, reason }).catch(() => {});
        return;
      }
      const panelWidth = panelOpen ? Math.ceil(sidePanel.getBoundingClientRect().width || 380) : 0;
      window.keledon.tabs.setChromeOverlayState({ hideContent: false, rightInset: panelWidth, reason }).catch(() => {});
    }

    // ==================== LOGGING ====================
    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function log(message, type = 'info') {
      const entry = document.createElement('div');
      entry.className = `activity-entry ${type}`;
      entry.innerHTML = `<div class="time">${new Date().toLocaleTimeString()}</div><div class="msg">${message}</div>`;
      activityLogEl.appendChild(entry);
      activityLogEl.scrollTop = activityLogEl.scrollHeight;
      console.log(`[${type.toUpperCase()}] ${message}`);
    }

    function setActivityCopyStatus(message, kind = 'info') {
      if (!activityCopyStatus) return;
      activityCopyStatus.textContent = message;
      activityCopyStatus.style.color = kind === 'error' ? '#d93025' : kind === 'success' ? '#1e8e3e' : 'var(--text-secondary)';
    }

    function serializeActivityEntries() {
      const entries = Array.from(activityLogEl.querySelectorAll('.activity-entry')).map((entry) => {
        const time = entry.querySelector('.time')?.textContent?.trim() || '';
        const msg = entry.querySelector('.msg')?.textContent?.trim() || '';
        const type = entry.classList.contains('success') ? 'success' : entry.classList.contains('error') ? 'error' : 'info';
        return { time, type, msg };
      });

      return entries.map((entry) => `[${entry.time}] [${entry.type.toUpperCase()}] ${entry.msg}`).join('\n');
    }

    async function copyActivityLogs() {
      const copiedAt = new Date().toISOString();
      const body = 'Raw activity messages excluded for privacy; see safe event counts below.';

      // Gather diagnostic data for richer copy
      let diagSection = '';
      let mainLogs = '';
      try {
        const report = await buildAggregatedCopyReport();
        diagSection = report.diagnosticJSON;
        mainLogs = report.mainLogs;
      } catch (e) {
        diagSection = '--- Diagnostic Report (unavailable) ---\n' + e.message;
      }

      const payload = [
        '========================================',
        '  KELEDON Browser Activity Dump',
        '========================================',
        `Version: ${deviceVersion}`,
        `Time: ${copiedAt}`,
        '',
        '--- Activity Log ---',
        body,
        '',
        mainLogs,
        '',
        diagSection,
      ].join('\n');

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(payload);
        } else {
          const fallback = document.createElement('textarea');
          fallback.value = payload;
          fallback.setAttribute('readonly', 'true');
          fallback.style.position = 'fixed';
          fallback.style.opacity = '0';
          document.body.appendChild(fallback);
          fallback.focus();
          fallback.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(fallback);
          if (!ok) throw new Error('document.execCommand("copy") failed');
        }
        setActivityCopyStatus(`Copied ${activityLogEl.querySelectorAll('.activity-entry').length} entries`, 'success');
        log(`Copied activity logs for ${deviceVersion}`, 'success');
      } catch (error) {
        console.error('Failed to copy activity logs:', error);
        setActivityCopyStatus('Copy failed', 'error');
        log('Failed to copy activity logs', 'error');
      }
    }

    async function buildAggregatedCopyReport() {
      return { diagnosticJSON: JSON.stringify(await buildDiagnosticReport(), null, 2), mainLogs: 'Raw logs excluded for privacy.' };
    }

    // ==================== CONNECTION STATUS ====================
    function setConnectionStatus(status) {
      const labels = { disconnected: 'Disconnected', connecting: 'Connecting...', connected: 'Connected' };
      panelConnStatus.className = `conn-status ${status}`;
      panelConnStatus.innerHTML = `<div class="conn-dot-lg"></div><span>${labels[status]}</span>`;
      connDot.className = `conn-dot ${status}`;
      connDot.title = labels[status];
      if (status === 'connected') {
        callSection.style.display = 'block';
        executeBtn.disabled = false;
      } else {
        callSection.style.display = 'none';
        executeBtn.disabled = true;
      }
    }

    // ==================== DEVICE INFO ====================
    async function loadDeviceInfo() {
      try {
        const info = await window.keledon.device.getInfo();
        deviceVersion = `v${info.version}`;
        versionBtn.textContent = deviceVersion;
        log('Device initialized: ' + info.deviceId, 'info');
        setActivityCopyStatus(`Version ${deviceVersion} loaded`, 'info');
      } catch (e) {
        deviceVersion = 'v5.0.54';
        versionBtn.textContent = deviceVersion;
        log('Device info error: ' + e.message, 'error');
        setActivityCopyStatus('Version unavailable', 'error');
      }
    }

    // ==================== TAB MANAGEMENT ====================
    async function loadTabs() {
      try {
        tabs = await window.keledon.tabs.list();
        renderTabs();
      } catch (e) {
        console.error('Failed to load tabs:', e);
      }
    }

    function renderTabs() {
      // Remove all tab elements except home tab and add button
      const existingTabs = tabBar.querySelectorAll('.tab:not([data-tab-id="home"])');
      existingTabs.forEach(t => t.remove());

      // Update home tab styling
      const homeTab = tabBar.querySelector('.tab[data-tab-id="home"]');
      if (homeTab) {
        const isHomeActive = activeTabId === 'home' || !tabs.find(t => t.active);
        homeTab.className = `tab ${isHomeActive ? 'active' : ''}`;
      }

      // Render tabs from main process
      let activeTabInfo = null;
      tabs.forEach(tab => {
        if (tab.active) activeTabInfo = tab;
        const tabEl = document.createElement('div');
        tabEl.className = `tab ${tab.active ? 'active' : ''}`;
        tabEl.dataset.tabId = tab.id;
        const icon = tab.loading ? '&#x21BB;' : '&#x1F4C4;';
        tabEl.innerHTML = `
          <span class="tab-icon">${icon}</span>
          <span class="tab-name">${tab.name || 'Loading...'}</span>
          <button class="tab-close" data-close="${tab.id}">&#x00D7;</button>
        `;
        tabEl.addEventListener('click', (e) => {
          if (!e.target.classList.contains('tab-close')) {
            switchTab(tab.id);
          }
        });
        tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
          e.stopPropagation();
          closeTab(tab.id);
        });
        tabBar.insertBefore(tabEl, tabAddBtn);
      });

      // Show/hide content area based on active tab
      if (activeTabInfo) {
        contentArea.classList.add('hidden');
      } else {
        contentArea.classList.remove('hidden');
      }

      updateNavBar(activeTabInfo);
    }

    async function switchTab(tabId) {
      try {
        await window.keledon.tabs.switch(tabId);
        activeTabId = tabId;
        loadTabs();
      } catch (e) {
        log('Switch tab error: ' + e.message, 'error');
      }
    }

    async function closeTab(tabId) {
      try {
        await window.keledon.tabs.close(tabId);
        loadTabs();
      } catch (e) {
        log('Close tab error: ' + e.message, 'error');
      }
    }

    // ==================== TAB ADD BUTTON ====================
    tabAddBtn.addEventListener('click', () => {
      window.keledon.tabs.create('New Tab', 'https://www.google.com').then(result => {
        log('Created tab: ' + result.id, 'info');
        loadTabs();
      }).catch(e => {
        log('Create tab error: ' + e.message, 'error');
      });
    });

    copyActivityBtn.addEventListener('click', copyActivityLogs);

    // Listen for tab updates from main process
    window.keledon.tabs.onUpdate((newTabs) => {
      tabs = newTabs;
      // Find active tab
      const active = tabs.find(t => t.active);
      if (active) {
        activeTabId = active.id;
      } else {
        activeTabId = 'home';
      }
      renderTabs();
    });

    // ==================== NAVIGATION BAR ====================
    function updateNavBar(activeTab) {
      if (!activeTab || activeTab.id === 'home') {
        navUrl.value = '';
        navUrl.readOnly = true;
        navUrl.placeholder = 'Search or enter URL';
        navBack.disabled = true;
        navForward.disabled = true;
        navRefresh.disabled = true;
        contentArea.classList.remove('hidden');
        navLoading.classList.remove('active');
        return;
      }

      navUrl.value = activeTab.url || '';
      navUrl.readOnly = false;
      navUrl.placeholder = 'Search or enter URL';
      navBack.disabled = !activeTab.canGoBack;
      navForward.disabled = !activeTab.canGoForward;
      navRefresh.disabled = false;
      contentArea.classList.add('hidden');

      if (activeTab.loading) {
        navLoading.classList.add('active');
      } else {
        navLoading.classList.remove('active');
      }
    }

    navBack.addEventListener('click', () => window.keledon.tabs.goBack());
    navForward.addEventListener('click', () => window.keledon.tabs.goForward());
    navRefresh.addEventListener('click', () => window.keledon.tabs.reload());

    navHome.addEventListener('click', () => {
      // Switch to home tab
      activeTabId = 'home';
      renderTabs();
      // Remove BrowserView by switching to home
      window.keledon.tabs.switch('home').catch(() => {});
    });

    navUrl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        let url = navUrl.value.trim();
        if (!url) return;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          // Check if it looks like a URL
          if (url.includes('.') && !url.includes(' ')) {
            url = 'https://' + url;
          } else {
            // Search query - use Google
            url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
          }
        }
        if (activeTabId === 'home') {
          // Create new tab
          window.keledon.tabs.create('New Tab', url).then(() => loadTabs());
        } else {
          // Navigate current tab
          window.keledon.tabs.navigate(url);
        }
      }
    });

    // New tab page search
    newTabUrl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        let url = newTabUrl.value.trim();
        if (!url) return;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          if (url.includes('.') && !url.includes(' ')) {
            url = 'https://' + url;
          } else {
            url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
          }
        }
        window.keledon.tabs.create('New Tab', url).then(() => loadTabs());
      }
    });

    // Shortcuts on new tab page
    document.querySelectorAll('.shortcut[data-url]').forEach(el => {
      el.addEventListener('click', () => {
        window.keledon.tabs.create('New Tab', el.dataset.url).then(() => loadTabs());
      });
    });

    document.getElementById('shortcutConnect').addEventListener('click', () => {
      togglePanel(true);
      cloudUrlInput.focus();
    });

    document.getElementById('shortcutExecute').addEventListener('click', () => {
      if (!isConnected) {
        togglePanel(true);
        cloudUrlInput.focus();
      } else {
        togglePanel(true);
        goalInput.focus();
      }
    });

    // ==================== SIDE PANEL ====================
    function togglePanel(forceOpen) {
      if (forceOpen === true) {
        panelOpen = true;
      } else if (forceOpen === false) {
        panelOpen = false;
      } else {
        panelOpen = !panelOpen;
      }
      sidePanel.classList.toggle('open', panelOpen);
      panelOverlay.classList.toggle('show', panelOpen);
      panelBtn.classList.toggle('active', panelOpen);
      syncKeledonChromeLayer(panelOpen ? 'side-panel-open' : 'side-panel-closed');
    }

    panelBtn.addEventListener('click', () => togglePanel());
    panelClose.addEventListener('click', () => togglePanel(false));
    panelOverlay.addEventListener('click', () => togglePanel(false));

    // ==================== CONNECTION ====================
    window.keledon.launcher.onLaunch((data) => {
      log('Launch data received', 'info');
      if (data.action === 'auto-connect' && data.keledonId && data.code) {
        cloudUrlInput.value = data.cloudUrl || 'https://keledon.tuyoisaza.com';
        pairingCodeInput.value = data.code;
        keledonIdInput.value = data.keledonId;
        setConnectionStatus('connecting');
        log('Auto-connecting to ' + data.keledonId + '...', 'info');
        setTimeout(() => connectBtn.click(), 300);
      } else if (data.action === 'test') {
        log('Test mode: ' + (data.instructions || 'No instructions'), 'info');
      }
    });

    connectBtn.addEventListener('click', async () => {
      const cloudUrl = cloudUrlInput.value.trim();
      const pairingCode = pairingCodeInput.value.trim();
      const keledonId = keledonIdInput.value.trim();
      if (!cloudUrl || !pairingCode) {
        log('Cloud URL and pairing code required', 'error');
        return;
      }
      setConnectionStatus('connecting');
      log('Connecting to ' + cloudUrl + '...', 'info');
      try {
        const result = await window.keledon.runtime.connect({
          cloudUrl, token: pairingCode, keledonId: keledonId || null
        });
        if (result.success) {
          isConnected = true;
          setConnectionStatus('connected');
          log('Connected to ' + (keledonId || 'cloud'), 'success');
        } else {
          setConnectionStatus('disconnected');
          log('Connection failed: ' + result.error, 'error');
        }
      } catch (e) {
        setConnectionStatus('disconnected');
        log('Connection error: ' + e.message, 'error');
      }
    });

    window.keledon.runtime.onStatusChange((status) => {
      if (status.connected) {
        setConnectionStatus('connected');
      } else if (status.status === 'connecting') {
        setConnectionStatus('connecting');
      } else {
        setConnectionStatus('disconnected');
      }
    });

    // ==================== EXECUTE ====================
    const progressDiv = document.getElementById('execute-progress');
    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('progress-bar');
    const rpaStopBtn = document.getElementById('rpaStopBtn');
    const pendingList = document.getElementById('pendingList');

    let isExecuting = false;
    function setExecutingState(active) {
      isExecuting = active;
      if (rpaStopBtn) rpaStopBtn.classList.toggle('visible', active);
    }

    // ==================== PENDING INSTRUCTIONS ====================
    let pendingInstructions = [];
    let pendingIdCounter = 0;

    function addPendingInstruction(type, content, opts = {}) {
      const id = 'pi-' + (++pendingIdCounter);
      const source = opts.source || 'local';
      const status = opts.status || 'pending';
      const data = opts.data || null;

      pendingInstructions.push({ id, type, content, source, status, data });
      renderPendingInstructions();
      return id;
    }

    function updatePendingInstruction(id, changes) {
      const idx = pendingInstructions.findIndex(i => i.id === id);
      if (idx === -1) return;
      pendingInstructions[idx] = { ...pendingInstructions[idx], ...changes };
      renderPendingInstructions();
    }

    function removePendingInstruction(id) {
      pendingInstructions = pendingInstructions.filter(i => i.id !== id);
      renderPendingInstructions();
    }

    function clearPendingInstructions() {
      pendingInstructions = [];
      renderPendingInstructions();
    }

    function renderPendingInstructions() {
      if (!pendingList) return;
      if (pendingInstructions.length === 0) {
        pendingList.innerHTML = '<div class="pending-empty">No instructions pending</div>';
        return;
      }
      pendingList.innerHTML = pendingInstructions.map(item => {
        const statusLabel = item.status === 'pending' ? 'Waiting...'
          : item.status === 'in_progress' ? 'In Progress'
          : item.status === 'completed' ? '✓ Completed'
          : item.status === 'failed' ? '✗ Failed'
          : item.status;
        const sourceLabel = item.source === 'brain' ? 'From Brain'
          : item.source === 'local' ? 'Manual'
          : item.source;
        return `
          <div class="pending-item ${item.status}" data-pi-id="${item.id}">
            <div class="pi-type">${item.type}</div>
            <div class="pi-content">${item.content}</div>
            <div class="pi-status">${statusLabel}</div>
            <div class="pi-source">${sourceLabel}</div>
          </div>
        `;
      }).join('');
    }
