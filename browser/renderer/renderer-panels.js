    document.addEventListener('DOMContentLoaded', () => {
      const clearPendingBtn = document.getElementById('clearPendingBtn');
      if (clearPendingBtn) {
        clearPendingBtn.addEventListener('click', () => {
          pendingInstructions = pendingInstructions.filter(i => i.status === 'in_progress' || i.status === 'pending');
          if (pendingInstructions.length === 0 || confirm('Clear completed/failed items?')) {
            pendingInstructions = pendingInstructions.filter(i => i.status === 'in_progress' || i.status === 'pending');
            renderPendingInstructions();
          }
        });
      }
    });

    executeBtn.addEventListener('click', async () => {
      const goal = goalInput.value.trim();
      if (!goal) { log('Goal required', 'error'); return; }

      // Add to pending instructions
      const piId = addPendingInstruction('GOAL', goal, { status: 'in_progress', source: 'local' });

      // Show progress UI + stop button
      if (progressDiv) progressDiv.style.display = 'block';
      if (progressText) progressText.textContent = 'Starting...';
      if (progressBar) { progressBar.style.width = '5%'; progressBar.style.background = '#f9ab00'; }
      setExecutingState(true);

      // Listen for progress updates
      let currentStep = 0;
      let totalSteps = 100;
      window.keledon.executor.onProgress((p) => {
        if (!progressText || !progressBar) return;
        currentStep = p.step || 0;
        totalSteps = p.total || 100;
        const pct = Math.round((currentStep / totalSteps) * 100);
        progressText.textContent = `[${currentStep}/${totalSteps}] ${p.action}: ${p.description}`;
        progressBar.style.width = Math.max(pct, 5) + '%';
        if (p.status === 'done') progressBar.style.background = '#1a73e8';
        else if (p.status === 'failed') progressBar.style.background = '#d93025';
        else progressBar.style.background = '#f9ab00';
      });

      try {
        const result = await window.keledon.executor.executeGoal({ goal }, {});
        setExecutingState(false);
        const success = result.goal_status === 'success';
        const aborted = result.goal_status === 'aborted' || result.status === 'aborted';
        const partial = result.goal_status === 'uncertain';
        const finalText = aborted ? '⏹ Stopped' : success ? '✓ Success' : partial ? '⚠ Partial' : '✗ Failed';
        if (progressText) {
          progressText.textContent = `${finalText} - ${result.steps?.length || 0} steps`;
        }
        if (progressBar) {
          progressBar.style.width = '100%';
          if (aborted) progressBar.style.background = '#5f6368';
          else if (success) progressBar.style.background = '#1a73e8';
          else if (result.goal_status === 'failed') progressBar.style.background = '#d93025';
          else progressBar.style.background = '#f9ab00';
        }
        log('Executed: ' + goal.substring(0, 50), success ? 'success' : 'error');
        updatePendingInstruction(piId, {
          status: aborted ? 'cancelled' : success ? 'completed' : partial ? 'in_progress' : 'failed',
          content: goal + (aborted ? ' ⏹' : success ? ' ✓' : partial ? ' ⚠ continuing' : ' ✗'),
        });
        goalInput.value = '';
        setTimeout(() => { if (progressDiv) progressDiv.style.display = 'none'; }, 3000);
      } catch (e) {
        setExecutingState(false);
        if (progressText) progressText.textContent = '✗ Error: ' + e.message;
        if (progressBar) progressBar.style.background = '#d93025';
        log('Execution error: ' + e.message, 'error');
        updatePendingInstruction(piId, { status: 'failed', content: goal + ' ✗' });
      }
    });

    // Stop button handler — aborts the current RPA execution
    if (rpaStopBtn) {
      rpaStopBtn.addEventListener('click', () => {
        log('RPA Stop requested', 'info');
        window.keledon.executor.abortGoal();
        rpaStopBtn.classList.remove('visible');  // immediate feedback
      });
    }

    // ==================== CALL CONTROLS ====================
    startCallBtn.addEventListener('click', async () => {
      if (startCallBtn.classList.contains('active')) {
        try {
          await window.keledon.media.stopCall();
          startCallBtn.classList.remove('active');
          startCallBtn.textContent = '\u{1F4DE} Start Call';
          muteBtn.disabled = true;
          holdBtn.disabled = true;
          hangupBtn.disabled = true;
          log('Call ended', 'info');
        } catch (e) { log('End call error: ' + e.message, 'error'); }
      } else {
        try {
          await window.keledon.media.startCall();
          startCallBtn.classList.add('active');
          startCallBtn.textContent = '\u{1F4F7} End Call';
          muteBtn.disabled = false;
          holdBtn.disabled = false;
          hangupBtn.disabled = false;
          log('Call started', 'success');
        } catch (e) { log('Start call error: ' + e.message, 'error'); }
      }
    });

    muteBtn.addEventListener('click', async () => {
      isMuted = !isMuted;
      try {
        await (isMuted ? window.keledon.media.mute() : window.keledon.media.unmute());
        muteBtn.textContent = isMuted ? '\u{1F50A} Unmute' : '\u{1F507} Mute';
      } catch (e) { log('Mute error: ' + e.message, 'error'); }
    });

    holdBtn.addEventListener('click', async () => {
      isOnHold = !isOnHold;
      try {
        await (isOnHold ? window.keledon.media.hold() : window.keledon.media.resume());
        holdBtn.textContent = isOnHold ? '\u25B6 Resume' : '\u23F8 Hold';
      } catch (e) { log('Hold error: ' + e.message, 'error'); }
    });

    hangupBtn.addEventListener('click', async () => {
      try {
        await window.keledon.media.hangup();
        startCallBtn.classList.remove('active');
        startCallBtn.textContent = '\u{1F4DE} Start Call';
        muteBtn.disabled = true; holdBtn.disabled = true; hangupBtn.disabled = true;
        muteBtn.textContent = '\u{1F507} Mute';
        holdBtn.textContent = '\u23F8 Hold';
        log('Call ended', 'info');
      } catch (e) { log('Hangup error: ' + e.message, 'error'); }
    });

    window.keledon.media.onTranscript((entry) => {
      log('Transcript (' + (entry.speaker || 'customer') + '): ' + entry.text, 'info');
    });

    window.keledon.media.onCallStatus((data) => {
      log('Call status: ' + data.status, 'info');
    });

    // ==================== BRAIN ====================
    window.keledon.brain.onCommand((cmd) => {
      if (cmd.type === 'say' || (cmd.data && cmd.data.say)) {
        const text = cmd.data.say?.text || cmd.data.text;
        if (text) {
          // Fallback to local SpeechSynthesis; cloud audio arrives via brain:audio
          window.keledon.media.speak(text, cmd.data.say?.interruptible ?? true).catch(e => {
            log('TTS error: ' + e.message, 'error');
          });
        }
      }
      if (cmd.type === 'ui_steps') {
        const steps = cmd.ui_steps || cmd.data?.steps || cmd.steps || [];
        if (steps.length > 0) {
          const stepNames = steps.map(s => s.label || s.name || s.action || 'step').join(', ');
          const piId = addPendingInstruction('UI STEPS', stepNames.substring(0, 80), {
            status: 'in_progress',
            source: 'brain',
            data: steps,
          });
          setExecutingState(true);
          window.keledon.executor.executeSteps(steps).then(result => {
            setExecutingState(false);
            log('ui_steps result: ' + JSON.stringify(result).substring(0, 80), 'info');
            updatePendingInstruction(piId, { status: 'completed' });
          }).catch(e => {
            setExecutingState(false);
            log('ui_steps error: ' + e.message, 'error');
            updatePendingInstruction(piId, { status: 'failed' });
          });
        }
      }
      if (cmd.type === 'goal_execute' && cmd.data) {
        const goalText = cmd.data.goal || cmd.data.objective || cmd.data.text || JSON.stringify(cmd.data).substring(0, 60);
        const piId = addPendingInstruction('GOAL', goalText, {
          status: 'in_progress',
          source: 'brain',
          data: cmd.data,
        });
        setExecutingState(true);
        window.keledon.executor.executeGoal(cmd.data, {}).then(result => {
          setExecutingState(false);
          const aborted = result.goal_status === 'aborted' || result.status === 'aborted';
          const success = result.goal_status === 'success';
          const partial = result.goal_status === 'uncertain';
          log('Brain goal: ' + goalText.substring(0, 50), success ? 'success' : aborted ? 'info' : partial ? 'info' : 'error');
          updatePendingInstruction(piId, { status: aborted ? 'cancelled' : success ? 'completed' : partial ? 'in_progress' : 'failed', content: goalText + (aborted ? ' ⏹' : success ? ' ✓' : partial ? ' ⚠ continuing' : ' ✗') });
        }).catch(e => {
          setExecutingState(false);
          log('Brain goal error: ' + e.message, 'error');
          updatePendingInstruction(piId, { status: 'failed', content: goalText + ' ✗' });
        });
      }
      log('Brain command: ' + cmd.type, 'info');
    });

    // Cloud TTS audio — play ElevenLabs MP3 when available (overrides local SpeechSynthesis)
    window.keledon.brain.onAudio((audioData) => {
      try {
        const bytes = Uint8Array.from(atob(audioData.audio), c => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        audio.onerror = (e) => log('Cloud audio playback error: ' + e, 'error');
        // Cancel any in-progress local SpeechSynthesis before playing cloud audio
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        audio.play().catch(e => log('Cloud audio play() failed: ' + e.message, 'error'));
        log('Playing cloud TTS audio (' + (audioData.duration ? audioData.duration.toFixed(1) + 's' : '?') + ')', 'info');
      } catch (e) {
        log('Cloud audio decode error: ' + e.message, 'error');
      }
    });

    // ==================== ESCALATION ====================
    window.keledon.escalation.onShow(({ type, data }) => {
      document.getElementById('escalationType').className = `escalation-type ${type}`;
      document.getElementById('escalationType').textContent = type === 'trigger' ? 'ESCALATION' : 'RPA FAILURE';
      document.getElementById('escalationMessage').innerHTML = type === 'trigger'
        ? `<strong>Escalation keyword:</strong> "${data.triggerWord}"`
        : `<strong>RPA execution failed:</strong> ${data.message}`;
      document.getElementById('escalationDetail').textContent = type === 'trigger'
        ? `Customer said: "${data.message}"`
        : `Step: ${data.step || 'unknown'} | Retries: ${data.retryCount || 0}`;
      document.getElementById('escalationModal').classList.add('show');
      syncKeledonChromeLayer('escalation-open');
    });

    document.getElementById('escalationContinue').addEventListener('click', () => {
      document.getElementById('escalationModal').classList.remove('show');
      syncKeledonChromeLayer('escalation-continue');
      window.keledon.escalation.action('continue');
    });
    document.getElementById('escalationFix').addEventListener('click', () => {
      document.getElementById('escalationModal').classList.remove('show');
      syncKeledonChromeLayer('escalation-fix');
      window.keledon.escalation.action('fix');
    });
    document.getElementById('escalationAbort').addEventListener('click', () => {
      document.getElementById('escalationModal').classList.remove('show');
      syncKeledonChromeLayer('escalation-abort');
      window.keledon.escalation.action('abort');
    });

    // ==================== AGENT INJECTION (WebRTC) ====================
    // cite: docs/specs/v1_keledon_webrtc_agent_participation.md
    const consentCheckbox = document.getElementById('consentCheckbox');
    const armInjectionBtn = document.getElementById('armInjectionBtn');
    const disarmInjectionBtn = document.getElementById('disarmInjectionBtn');
    const injectionStatus = document.getElementById('injectionStatus');

    function setInjectionStatus(state) {
      const colors = { DISARMED: '#888', ARMED: '#4caf50', FAILED: '#f44336' };
      injectionStatus.textContent = state;
      injectionStatus.style.color = colors[state] || '#888';
    }

    consentCheckbox.addEventListener('change', () => {
      armInjectionBtn.disabled = !consentCheckbox.checked;
    });

    armInjectionBtn.addEventListener('click', async () => {
      armInjectionBtn.disabled = true;
      setInjectionStatus('ARMING...');
      log('Agent injection: arming — consent granted', 'info');
      try {
        const result = await window.keledon.webrtc.arm();
        if (result.success) {
          setInjectionStatus('ARMED');
          disarmInjectionBtn.disabled = false;
          log('Agent injection: ARMED — getUserMedia override active', 'info');
        } else {
          setInjectionStatus('FAILED');
          armInjectionBtn.disabled = false;
          log('Agent injection arm failed: ' + result.error, 'error');
        }
      } catch (e) {
        setInjectionStatus('FAILED');
        armInjectionBtn.disabled = false;
        log('Agent injection error: ' + e.message, 'error');
      }
    });

    disarmInjectionBtn.addEventListener('click', async () => {
      disarmInjectionBtn.disabled = true;
      await window.keledon.webrtc.disarm();
      setInjectionStatus('DISARMED');
      armInjectionBtn.disabled = !consentCheckbox.checked;
      log('Agent injection: DISARMED', 'info');
    });

    // Show agent injection panel when connected (it depends on an active tab)
    window.keledon.runtime.onStatusChange((status) => {
      const injSection = document.getElementById('agentInjectionSection');
      if (injSection && status && status.connected) {
        injSection.style.display = 'block';
      }
    });

    // ==================== VERSION ====================
    async function buildDiagnosticReport() {
      return KeledonVersionActions.safeReport(await window.keledon.device.getInfo(),
        await window.keledon.runtime.getStatus(), { activity: activityLogEl.querySelectorAll('.activity-entry').length });
    }
    KeledonVersionActions.mount(window);

    // ==================== COMMAND ACTIVITY LOG ====================
    const cmdlogBtn = document.getElementById('cmdlogBtn');
    const cmdlogModal = document.getElementById('cmdlogModal');
    const cmdlogClose = document.getElementById('cmdlogClose');
    const cmdlogBody = document.getElementById('cmdlogBody');
    const cmdlogEmpty = document.getElementById('cmdlogEmpty');
    const cmdlogStatus = document.getElementById('cmdlogStatus');
    const cmdlogCopyBtn = document.getElementById('cmdlogCopyBtn');
    const cmdlogClearBtn = document.getElementById('cmdlogClearBtn');
    let cmdlogUnsubscribe = null;
    let cmdlogEntryCount = 0;

    function cmdlogAddEntry(entry) {
      cmdlogEmpty.style.display = 'none';
      const row = document.createElement('div');
      row.className = 'cmdlog-entry';
      const time = new Date(entry.timestamp);
      const timeStr = time.toLocaleTimeString();
      const tag = entry.event || 'SYS';
      row.innerHTML = `<span class="time">${timeStr}</span><span class="tag tag-${tag}">${tag}</span><span class="detail">${escapeHtml(entry.detail)}</span>`;
      cmdlogBody.appendChild(row);
      cmdlogBody.scrollTop = cmdlogBody.scrollHeight;
      cmdlogEntryCount++;
      cmdlogStatus.textContent = `${cmdlogEntryCount} entries`;
    }

    function cmdlogOpen() {
      cmdlogModal.classList.add('show');
      syncKeledonChromeLayer('cmdlog-open');
      // Load existing entries from main process
      window.keledon.cmdlog.getLog().then(entries => {
        cmdlogBody.innerHTML = '';
        cmdlogEntryCount = 0;
        if (!entries || entries.length === 0) {
          cmdlogEmpty.style.display = 'block';
          cmdlogStatus.textContent = '0 entries';
          return;
        }
        entries.forEach(cmdlogAddEntry);
      }).catch(e => {
        console.error('Failed to load cmdlog:', e);
        cmdlogStatus.textContent = 'Failed to load';
      });
      // Subscribe to live entries
      if (window.keledon.cmdlog && !cmdlogUnsubscribe) {
        cmdlogUnsubscribe = window.keledon.cmdlog.onEntry(cmdlogAddEntry);
      }
    }

    function cmdlogCloseFn() {
      cmdlogModal.classList.remove('show');
      syncKeledonChromeLayer('cmdlog-closed');
    }

    cmdlogBtn.addEventListener('click', cmdlogOpen);
    cmdlogClose.addEventListener('click', cmdlogCloseFn);
    cmdlogModal.addEventListener('click', (e) => {
      if (e.target === cmdlogModal) cmdlogCloseFn();
    });

    cmdlogClearBtn.addEventListener('click', async () => {
      try {
        await window.keledon.cmdlog.clearLog();
        cmdlogBody.innerHTML = '';
        cmdlogEntryCount = 0;
        cmdlogEmpty.style.display = 'block';
        cmdlogStatus.textContent = 'Cleared';
      } catch (e) {
        console.error('Failed to clear cmdlog:', e);
      }
    });

    cmdlogCopyBtn.addEventListener('click', async () => {
      const entries = Array.from(cmdlogBody.querySelectorAll('.cmdlog-entry')).map(row => {
        const time = row.querySelector('.time')?.textContent || '';
        const tag = row.querySelector('.tag')?.textContent || '';
        const detail = row.querySelector('.detail')?.textContent || '';
        return `[${time}] [${tag}] ${detail}`;
      });
      const body = entries.length ? entries.join('\n') : '(no entries)';
      const payload = [
        '========================================',
        '  KELEDON Command Activity Log',
        '========================================',
        `Copied: ${new Date().toISOString()}`,
        `Version: ${deviceVersion}`,
        `Entries: ${entries.length}`,
        '',
        body,
      ].join('\n');
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(payload);
        } else {
          const fb = document.createElement('textarea');
          fb.value = payload;
          fb.readOnly = true;
          fb.style.position = 'fixed';
          fb.style.opacity = '0';
          document.body.appendChild(fb);
          fb.focus();
          fb.select();
          document.execCommand('copy');
          document.body.removeChild(fb);
        }
        cmdlogStatus.textContent = `Copied ${entries.length} entries`;
      } catch (e) {
        console.log('Fallback cmdlog output:\n' + payload);
        cmdlogStatus.textContent = 'Copied to console';
      }
    });

    // ==================== DEVTOOLS BUTTON ====================
    const devtoolsBtn = document.getElementById('devtoolsBtn');
    devtoolsBtn.addEventListener('click', () => {
      window.keledon.tabs.openDevTools();
    });

    // ==================== CONSOLE VIEWER ====================
    const consoleBtn = document.getElementById('consoleBtn');
    const consoleModal = document.getElementById('consoleModal');
    const consoleClose = document.getElementById('consoleClose');
    const consoleBody = document.getElementById('consoleBody');
    const consoleEmpty = document.getElementById('consoleEmpty');
    const consoleClearBtn = document.getElementById('consoleClearBtn');
    const consoleCopyBtn = document.getElementById('consoleCopyBtn');
    const consoleBadge = document.getElementById('consoleBadge');

    let consoleEntries = [];
    let consoleUnread = 0;
    window.keledon.brain.getDebugMode().then((mode) => {
      consoleBtn.hidden = !mode?.enabled;
      if (consoleBtn.hidden) consoleModal.classList.remove('show');
    }).catch(() => {
      consoleBtn.hidden = true;
      consoleModal.classList.remove('show');
    });
    const MAX_CONSOLE_ENTRIES = 500;

    function addConsoleEntry(entry) {
      consoleEntries.push(entry);
      if (consoleEntries.length > MAX_CONSOLE_ENTRIES) {
        consoleEntries = consoleEntries.slice(-MAX_CONSOLE_ENTRIES);
      }
      // If modal is open, show immediately
      if (consoleModal.classList.contains('show')) {
        renderConsoleEntry(entry);
      } else {
        // Increment badge
        consoleUnread++;
        consoleBadge.textContent = consoleUnread;
        consoleBadge.classList.add('show');
      }
    }

    function renderConsoleEntry(entry) {
      consoleEmpty.style.display = 'none';
      const timeStr = new Date(entry.timestamp).toLocaleTimeString();
      const level = entry.level === 'warning' ? 'warning' : entry.level === 'error' ? 'error' : entry.level === 'info' ? 'info' : 'verbose';
      const msg = entry.message;
      const row = document.createElement('div');
      row.className = 'console-entry';
      row.innerHTML = `<span class="time">${timeStr}</span><span class="level-tag ${level}">${level.toUpperCase()}</span><span class="msg">${escapeHtml(msg)}</span>`;
      consoleBody.appendChild(row);
      consoleBody.scrollTop = consoleBody.scrollHeight;
    }

    function renderAllConsoleEntries() {
      consoleBody.innerHTML = '';
      if (consoleEntries.length === 0) {
        consoleEmpty.style.display = 'block';
        return;
      }
      consoleEmpty.style.display = 'none';
      consoleEntries.forEach(renderConsoleEntry);
      consoleBody.scrollTop = consoleBody.scrollHeight;
    }

    // Console modal open
    function consoleOpen() {
      consoleModal.classList.add('show');
      consoleUnread = 0;
      consoleBadge.classList.remove('show');
      syncKeledonChromeLayer('console-open');
      renderAllConsoleEntries();
      if (window.keledon.console) {
        window.keledon.console.onEntry(addConsoleEntry);
      }
    }

    function consoleCloseFn() {
      consoleModal.classList.remove('show');
      syncKeledonChromeLayer('console-closed');
    }

    consoleBtn.addEventListener('click', consoleOpen);
    consoleClose.addEventListener('click', consoleCloseFn);
    consoleModal.addEventListener('click', (e) => {
      if (e.target === consoleModal) consoleCloseFn();
    });

    consoleClearBtn.addEventListener('click', () => {
      consoleEntries = [];
      consoleBody.innerHTML = '';
      consoleEmpty.style.display = 'block';
      consoleUnread = 0;
      consoleBadge.classList.remove('show');
    });

    consoleCopyBtn.addEventListener('click', async () => {
      const body = consoleEntries.length
        ? consoleEntries.map(e => `[${new Date(e.timestamp).toLocaleTimeString()}] [${e.level.toUpperCase()}] ${e.message}`).join('\n')
        : '(no entries)';
      const payload = [
        '========================================',
        '  KELEDON Browser Console Logs',
        '========================================',
        `Copied: ${new Date().toISOString()}`,
        `Entries: ${consoleEntries.length}`,
        '',
        body,
      ].join('\n');
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(payload);
        } else {
          const fb = document.createElement('textarea');
          fb.value = payload;
          fb.readOnly = true;
          fb.style.position = 'fixed';
          fb.style.opacity = '0';
          document.body.appendChild(fb);
          fb.focus();
          fb.select();
          document.execCommand('copy');
          document.body.removeChild(fb);
        }
        consoleBtn.textContent = '\u{2713} Copied';
        setTimeout(() => {
          consoleBtn.textContent = '';
          consoleBtn.innerHTML = '\u{1F4DD}<span class="console-badge" id="consoleBadge">' + (consoleUnread || '') + '</span>';
          if (!consoleUnread) consoleBadge.classList.remove('show');
        }, 2000);
      } catch (e) {
        console.log('Console logs fallback:\n' + payload);
      }
    });

    // ==================== KEYBOARD SHORTCUTS ====================
    if (window.keledon.shortcuts) {
      window.keledon.shortcuts.onNewTab(() => tabAddBtn.click());
      window.keledon.shortcuts.onFocusUrlBar(() => {
        if (!navUrl.readOnly) {
          navUrl.focus();
          navUrl.select();
        }
      });
      window.keledon.shortcuts.onFindInPage(() => {
        log('Find in page (Ctrl+F)', 'info');
      });
    }

    // ==================== ESC KEY ====================
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isExecuting) {
        log('RPA stopped via Esc key', 'info');
        window.keledon.executor.abortGoal();
        if (rpaStopBtn) rpaStopBtn.classList.remove('visible');
      }
      // Close console modal with Escape
      if (e.key === 'Escape' && consoleModal.classList.contains('show')) {
        consoleCloseFn();
      }
    });

    // ==================== INIT ====================
    loadTabs();
    loadDeviceInfo();
    syncKeledonChromeLayer('init');
    log('KELEDON Browser initialized', 'success');
