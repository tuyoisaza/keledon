// Simple sidepanel functionality
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnCopyLogs = document.getElementById('btn-copy-logs');
const btnRefreshTab = document.getElementById('btn-refresh-tab');
const statusDiv = document.getElementById('status');
const transcriptDiv = document.getElementById('transcript');
const logsArea = document.querySelector('#logs');
const audioTabSpan = document.getElementById('audio-tab');
const rpaTabSpan = document.getElementById('rpa-tab');
const tabTitleSpan = document.getElementById('tab-title');
const sessionIdSpan = document.getElementById('session-id');
const permissionHint = document.getElementById('permission-hint');

let isListening = false;
let currentSessionId = null;
let currentTabTitle = null;

// Version display
const manifest = chrome.runtime.getManifest();
document.getElementById('version').textContent = 'v' + manifest.version;

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

// Button handlers
if (btnStart) {
    btnStart.onclick = async () => {
        log('Start listening requested');
        try {
            const response = await sendMessage({ type: 'START_LISTENING' });
            if (response.success) {
                setListening(true, response.sessionId, response.tabTitle);
                log('Start listening successful');
            } else {
                log('Start listening failed: ' + response.error);
            }
        } catch (error) {
            log('Start listening error: ' + error.message);
        }
    };
}

if (btnStop) {
    btnStop.onclick = async () => {
        log('Stop listening requested');
        try {
            const response = await sendMessage({ type: 'STOP_LISTENING' });
            if (response.success) {
                setListening(false, null, null);
                log('Stop listening successful');
            } else {
                log('Stop listening failed: ' + response.error);
            }
        } catch (error) {
            log('Stop listening error: ' + error.message);
        }
    };
}

if (btnCopyLogs) {
    btnCopyLogs.onclick = () => {
        logsArea.select();
        document.execCommand('copy');
        const oldText = btnCopyLogs.textContent;
        btnCopyLogs.textContent = 'Copied!';
        setTimeout(() => btnCopyLogs.textContent = oldText, 1000);
    };
}

if (btnRefreshTab) {
    btnRefreshTab.onclick = () => {
        chrome.runtime.sendMessage({ type: 'REFRESH_AUDIO_TAB' });
    };
}

// Message sending utility
async function sendMessage(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response) => {
            resolve(response);
        });
    });
}

// Status update function
function setListening(listening, sessionId, tabTitle) {
    isListening = listening;
    currentSessionId = sessionId;
    currentTabTitle = tabTitle;
    
    const tabTitleSpan = document.getElementById('tab-title');
    const sessionIdSpan = document.getElementById('session-id');
    
    if (listening && sessionId) {
        btnStart.disabled = true;
        btnStop.disabled = false;
        statusDiv.textContent = 'Listening';
        statusDiv.className = 'status-pill listening';
        if (tabTitleSpan) tabTitleSpan.textContent = tabTitle;
        if (sessionIdSpan) sessionIdSpan.textContent = sessionId;
    } else {
        btnStart.disabled = false;
        btnStop.disabled = true;
        statusDiv.textContent = 'Ready';
        statusDiv.className = 'status-pill';
        if (tabTitleSpan) tabTitleSpan.textContent = '-';
        if (sessionIdSpan) sessionIdSpan.textContent = 'None';
    }
}

// Listen for status updates from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log('Received message: ' + JSON.stringify(message));
    
    if (message.type === 'STATUS_UPDATE') {
        setListening(message.listening, message.sessionId, message.tabTitle);
    }
    
    sendResponse({ success: true });
});

// Check current status on load
chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    setListening(response.listening, response.sessionId, response.tabTitle);
});

log('Sidepanel initialized');