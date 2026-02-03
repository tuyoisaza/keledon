const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnCopyLogs = document.getElementById('btn-copy-logs');
const btnRefreshTab = document.getElementById('btn-refresh-tab');
const statusDiv = document.getElementById('status');
const transcriptDiv = document.getElementById('transcript');
const logsArea = document.querySelector('#logs');
const audioTabSpan = document.getElementById('audio-tab');
const rpaTabSpan = document.getElementById('rpa-tab');
const permissionHint = document.getElementById('permission-hint');

let isListening = false;
let debugMode = false;

// Logger function
function log(msg) {
    const importantPattern = /(FAILED|Error|Permission required|Start SUCCESS|Session ID|FINAL:|Partial)/i;
    if (!debugMode && !importantPattern.test(msg)) {
        return;
    }
    const time = new Date().toISOString().split('T')[1].slice(0, -1);
    const line = `[${time}] ${msg}`;
    logsArea.value += line + '\n';
    logsArea.scrollTop = logsArea.scrollHeight;
}

// Initial status check
log('Popup opened. Checking status...');
const manifest = chrome.runtime.getManifest();
document.getElementById('version').textContent = 'v' + manifest.version;
log(`Agent Version: ${manifest.version}`);
log(`User Agent: ${navigator.userAgent}`);
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
    if (chrome.runtime.lastError) {
        log('Error checking status: ' + chrome.runtime.lastError.message);
        return;
    }
    log('Status received: ' + JSON.stringify(res));
    if (res && res.isListening) {
        setListening(true, res.sessionId, res.tabTitle);
    } else {
        setListening(false);
    }
    updateTabAssignments(res?.audioTab, res?.rpaTab);
    debugMode = Boolean(res?.debugMode);
    if (permissionHint) {
        permissionHint.style.display = res?.capturePermissionRequired ? 'block' : 'none';
    }
});

btnStart.onclick = () => {
    log('USER ACTION: Clicked Start Listening');
    statusDiv.textContent = 'Requesting start...';
    statusDiv.className = '';

    chrome.runtime.sendMessage({ type: 'START_LISTENING' }, (res) => {
        if (chrome.runtime.lastError) {
            log('Runtime Error: ' + chrome.runtime.lastError.message);
            statusDiv.textContent = 'Error';
            statusDiv.className = 'status-pill error';
            return;
        }

        if (res.success) {
            log(`Start SUCCESS. Session ID: ${res.sessionId}`);
            log(`Tab Title Received: "${res.tabTitle}"`);
            setListening(true, res.sessionId, res.tabTitle);
        } else {
            log('Start FAILED: ' + res.error);
            statusDiv.textContent = 'Error';
            statusDiv.className = 'status-pill error';
        }
    });
};

btnStop.onclick = () => {
    log('USER ACTION: Clicked Stop');
    chrome.runtime.sendMessage({ type: 'STOP_LISTENING' }, (res) => {
        log('Stop requested. Result: ' + JSON.stringify(res));
        setListening(false);
    });
};

const btnPopout = document.getElementById('btn-popout');
if (btnPopout) {
    btnPopout.onclick = () => {
        chrome.windows.create({
            url: 'popup.html',
            type: 'popup',
            width: 420,
            height: 600
        });
    };
}

btnCopyLogs.onclick = () => {
    const logText = logsArea.value || '';
    const oldText = btnCopyLogs.textContent;
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(logText)
            .then(() => {
                btnCopyLogs.textContent = `Copied (${logText.length})`;
            })
            .catch(() => {
                logsArea.select();
                document.execCommand('copy');
                btnCopyLogs.textContent = `Copied (${logText.length})`;
            })
            .finally(() => {
                setTimeout(() => btnCopyLogs.textContent = oldText, 1200);
            });
    } else {
        logsArea.select();
        document.execCommand('copy');
        btnCopyLogs.textContent = `Copied (${logText.length})`;
        setTimeout(() => btnCopyLogs.textContent = oldText, 1200);
    }
};

if (btnRefreshTab) {
    btnRefreshTab.onclick = () => {
        chrome.runtime.sendMessage({ type: 'REFRESH_AUDIO_TAB' });
    };
}


function setListening(listening, sessionId, tabTitle) {
    isListening = listening;
    const tabTitleSpan = document.getElementById('tab-title');
    if (listening) {
        btnStart.disabled = true;
        btnStop.disabled = false;
        statusDiv.textContent = 'Listening';
        statusDiv.className = 'status-pill listening';
        if (tabTitle) tabTitleSpan.textContent = tabTitle;
    } else {
        btnStart.disabled = false;
        btnStop.disabled = true;
        statusDiv.textContent = 'Ready';
        statusDiv.className = 'status-pill';
        tabTitleSpan.textContent = '-';
    }
}

function updateTabAssignments(audioTab, rpaTab) {
    if (audioTabSpan) {
        audioTabSpan.textContent = audioTab?.tabLabel ? `${audioTab.tabLabel} · ${audioTab.tabTitle}` : '-';
    }
    if (rpaTabSpan) {
        rpaTabSpan.textContent = rpaTab?.tabLabel ? `${rpaTab.tabLabel} · ${rpaTab.tabTitle}` : '-';
    }
}

// Message Listener
chrome.runtime.onMessage.addListener((msg) => {
    // Log everything coming from background
    if (msg.type === 'LOG') {
        log('[BG] ' + msg.message);
    }

    if (msg.type === 'TRANSCRIPT_PARTIAL') {
        // Update UI but don't spam log area with partials unless needed
        // log('Partial: ' + msg.text);
        let last = transcriptDiv.lastElementChild;
        if (last && last.classList.contains('partial')) {
            last.textContent = msg.text;
        } else {
            const div = document.createElement('div');
            div.className = 'partial';
            div.textContent = msg.text;
            transcriptDiv.appendChild(div);
        }
        transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
    }

    if (msg.type === 'TRANSCRIPT_FINAL') {
        log('FINAL: ' + msg.text);
        let last = transcriptDiv.lastElementChild;
        if (last && last.classList.contains('partial')) {
            last.textContent = msg.text;
            last.className = 'final';
        } else {
            const div = document.createElement('div');
            div.className = 'final';
            div.textContent = msg.text;
            transcriptDiv.appendChild(div);
        }
        transcriptDiv.scrollTop = transcriptDiv.scrollHeight;
    }

    if (msg.type === 'SESSION_STOPPED') {
        log('Event: Session Stopped');
        setListening(false);
    }

    if (msg.type === 'CAPTURE_PERMISSION_REQUIRED') {
        log(`Permission required: click extension icon on "${msg.tabTitle || 'tab'}"`);
        if (permissionHint) {
            permissionHint.style.display = 'block';
        }
    }

    if (msg.type === 'CAPTURE_PERMISSION_GRANTED') {
        if (permissionHint) {
            permissionHint.style.display = 'none';
        }
    }

    if (msg.type === 'TAB_ASSIGNMENT') {
        updateTabAssignments(msg.audioTab, msg.rpaTab);
    }
});
