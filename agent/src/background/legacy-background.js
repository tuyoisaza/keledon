// Background Service Worker for Agent 4 - Refactored based on Linguo Echo pattern
import { io } from '../ui/socket.io.esm.min.js';
import { ActionBlocks } from '../core/action-blocks.js';
import { FlowRegistry } from '../core/flows.js';

let isListening = false;
let isStarting = false;
let currentSessionId = null;
let currentTabTitle = null;
let socket = null;
let offscreenCreating = null;
let audioTabInfo = null;
let rpaTabInfo = null;
let lastActiveTab = null;
let currentAudioType = 'audio/l16;rate=16000';
let audioTabNeedsActivation = false;
let ttsChunks = [];
let ttsFormat = 'mp3';
let ttsInterruptible = true;
let ttsPlaying = false;
let debugEnabled = false;

// ... (existing code for pendingTabInfo, BACKEND_URL, logging) ...

// --- FLOW EXECUTOR ---
async function executeFlow(flowId, params = {}, stepsOverride = null, flowRunId = null) {
    await refreshTabAssignments('flow');
    const flow = stepsOverride ? { id: flowId, steps: stepsOverride } : FlowRegistry[flowId];
    const correlationId = crypto.randomUUID();

    if (!flow) {
        log(`Flow not found: ${flowId}`);
        if (socket) socket.emit('FLOW_RESULT', {
            correlation_id: correlationId,
            flow_run_id: flowRunId || undefined,
            status: 'FAILURE',
            error: { step_index: -1, action: 'init', message: `Flow ${flowId} not found` }
        });
        return;
    }

    log(`EXECUTING FLOW: ${flowId} (Steps: ${flow.steps.length})`);

    // Ensure we have a target tab
    if (!rpaTabInfo || !rpaTabInfo.tabId) {
        log('Error: No RPA tab assigned for execution');
        if (socket) socket.emit('FLOW_RESULT', {
            correlation_id: correlationId,
            status: 'FAILURE',
            error: { step_index: -1, action: 'init', message: 'No RPA tab assigned' }
        });
        return;
    }

    for (const [index, step] of flow.steps.entries()) {
        try {
            log(`Step ${index + 1}/${flow.steps.length}: ${step.action.toUpperCase()} ${step.selector || step.url || ''}`);

            const block = ActionBlocks[step.action];
            if (!block) throw new Error(`Unknown action: ${step.action}`);

            // Interpolate params in step properties
            const stepConfig = { ...step };
            if (stepConfig.value && typeof stepConfig.value === 'string') {
                stepConfig.value = stepConfig.value.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] || '');
            }

            // Execute Block
            await block(rpaTabInfo.tabId, stepConfig);

        } catch (err) {
            log(`Step FAILED: ${err.message}`);
            if (socket) socket.emit('FLOW_RESULT', {
                correlation_id: correlationId,
                flow_run_id: flowRunId || undefined,
                status: 'FAILURE',
                error: { step_index: index, action: step.action, message: err.message }
            });
            return; // Stop execution
        }
    }

    log(`Flow ${flowId} COMPLETED successfully.`);
    if (socket) socket.emit('FLOW_RESULT', {
        correlation_id: correlationId,
        flow_run_id: flowRunId || undefined,
        status: 'SUCCESS'
    });
}


// Store tab info when user clicks icon (activeTab permission granted at this moment)
let pendingTabInfo = null;
let isRecording = false;

// Load configuration
const config = require('../config/config.js');
const BACKEND_URL = config.BACKEND_URL;

let interfaceUrlPatterns = [];
const AUTO_AUDIO_HOSTS = ['meet.google.com'];

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildInterfacePattern(baseUrl) {
    if (!baseUrl) return null;
    try {
        const parsed = new URL(baseUrl);
        const hostPattern = escapeRegex(parsed.hostname);
        const pathPattern = parsed.pathname && parsed.pathname !== '/' ? escapeRegex(parsed.pathname) : '';
        const pattern = `https?://([\\w-]+\\.)?${hostPattern}${pathPattern ? pathPattern : ''}(/|$)`;
        return new RegExp(pattern, 'i');
    } catch (error) {
        log(`Invalid interface URL: ${baseUrl}`);
        return null;
    }
}

