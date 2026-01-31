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

// Load configuration
const CONFIG = window.AGENT_CONFIG || window.KELEDON_CONFIG || {
    BACKEND_URL: 'http://localhost:3001',
    RAG_RETRIEVE_ENDPOINT: '/rag/retrieve',
    RAG_EVALUATE_ENDPOINT: '/rag/evaluate'
};

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

    const language = document.getElementById('language').value;
    const debug = document.getElementById('debug-mode').checked;

    chrome.runtime.sendMessage({ type: 'START_LISTENING', language, debug }, (res) => {
        if (chrome.runtime.lastError) {
            log('Runtime Error: ' + chrome.runtime.lastError.message);
            statusDiv.textContent = 'Error';
            statusDiv.className = 'status-pill error';
            return;
        }

        if (res.success) {
            log(`Start SUCCESS. Session ID: ${res.sessionId}`);
            log(`Tab Title Received: "${res.tabTitle}"`);
            log(`Language: ${language}, Debug: ${debug}`);
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
    logsArea.select();
    document.execCommand('copy');
    const oldText = btnCopyLogs.textContent;
    btnCopyLogs.textContent = 'Copied!';
    setTimeout(() => btnCopyLogs.textContent = oldText, 1000);
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

    if (msg.type === 'TAB_DETECTED') {
        // Update tab title immediately when detected (before full success/failure)
        const tabTitleSpan = document.getElementById('tab-title');
        if (msg.tabTitle) {
            tabTitleSpan.textContent = msg.tabTitle;
        }
    }

    if (msg.type === 'TAB_ASSIGNMENT') {
        updateTabAssignments(msg.audioTab, msg.rpaTab);
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
});

// Knowledge Search Functionality
const btnSearchKnowledge = document.getElementById('btn-search-knowledge');
const knowledgeQuery = document.getElementById('knowledge-query');
const knowledgeResults = document.getElementById('knowledge-results');
const knowledgeFeedback = document.getElementById('knowledge-feedback');
const btnFeedbackHelpful = document.getElementById('btn-feedback-helpful');
const btnFeedbackNotHelpful = document.getElementById('btn-feedback-not-helpful');
const feedbackDetails = document.getElementById('feedback-details');
const btnSubmitFeedback = document.getElementById('btn-submit-feedback');

let lastKnowledgeQuery = '';
let lastKnowledgeResults = [];
let feedbackGiven = false;

if (btnSearchKnowledge && knowledgeQuery && knowledgeResults) {
    btnSearchKnowledge.onclick = async () => {
        const query = knowledgeQuery.value.trim();
        if (!query) {
            knowledgeResults.innerHTML = '<div style="color: var(--muted); font-size: 11px; text-align: center; padding: 20px;">Please enter a search query</div>';
            return;
        }

        // Show loading state
        knowledgeResults.innerHTML = '<div style="color: var(--accent); font-size: 11px; text-align: center; padding: 20px;">🔍 Searching knowledge base...</div>';

        try {
            const response = await fetch(`${CONFIG.BACKEND_URL}${CONFIG.RAG_RETRIEVE_ENDPOINT}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query,
                    sessionId: currentSessionId || 'sidepanel-session',
                    companyId: 'default-company'
                })
            });

            const result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
                lastKnowledgeQuery = query;
                lastKnowledgeResults = result.data;
                feedbackGiven = false;
                
                knowledgeResults.innerHTML = result.data.map((doc) => `
                    <div style="background: var(--panel-soft); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 8px;">
                        <div style="font-size: 11px; line-height: 1.4; margin-bottom: 8px; color: var(--text);">
                            ${doc.content}
                        </div>
                        <div style="font-size: 10px; color: var(--muted); display: flex; justify-content: space-between;">
                            <span>Source: ${doc.source}</span>
                            <span style="color: var(--success); font-weight: 600;">${Math.round(doc.relevance * 100)}% relevant</span>
                        </div>
                    </div>
                `).join('');

                // Send results to background for logging/learning
                chrome.runtime.sendMessage({
                    type: 'KNOWLEDGE_SEARCH_RESULT',
                    query: query,
                    results: result.data,
                    sessionId: currentSessionId
                });

                // Show feedback section
                if (result.data.length > 0) {
                    knowledgeFeedback.style.display = 'block';
                }
            } else {
                knowledgeResults.innerHTML = '<div style="color: var(--muted); font-size: 11px; text-align: center; padding: 20px;">No relevant knowledge found</div>';
                knowledgeFeedback.style.display = 'none';
            }
        } catch (error) {
            console.error('Knowledge search error:', error);
            knowledgeResults.innerHTML = '<div style="color: var(--danger); font-size: 11px; text-align: center; padding: 20px;">❌ Failed to search knowledge base</div>';
            knowledgeFeedback.style.display = 'none';
            log(`Knowledge search failed: ${error.message}`);
        }
    };

    // Feedback handlers
    btnFeedbackHelpful.onclick = () => {
        if (!lastKnowledgeQuery || feedbackGiven) return;
        
        feedbackDetails.style.display = 'block';
        btnSubmitFeedback.style.display = 'block';
        btnFeedbackHelpful.style.background = 'var(--accent-strong)';
        btnFeedbackHelpful.disabled = true;
        btnFeedbackNotHelpful.disabled = true;
    };

    btnFeedbackNotHelpful.onclick = () => {
        if (!lastKnowledgeQuery || feedbackGiven) return;
        
        feedbackDetails.style.display = 'block';
        btnSubmitFeedback.style.display = 'block';
        btnFeedbackNotHelpful.style.background = '#d32f2f';
        btnFeedbackNotHelpful.disabled = true;
        btnFeedbackHelpful.disabled = true;
    };

    btnSubmitFeedback.onclick = async () => {
        if (!lastKnowledgeQuery || feedbackGiven) return;
        
        const feedbackType = btnFeedbackHelpful.disabled ? 'helpful' : 'not-helpful';
        const feedbackText = feedbackDetails.value.trim();
        
        try {
            await fetch(`${CONFIG.BACKEND_URL}${CONFIG.RAG_EVALUATE_ENDPOINT}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: currentSessionId || 'sidepanel-session',
                    originalQuery: lastKnowledgeQuery,
                    response: `User feedback: ${feedbackType}${feedbackText ? ' - ' + feedbackText : ''}`,
                    usedContext: lastKnowledgeResults.map(doc => doc.id)
                })
            });

            // Show success and hide feedback section
            knowledgeFeedback.style.display = 'none';
            feedbackDetails.value = '';
            
            // Reset buttons
            btnFeedbackHelpful.style.background = 'var(--success)';
            btnFeedbackHelpful.disabled = false;
            btnFeedbackNotHelpful.style.background = 'var(--danger)';
            btnFeedbackNotHelpful.disabled = false;
            
            feedbackGiven = true;
            log(`Knowledge feedback submitted: ${feedbackType}`);
        } catch (error) {
            console.error('Feedback submission error:', error);
            log(`Feedback submission failed: ${error.message}`);
        }
    };

    // Allow Enter key to trigger search
    knowledgeQuery.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnSearchKnowledge.click();
        }
    });
}