async function refreshInterfacePatterns() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/interfaces`);
        if (!response.ok) {
            log(`Failed to load interfaces: ${response.status}`);
            return;
        }

        const data = await response.json();
        const patterns = (data || [])
            .map((entry) => buildInterfacePattern(entry.baseUrl || entry.base_url))
            .filter(Boolean);

        interfaceUrlPatterns = patterns;
        log(`Loaded ${patterns.length} interface URL patterns`);
        refreshTabAssignments('interfaces-refresh');
    } catch (error) {
        log(`Failed to load interfaces: ${error.message}`);
    }
}

function matchesInterfaceUrl(url) {
    if (!url || interfaceUrlPatterns.length === 0) return false;
    return interfaceUrlPatterns.some((pattern) => pattern.test(url));
}

function isCapturableUrl(url) {
    if (!url) return false;
    return !(
        url.startsWith('chrome://') ||
        url.startsWith('edge://') ||
        url.startsWith('about:') ||
        url.startsWith('chrome-extension://')
    );
}

function matchesAutoAudioHost(url) {
    if (!url) return false;
    try {
        const host = new URL(url).hostname;
        return AUTO_AUDIO_HOSTS.includes(host);
    } catch (error) {
        return false;
    }
}

function buildTabLabel(prefix, tab) {
    const title = tab?.title || 'Untitled Tab';
    const shortId = tab?.id ? String(tab.id).slice(-4) : '0000';
    const stamp = new Date().toISOString().replace(/[:.]/g, '').slice(11, 17);
    return `${prefix}-${shortId}-${stamp}`;
}

function buildTabInfo(prefix, tab) {
    if (!tab) return null;
    return {
        tabId: tab.id,
        tabTitle: tab.title || 'Untitled Tab',
        tabUrl: tab.url || '',
        tabLabel: buildTabLabel(prefix, tab),
        assignedAt: Date.now()
    };
}

function sendTabAssignment() {
    chrome.runtime.sendMessage({
        type: 'TAB_ASSIGNMENT',
        audioTab: audioTabInfo,
        rpaTab: rpaTabInfo
    }).catch(() => { });
}

async function refreshTabAssignments(reason = 'auto') {
    if (!lastActiveTab) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && isCapturableUrl(activeTab.url)) {
            lastActiveTab = activeTab;
        }
    }
    const tabs = await chrome.tabs.query({});
    const capturableTabs = tabs.filter((tab) => isCapturableUrl(tab.url));
    const interfaceTab = capturableTabs.find((tab) => matchesInterfaceUrl(tab.url));
    const autoAudioTab = capturableTabs.find((tab) => matchesAutoAudioHost(tab.url));
    const interfaceMatch = interfaceTab || autoAudioTab;
    const audibleTab = capturableTabs.find((tab) => tab.audible);

    if (!audioTabInfo || !tabs.some(tab => tab.id === audioTabInfo.tabId)) {
        const nextAudio = interfaceMatch || audibleTab || lastActiveTab;
        audioTabInfo = buildTabInfo('audio', nextAudio);
        if (audioTabInfo) {
            log(`[TAB] Audio tab assigned (${reason}): ${audioTabInfo.tabLabel} - ${audioTabInfo.tabTitle}`);
        }
    }

    if (!rpaTabInfo || !tabs.some(tab => tab.id === rpaTabInfo.tabId)) {
        const audioFallback = audioTabInfo
            ? { id: audioTabInfo.tabId, title: audioTabInfo.tabTitle, url: audioTabInfo.tabUrl }
            : null;
        const nextRpa = interfaceMatch || lastActiveTab || audioFallback;
        rpaTabInfo = buildTabInfo('rpa', nextRpa);
        if (rpaTabInfo) {
            log(`[TAB] RPA tab assigned (${reason}): ${rpaTabInfo.tabLabel} - ${rpaTabInfo.tabTitle}`);
        }
    }

    sendTabAssignment();
}

const DEFAULT_PROVIDER_CONFIG = {
    sttProvider: 'whisper',
    ttsProvider: 'qwen3-tts',
    rpaProvider: 'native-dom',
    voiceProfile: {
        voice_id: '',
        language: 'en',
        speed: 1.0,
        voice_description: ''
    }
};

function sendClientConfig() {
    if (!socket) return;
    chrome.storage.local.get(['providerConfig', 'voiceProfile'], (result) => {
        const providerConfig = result.providerConfig || {};
        const voiceProfile = result.voiceProfile || {};
        const mergedVoiceProfile = { ...DEFAULT_PROVIDER_CONFIG.voiceProfile, ...voiceProfile };

        const payload = {
            ...DEFAULT_PROVIDER_CONFIG,
            ...providerConfig,
            voiceProfile: mergedVoiceProfile,
        };

        socket.emit('client-config', payload);
        log(`Sent client-config: STT=${payload.sttProvider}, TTS=${payload.ttsProvider}`);
    });
}

// --- LOGGING ---
function log(message) {
    const importantPattern = /(ERROR|FAILED|Session Created|Socket connected|Listening|Permission required|Session stopped|Start SUCCESS|Stop requested|Audio format detected)/i;
    if (!debugEnabled && !importantPattern.test(message)) {
        return;
    }
    console.log(message);
    chrome.runtime.sendMessage({ type: 'LOG', message }).catch(() => { });
}

log('Background Service Worker Loaded.');
refreshInterfacePatterns();
setInterval(refreshInterfacePatterns, 10 * 60 * 1000);
refreshTabAssignments('startup');

// Set side panel to NOT open automatically - we control it manually
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
    .catch((error) => console.error(error));

// When user clicks extension icon - this grants activeTab permission
chrome.action.onClicked.addListener((tab) => {
    // Don't capture system pages
    const url = tab.url || "";
    if (url.startsWith("chrome://") || url.startsWith("edge://") ||
        url.startsWith("about:") || url.startsWith("chrome-extension://")) {
        log(`Cannot capture system page: ${url}`);
        pendingTabInfo = null;
        // Still open panel to show error
        if (tab.windowId) {
            chrome.sidePanel.open({ windowId: tab.windowId });
        }
        return;
    }

    if (!tab.id || !tab.windowId) {
        log('No valid tab info');
        return;
    }

    audioTabNeedsActivation = false;
    chrome.runtime.sendMessage({ type: 'CAPTURE_PERMISSION_GRANTED' }).catch(() => { });

    // Keep track of last active tab and refresh assignments
    if (isCapturableUrl(url)) {
        lastActiveTab = tab;
    }
    refreshTabAssignments('action-click');

    // Open side panel
    chrome.sidePanel.open({ windowId: tab.windowId }).catch(err => {
        log('Error opening panel: ' + err.message);
    });

    // Send tab info to panel after a short delay
    setTimeout(() => {
        chrome.runtime.sendMessage({
            type: 'TAB_DETECTED',
            tabTitle: audioTabInfo?.tabTitle || tab.title || 'Unknown Tab',
            tabLabel: audioTabInfo?.tabLabel || null
        }).catch(() => { });
    }, 300);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!tab?.url || !tab.windowId) return;
    const isMatch = matchesInterfaceUrl(tab.url) || matchesAutoAudioHost(tab.url);
    if (!isMatch) return;
    if (changeInfo.status !== 'complete' && !changeInfo.url) return;

    if (isCapturableUrl(tab.url)) {
        lastActiveTab = tab;
    }
    refreshTabAssignments('auto-audio-match');
    log('Auto-open side panel skipped (requires user gesture).');
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    try {
        const tab = await chrome.tabs.get(tabId);
        if (isCapturableUrl(tab.url)) {
            lastActiveTab = tab;
            refreshTabAssignments('tab-activated');
        }
    } catch (error) {
        log(`Tab activation error: ${error.message}`);
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    if (audioTabInfo?.tabId === tabId) {
        audioTabInfo = null;
    }
    if (rpaTabInfo?.tabId === tabId) {
        rpaTabInfo = null;
    }
    refreshTabAssignments('tab-removed');
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (changes.providerConfig || changes.voiceProfile) {
        sendClientConfig();
    }
});

// --- CAPTURE STREAM HELPER (called directly, not via message) ---
async function captureStreamNow() {
    if (!audioTabInfo || !audioTabInfo.tabId) {
        log('No audio tab assigned. Waiting for auto-detection.');
        return null;
    }

    // If we already have an unused streamId, return it
    if (pendingTabInfo?.streamId && !pendingTabInfo?.used && pendingTabInfo?.tabId === audioTabInfo.tabId) {
        log('Reusing existing streamId');
        return pendingTabInfo;
    }

    // Capture streamId NOW
    return new Promise((resolve) => {
        chrome.tabCapture.getMediaStreamId({ targetTabId: audioTabInfo.tabId }, (streamId) => {
            if (chrome.runtime.lastError || !streamId) {
                const message = chrome.runtime.lastError?.message || 'No streamId';
                log('Error getting streamId: ' + message);
                if (message.includes('invoked') || message.includes('activeTab')) {
                    audioTabNeedsActivation = true;
                    chrome.runtime.sendMessage({
                        type: 'CAPTURE_PERMISSION_REQUIRED',
                        tabTitle: audioTabInfo?.tabTitle || 'Unknown Tab'
                    }).catch(() => { });
                }
                resolve(null);
                return;
            }

            pendingTabInfo = {
                streamId,
                tabId: audioTabInfo.tabId,
                tabTitle: audioTabInfo.tabTitle,
                tabUrl: audioTabInfo.tabUrl,
                timestamp: Date.now(),
                used: false
            };

            audioTabNeedsActivation = false;
            chrome.runtime.sendMessage({ type: 'CAPTURE_PERMISSION_GRANTED' }).catch(() => { });

            log(`StreamId captured for: ${pendingTabInfo.tabTitle}`);
            resolve(pendingTabInfo);
        });
    });
}

// --- MESSAGE HANDLER ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

    // Get pending tab info
    if (msg.type === 'GET_PENDING_TAB') {
        sendResponse(pendingTabInfo || audioTabInfo);
        return true;
    }

    // Capture stream on demand - THIS IS THE KEY!
    // This runs in the service worker context where activeTab was granted
    if (msg.type === 'CAPTURE_STREAM_NOW') {
        const targetTabId = audioTabInfo?.tabId || pendingTabInfo?.tabId;
        if (!targetTabId) {
            sendResponse({ error: 'No audio tab assigned yet.' });
            return true;
        }

        // If we already have an unused streamId, return it
        if (pendingTabInfo?.streamId && !pendingTabInfo?.used) {
            sendResponse({ streamData: pendingTabInfo });
            return true;
        }

        // Capture streamId NOW, in the service worker context
        chrome.tabCapture.getMediaStreamId({ targetTabId }, (streamId) => {
            if (chrome.runtime.lastError || !streamId) {
                const message = chrome.runtime.lastError?.message || 'No streamId';
                log('Error getting streamId: ' + message);
                if (message.includes('invoked') || message.includes('activeTab')) {
                    audioTabNeedsActivation = true;
                    chrome.runtime.sendMessage({
                        type: 'CAPTURE_PERMISSION_REQUIRED',
                        tabTitle: audioTabInfo?.tabTitle || 'Unknown Tab'
                    }).catch(() => { });
                }
                sendResponse({ error: 'Failed to capture tab audio: ' + message });
                return;
            }

            pendingTabInfo = {
                streamId,
                tabId: targetTabId,
                tabTitle: audioTabInfo?.tabTitle || 'Unknown Tab',
                tabUrl: audioTabInfo?.tabUrl || '',
                timestamp: Date.now(),
                used: false
            };

            audioTabNeedsActivation = false;
            chrome.runtime.sendMessage({ type: 'CAPTURE_PERMISSION_GRANTED' }).catch(() => { });

            log(`StreamId captured for: ${pendingTabInfo.tabTitle}`);
            sendResponse({ streamData: pendingTabInfo });
        });

        return true; // Async response
    }

    // Mark stream as used
    if (msg.type === 'MARK_STREAM_USED') {
        if (pendingTabInfo) {
            pendingTabInfo.used = true;
            log('StreamId marked as used');
        }
        sendResponse({ success: true });
        return true;
    }

    // Invalidate stream data
    if (msg.type === 'INVALIDATE_STREAM') {
        pendingTabInfo = null;
        log('Stream data invalidated');
        sendResponse({ success: true });
        return true;
    }

    // Recording state
    if (msg.type === 'SET_RECORDING_STATE') {
        isRecording = msg.isRecording;
        log('Recording state: ' + (isRecording ? 'STARTED' : 'STOPPED'));
        sendResponse({ success: true });
        return true;
    }

    if (msg.type === 'REFRESH_AUDIO_TAB') {
        if (!audioTabInfo?.tabId) {
            sendResponse({ success: false, error: 'No audio tab assigned' });
            return true;
        }
        chrome.tabs.get(audioTabInfo.tabId, (tab) => {
            if (chrome.runtime.lastError || !tab?.windowId) {
                sendResponse({ success: false, error: 'Audio tab not found' });
                return;
            }
            chrome.tabs.query({ windowId: tab.windowId }, (tabs) => {
                if (chrome.runtime.lastError || !tabs?.length) {
                    sendResponse({ success: false, error: 'No tabs in window' });
                    return;
                }
                const currentIndex = tabs.findIndex((item) => item.id === audioTabInfo.tabId);
                if (currentIndex === -1) {
                    sendResponse({ success: false, error: 'Audio tab index missing' });
                    return;
                }
                const nextTab = tabs[currentIndex + 1] || tabs[currentIndex - 1];
                if (!nextTab || !isCapturableUrl(nextTab.url)) {
                    sendResponse({ success: false, error: 'No adjacent capturable tab' });
                    return;
                }
                const previousTabTitle = audioTabInfo?.tabTitle || 'Unknown Tab';
                audioTabInfo = buildTabInfo('audio', nextTab);
                pendingTabInfo = null;
                sendTabAssignment();
                chrome.runtime.sendMessage({
                    type: 'TAB_DETECTED',
                    tabTitle: audioTabInfo.tabTitle,
                    tabLabel: audioTabInfo.tabLabel
                }).catch(() => { });
                log(`Audio tab reassigned: ${previousTabTitle} -> ${audioTabInfo.tabTitle}`);
                sendResponse({ success: true });
            });
        });
        return true;
    }

    // Focus action removed for clean UI

    // Legacy handlers for compatibility
    if (msg.type === 'START_LISTENING') {
        log('Received START_LISTENING command');
        startListeningSession(msg).then(res => sendResponse(res));
        return true;
    }
    if (msg.type === 'STOP_LISTENING') {
        log('Received STOP_LISTENING command');
        stopListeningSession().then(res => sendResponse(res));
        return true;
    }
    if (msg.type === 'GET_STATUS') {
        sendResponse({
            isListening,
            sessionId: currentSessionId,
            tabTitle: currentTabTitle,
            audioTab: audioTabInfo,
            rpaTab: rpaTabInfo,
            capturePermissionRequired: audioTabNeedsActivation,
            debugMode: debugEnabled
        });
    }

    // Audio Chunk from Offscreen (V1 CONTRACT COMPLIANCE)
    if (msg.type === 'AUDIO_CHUNK') {
        if (socket && socket.connected) {
            // Contract: V1 AUDIO_CHUNK
            socket.emit('AUDIO_CHUNK', {
                type: currentAudioType,
                payload: msg.chunk, // Base64 from offscreen.js
                source: 'tab',
                timestamp: Date.now()
            });
        }
    }

    if (msg.type === 'AUDIO_FORMAT') {
        if (msg.audioType) {
            currentAudioType = msg.audioType;
            log(`Audio format detected: ${currentAudioType}`);
        }
    }

    // Logs from Offscreen
    if (msg.type === 'LOG') {
        log('[Offscreen] ' + msg.message);
    }

    // Knowledge Search Results
    if (msg.type === 'KNOWLEDGE_SEARCH_RESULT') {
        log(`Knowledge search completed: "${msg.query}" - ${msg.results?.length || 0} results found`);
        
        // Send knowledge results to backend for learning/analysis
        if (socket && socket.connected) {
            socket.emit('KNOWLEDGE_SEARCH', {
                sessionId: msg.sessionId || currentSessionId,
                query: msg.query,
                results: msg.results,
                timestamp: Date.now()
            });
        }
    }
});

async function startListeningSession(options = {}) {
    if (isListening) return { success: false, error: 'Already listening' };
    if (isStarting) return { success: false, error: 'Start already in progress' };

    isStarting = true;
    debugEnabled = options?.debug === true;

    log('Starting session sequence...');
    const { language, debug } = options;

    try {
        // 1. Capture stream directly (not via message to self)
        log('Capturing stream...');
        const streamData = await captureStreamNow();

        if (!streamData) {
            throw new Error('No stream data available. Click the extension icon on a tab first.');
        }

        log(`Using audio tab: ${streamData.tabId} - "${streamData.tabTitle}"`);

        // Broadcast tab detected
        chrome.runtime.sendMessage({
            type: 'TAB_DETECTED',
            tabTitle: streamData.tabTitle,
            tabLabel: audioTabInfo?.tabLabel || null
        }).catch(() => { });

        // 2. Create Session on Backend
        log(`Creating session at ${BACKEND_URL}/listening-sessions...`);
        log(`Session payload: ${JSON.stringify({ source: 'agent4', tabUrl: streamData.tabUrl, tabTitle: streamData.tabTitle })}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        let response;
        try {
            response = await fetch(`${BACKEND_URL}/listening-sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: 'agent4',
                    tabUrl: streamData.tabUrl,
                    tabTitle: streamData.tabTitle
                }),
                signal: controller.signal
            });
        } catch (error) {
            clearTimeout(timeoutId);
            if (error?.name === 'AbortError') {
                throw new Error('Backend timeout after 10s');
            }
            throw error;
        }
        clearTimeout(timeoutId);

        log(`Session create response: ${response.status}`);

        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Backend Error (${response.status}): ${txt}`);
        }

        const sessionData = await response.json();
        const { sessionId } = sessionData;

        log(`Session Created! ID: ${sessionId}`);

        // 3. Connect WebSocket
        log('Connecting Socket.io...');

        socket = io(`${BACKEND_URL}/listen`, {
            path: '/listen/ws',
            query: { session: sessionId, language, debug },
            transports: ['websocket']
        });

        await new Promise((resolve, reject) => {
        socket.on('connect', () => {
            log('Socket connected successfully!');
            sendClientConfig();
            resolve();
        });
            socket.on('connect_error', (err) => {
                log('Socket connection error: ' + err.message);
                reject(err);
            });
            setTimeout(() => reject(new Error('Socket timeout')), 5000);
        });

        // --- V1 CONTRACT LISTENERS ---

        socket.on('EXECUTE_FLOW', (data) => {
            const flowId = data.flow_definition_id || data.flow_id || data.flow_version_id;
            log('RX: EXECUTE_FLOW ' + flowId);
            executeFlow(flowId, data.params, data.steps || null, data.flow_run_id || null);
        });

        socket.on('PLAY_AUDIO', (data) => {
            handlePlayAudio(data);
        });

        socket.on('audio-playback-end', () => {
            flushTtsPlayback();
        });

        socket.on('STOP_EXECUTION', (data) => {
            log(`RX: STOP_EXECUTION (${data?.reason || 'unknown'})`);
            stopTtsPlayback();
        });

        // Legacy/Existing listeners
        socket.on('asr.partial', (data) => {
            chrome.runtime.sendMessage({ type: 'TRANSCRIPT_PARTIAL', text: data.text }).catch(() => { });
        });
        socket.on('asr.final', (data) => {
            log('Final Transcript: ' + data.text);
            chrome.runtime.sendMessage({ type: 'TRANSCRIPT_FINAL', text: data.text }).catch(() => { });
        });
        socket.on('session.ended', (data) => {
            log('Socket received session.ended. Reason: ' + (data?.reason || 'unknown'));
            stopListeningSession();
        });

        // 4. Start Capture (Offscreen)
        log('Ensuring offscreen document...');
        await ensureOffscreenDocument();

        // Mark stream as used (direct assignment, not self-message)
        if (pendingTabInfo) pendingTabInfo.used = true;

        // Send streamId to offscreen
        log('Sending START_CAPTURE to Offscreen...');
        await chrome.runtime.sendMessage({
            target: 'OFFSCREEN',
            type: 'START_CAPTURE',
            streamId: streamData.streamId
        });

        isListening = true;
        currentSessionId = sessionId;
        currentTabTitle = streamData.tabTitle;

        // Update recording state
        chrome.runtime.sendMessage({ type: 'SET_RECORDING_STATE', isRecording: true }).catch(() => { });

        log('Session Initialization Complete. Listening...');

        return { success: true, sessionId, tabTitle: currentTabTitle };

    } catch (err) {
        log('FATAL ERROR in start sequence: ' + err.message);
        console.error('Start failed:', err);
        stopListeningSession();
        return { success: false, error: err.message };
    } finally {
        log('Start sequence finished.');
        isStarting = false;
    }
}

async function stopListeningSession() {
    if (!isListening) {
        log('Stop requested but not listening.');
        return { success: true };
    }

    log('Stopping session...');

    // Stop Offscreen
    log('Stopping Offscreen capture...');
    await chrome.runtime.sendMessage({ target: 'OFFSCREEN', type: 'STOP_CAPTURE' }).catch(() => { });

    // Disconnect Socket
    if (socket) {
        log('Disconnecting socket...');
        socket.emit('session.stop');
        socket.disconnect();
        socket = null;
    }

    // Close Offscreen doc
    log('Closing offscreen document...');
    await chrome.offscreen.closeDocument().catch(e => log('Error closing offscreen: ' + e.message));

    isListening = false;
    currentSessionId = null;
    currentTabTitle = null;
    debugEnabled = false;

    // Update recording state
    chrome.runtime.sendMessage({ type: 'SET_RECORDING_STATE', isRecording: false }).catch(() => { });

    log('Session stopped clean.');
    chrome.runtime.sendMessage({ type: 'SESSION_STOPPED' }).catch(() => { });

    return { success: true };
}

function normalizeAudioPayload(payload) {
    if (!payload) return null;
    if (typeof payload === 'string') {
        const binary = atob(payload);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    if (payload instanceof ArrayBuffer) {
        return new Uint8Array(payload);
    }
    if (payload instanceof Uint8Array) {
        return new Uint8Array(payload);
    }
    if (payload.buffer instanceof ArrayBuffer) {
        return new Uint8Array(payload.buffer, payload.byteOffset || 0, payload.byteLength || payload.length || undefined);
    }
    return null;
}

function getTtsMime(format) {
    if (format === 'wav') return 'audio/wav';
    return 'audio/mpeg';
}

function handlePlayAudio(data) {
    const bytes = normalizeAudioPayload(data?.payload);
    if (!bytes) {
        log('PLAY_AUDIO payload unsupported');
        return;
    }

    ttsFormat = data?.format || ttsFormat;
    ttsInterruptible = data?.interruptible !== false;
    if (ttsPlaying && ttsInterruptible) {
        stopTtsPlayback();
    }
    if (ttsFormat === 'mp3') {
        streamTtsChunk(bytes, ttsFormat);
    } else {
        ttsChunks.push(bytes);
    }
}

async function flushTtsPlayback() {
    if (!audioTabInfo?.tabId) {
        log('No audio tab assigned for TTS playback');
        ttsChunks = [];
        return;
    }

    if (ttsFormat === 'mp3') {
        await endTtsStream();
        ttsPlaying = false;
        return;
    }

    if (ttsChunks.length === 0) return;

    const totalLength = ttsChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of ttsChunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
    }

    ttsChunks = [];
    ttsPlaying = true;

    try {
        await chrome.scripting.executeScript({
            target: { tabId: audioTabInfo.tabId },
            world: 'MAIN',
            func: (audioBuffer) => {
                const payload = audioBuffer instanceof ArrayBuffer ? audioBuffer : audioBuffer.buffer;
                if (!window.__keledonTts) {
                    window.__keledonTts = { ctx: null, source: null };
                }
                const state = window.__keledonTts;
                if (!state.ctx) {
                    state.ctx = new (window.AudioContext || window.webkitAudioContext)();
                }
                if (state.source) {
                    try { state.source.stop(); } catch (e) { }
                    state.source = null;
                }

                state.ctx.resume().catch(() => { });
                const dataCopy = payload.slice(0);
                state.ctx.decodeAudioData(dataCopy).then((buffer) => {
                    const source = state.ctx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(state.ctx.destination);
                    source.start();
                    state.source = source;
                });
            },
            args: [merged.buffer]
        });
        log(`TTS playback started on ${audioTabInfo.tabLabel}`);
    } catch (error) {
        log(`TTS playback failed: ${error.message}`);
    } finally {
        ttsPlaying = false;
    }
}

async function streamTtsChunk(bytes, format) {
    if (!audioTabInfo?.tabId) {
        log('No audio tab assigned for TTS playback');
        return;
    }

    const payload = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const mime = getTtsMime(format);
    ttsPlaying = true;

    try {
        await chrome.scripting.executeScript({
            target: { tabId: audioTabInfo.tabId },
            world: 'MAIN',
            func: (audioBuffer, mimeType) => {
                const payload = audioBuffer instanceof ArrayBuffer ? audioBuffer.slice(0) : audioBuffer.buffer.slice(0);
                if (!window.__keledonTtsStream) {
                    const audio = document.createElement('audio');
                    audio.autoplay = true;
                    audio.style.display = 'none';
                    const mediaSource = new MediaSource();
                    const stream = {
                        mediaSource,
                        sourceBuffer: null,
                        queue: [],
                        audio
                    };
                    audio.src = URL.createObjectURL(mediaSource);
                    document.documentElement.appendChild(audio);
                    mediaSource.addEventListener('sourceopen', () => {
                        if (stream.sourceBuffer) return;
                        try {
                            stream.sourceBuffer = mediaSource.addSourceBuffer(mimeType);
                            stream.sourceBuffer.addEventListener('updateend', () => {
                                if (stream.queue.length > 0 && !stream.sourceBuffer.updating) {
                                    stream.sourceBuffer.appendBuffer(stream.queue.shift());
                                }
                            });
                            if (stream.queue.length > 0 && !stream.sourceBuffer.updating) {
                                stream.sourceBuffer.appendBuffer(stream.queue.shift());
                            }
                        } catch (e) {
                        }
                    });
                    window.__keledonTtsStream = stream;
                }

                const stream = window.__keledonTtsStream;
                if (!stream?.sourceBuffer) {
                    stream?.queue?.push(payload);
                    return;
                }
                if (!stream.sourceBuffer.updating && stream.queue.length === 0) {
                    try {
                        stream.sourceBuffer.appendBuffer(payload);
                    } catch (e) {
                        stream.queue.push(payload);
                    }
                } else {
                    stream.queue.push(payload);
                }
            },
            args: [payload, mime]
        });
    } catch (error) {
        log(`TTS stream failed: ${error.message}`);
    }
}

async function endTtsStream() {
    if (!audioTabInfo?.tabId) return;
    try {
        await chrome.scripting.executeScript({
            target: { tabId: audioTabInfo.tabId },
            world: 'MAIN',
            func: () => {
                const stream = window.__keledonTtsStream;
                if (!stream?.mediaSource) return;
                if (stream.mediaSource.readyState === 'open') {
                    try { stream.mediaSource.endOfStream(); } catch (e) { }
                }
            }
        });
        log(`TTS stream ended on ${audioTabInfo.tabLabel}`);
        ttsPlaying = false;
    } catch (error) {
        log(`TTS stream end failed: ${error.message}`);
    }
}

async function stopTtsPlayback() {
    if (!audioTabInfo?.tabId) return;
    if (!ttsInterruptible) return;
    ttsChunks = [];
    try {
        await chrome.scripting.executeScript({
            target: { tabId: audioTabInfo.tabId },
            world: 'MAIN',
            func: () => {
                const state = window.__keledonTts;
                if (state?.source) {
                    try { state.source.stop(); } catch (e) { }
                    state.source = null;
                }
                const stream = window.__keledonTtsStream;
                if (stream?.audio) {
                    stream.audio.pause();
                    stream.audio.remove();
                }
                if (stream?.mediaSource && stream.mediaSource.readyState === 'open') {
                    try { stream.mediaSource.endOfStream(); } catch (e) { }
                }
                window.__keledonTtsStream = null;
            }
        });
        log(`TTS playback interrupted on ${audioTabInfo.tabLabel}`);
        ttsPlaying = false;
    } catch (error) {
        log(`TTS stop failed: ${error.message}`);
    }
}

// --- Offscreen Helper ---

async function ensureOffscreenDocument() {
    if (await hasOffscreenDocument()) {
        log('Offscreen already exists.');
        return;
    }

    log('Creating new offscreen document...');
    if (offscreenCreating) {
        await offscreenCreating;
    } else {
        offscreenCreating = chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['USER_MEDIA'],
            justification: 'Capture tab audio for listening session'
        });
        await offscreenCreating;
        offscreenCreating = null;
    }
    log('Offscreen created.');
}

async function hasOffscreenDocument() {
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    return clients.some(c => c.url.endsWith('offscreen.html'));
}
