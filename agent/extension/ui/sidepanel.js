/**
 * KELEDON Enhanced Side Panel
 * Integrates RPA, TTS/STT, Tab Management, and AI Assistant
 */

// Core State Management
class SidePanelState {
    constructor() {
        this.currentTab = 'chat';
        this.isListening = false;
        this.isRecording = false;
        this.sessionId = null;
        this.activeTabId = null;
        this.connectionStatus = 'disconnected';
        this.settings = this.loadSettings();
        this.commandHistory = [];
        this.conversation = [];
        this.availableTabs = [];
    }

    loadSettings() {
        const defaults = {
            language: 'en',
            voiceEnabled: false,
            autoListen: true,
            smartSuggestions: true,
            contextAware: false,
            saveHistory: true,
            analytics: false,
            backendUrl: (window.AGENT_CONFIG?.BACKEND_URL || window.KELEDON_CONFIG?.BACKEND_URL || 'http://localhost:3001')
        };
        
        try {
            const saved = localStorage.getItem('keledon_settings');
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch (error) {
            console.error('Failed to load settings:', error);
            return defaults;
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('keledon_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    addToHistory(command, response) {
        if (!this.settings.saveHistory) return;
        
        const historyItem = {
            id: Date.now().toString(),
            command,
            response,
            timestamp: new Date().toISOString(),
            tabId: this.activeTabId
        };
        
        this.commandHistory.unshift(historyItem);
        
        // Keep only last 100 items
        if (this.commandHistory.length > 100) {
            this.commandHistory = this.commandHistory.slice(0, 100);
        }
        
        this.saveHistory();
    }

    saveHistory() {
        try {
            localStorage.setItem('keledon_history', JSON.stringify(this.commandHistory));
        } catch (error) {
            console.error('Failed to save history:', error);
        }
    }

    loadHistory() {
        try {
            const saved = localStorage.getItem('keledon_history');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Failed to load history:', error);
            return [];
        }
    }
}

// Audio Integration (STT/TTS)
class AudioManager {
    constructor(state) {
        this.state = state;
        this.sttAdapter = null;
        this.ttsAdapter = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.initializeAdapters();
    }

    async initializeAdapters() {
        try {
            // Initialize STT (Speech-to-Text)
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                this.sttAdapter = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
                this.sttAdapter.continuous = false;
                this.sttAdapter.interimResults = false;
                this.sttAdapter.lang = this.getLanguageCode();
                this.setupSTTEvents();
            }

            // Initialize TTS (Text-to-Speech)
            if ('speechSynthesis' in window) {
                this.ttsAdapter = window.speechSynthesis;
            }

            console.log('Audio adapters initialized');
        } catch (error) {
            console.error('Failed to initialize audio adapters:', error);
        }
    }

    getLanguageCode() {
        const langMap = {
            'en': 'en-US',
            'es': 'es-ES',
            'fr': 'fr-FR',
            'de': 'de-DE',
            'zh': 'zh-CN'
        };
        return langMap[this.state.settings.language] || 'en-US';
    }

    setupSTTEvents() {
        if (!this.sttAdapter) return;

        this.sttAdapter.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const confidence = event.results[0][0].confidence;
            
            if (event.results[0].isFinal) {
                this.onSTTResult(transcript, confidence);
            }
        };

        this.sttAdapter.onerror = (event) => {
            console.error('STT error:', event.error);
            this.stopListening();
            uiManager.showError('Speech recognition failed: ' + event.error);
        };

        this.sttAdapter.onend = () => {
            this.state.isListening = false;
            uiManager.updateVoiceButton(false);
        };
    }

    async startListening() {
        if (!this.sttAdapter) {
            uiManager.showError('Speech recognition not supported');
            return;
        }

        try {
            this.state.isListening = true;
            this.sttAdapter.lang = this.getLanguageCode();
            this.sttAdapter.start();
            uiManager.updateVoiceButton(true);
            uiManager.showSuccess('Listening... Speak now');
        } catch (error) {
            console.error('Failed to start listening:', error);
            this.state.isListening = false;
            uiManager.showError('Failed to start speech recognition');
        }
    }

    stopListening() {
        if (this.sttAdapter && this.state.isListening) {
            this.sttAdapter.stop();
        }
    }

    async onSTTResult(transcript, confidence) {
        console.log(`STT Result: "${transcript}" (confidence: ${confidence})`);
        
        // Set transcript in input field
        const input = document.getElementById('commandInput');
        if (input) {
            input.value = transcript;
        }

        // Auto-send if confidence is high
        if (confidence > 0.8) {
            await commandManager.executeCommand(transcript);
        }
    }

    async speak(text) {
        if (!this.ttsAdapter) return;

        try {
            // Cancel any ongoing speech
            this.ttsAdapter.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = this.getLanguageCode();
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;

            return new Promise((resolve, reject) => {
                utterance.onend = resolve;
                utterance.onerror = reject;
                this.ttsAdapter.speak(utterance);
            });
        } catch (error) {
            console.error('TTS failed:', error);
        }
    }
}

// RPA Integration
class RPAManager {
    constructor(state) {
        this.state = state;
        this.activeWorkflow = null;
        this.stepResults = [];
    }

    async executeStep(step) {
        try {
            // Send step to background script for execution
            const response = await chrome.runtime.sendMessage({
                type: 'EXECUTE_RPA_STEP',
                step: step,
                tabId: this.state.activeTabId,
                sessionId: this.state.sessionId
            });

            if (response.success) {
                this.stepResults.push(response.result);
                return response.result;
            } else {
                throw new Error(response.error || 'RPA step failed');
            }
        } catch (error) {
            console.error('RPA step execution failed:', error);
            throw error;
        }
    }

    async executeWorkflow(workflow) {
        try {
            this.activeWorkflow = workflow;
            this.stepResults = [];

            for (const step of workflow.steps) {
                const result = await this.executeStep(step);
                
                // Update UI with progress
                uiManager.addMessage(`Executing: ${step.description}`, 'assistant');
                
                // Handle step failure
                if (result.status === 'failure') {
                    throw new Error(`Step failed: ${result.evidence}`);
                }
            }

            return {
                success: true,
                results: this.stepResults,
                workflowId: workflow.id
            };
        } catch (error) {
            console.error('Workflow execution failed:', error);
            throw error;
        } finally {
            this.activeWorkflow = null;
        }
    }

    async clickElement(selector) {
        const step = {
            step_id: `click_${Date.now()}`,
            action: 'click',
            selector: selector,
            timeout_ms: 5000
        };
        return await this.executeStep(step);
    }

    async fillField(selector, value) {
        const step = {
            step_id: `fill_${Date.now()}`,
            action: 'fill_field',
            selector: selector,
            value: value,
            timeout_ms: 5000
        };
        return await this.executeStep(step);
    }

    async navigate(url) {
        const step = {
            step_id: `navigate_${Date.now()}`,
            action: 'navigate',
            value: url,
            timeout_ms: 10000
        };
        return await this.executeStep(step);
    }

    async extractText(selector) {
        const step = {
            step_id: `extract_${Date.now()}`,
            action: 'extract_text',
            selector: selector,
            timeout_ms: 5000
        };
        return await this.executeStep(step);
    }
}

// Tab Management Integration
class TabManager {
    constructor(state) {
        this.state = state;
        this.tabRegistry = new Map();
    }

    async discoverTabs() {
        try {
            const tabs = await chrome.tabs.query({});
            this.tabRegistry.clear();
            
            tabs.forEach(tab => {
                if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
                    this.tabRegistry.set(tab.id.toString(), {
                        id: tab.id.toString(),
                        title: tab.title || 'Untitled',
                        url: tab.url,
                        favicon: tab.favIconUrl || this.getDefaultFavicon(tab.url),
                        active: tab.active,
                        windowId: tab.windowId
                    });
                }
            });

            // Get current active tab
            const activeTab = tabs.find(tab => tab.active);
            if (activeTab) {
                this.state.activeTabId = activeTab.id.toString();
            }

            return Array.from(this.tabRegistry.values());
        } catch (error) {
            console.error('Failed to discover tabs:', error);
            return [];
        }
    }

    getDefaultFavicon(url) {
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
        } catch (error) {
            return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect fill="%23667" width="16" height="16"/></svg>';
        }
    }

    async switchToTab(tabId) {
        try {
            await chrome.tabs.update(parseInt(tabId), { active: true });
            this.state.activeTabId = tabId;
            return true;
        } catch (error) {
            console.error('Failed to switch tab:', error);
            return false;
        }
    }

    getActiveTab() {
        return this.tabRegistry.get(this.state.activeTabId);
    }

    getAllTabs() {
        return Array.from(this.tabRegistry.values());
    }
}

// Command Processing
class CommandManager {
    constructor(state, audioManager, rpaManager, tabManager) {
        this.state = state;
        this.audioManager = audioManager;
        this.rpaManager = rpaManager;
        this.tabManager = tabManager;
        this.smartSuggestions = [
            'Summarize this page',
            'Extract all links',
            'Find contact information',
            'Translate to English',
            'Click the login button',
            'Fill the search form',
            'Take a screenshot',
            'Scroll to bottom'
        ];
    }

    async executeCommand(command) {
        try {
            uiManager.addMessage(command, 'user');
            
            // Process command
            const response = await this.processCommand(command);
            
            // Add to history
            this.state.addToHistory(command, response);
            
            // Display response
            uiManager.addMessage(response.text, 'assistant');
            
            // Speak response if enabled
            if (this.state.settings.voiceEnabled) {
                await this.audioManager.speak(response.text);
            }
            
        } catch (error) {
            console.error('Command execution failed:', error);
            uiManager.showError('Command failed: ' + error.message);
        }
    }

    async processCommand(command) {
        const lowerCommand = command.toLowerCase();
        
        // Page analysis commands
        if (lowerCommand.includes('summarize') || lowerCommand.includes('summary')) {
            return await this.summarizePage();
        }
        
        if (lowerCommand.includes('extract') && lowerCommand.includes('link')) {
            return await this.extractLinks();
        }
        
        if (lowerCommand.includes('translate')) {
            return await this.translatePage();
        }
        
        // RPA commands
        if (lowerCommand.includes('click')) {
            return await this.handleClickCommand(command);
        }
        
        if (lowerCommand.includes('fill') || lowerCommand.includes('type')) {
            return await this.handleFillCommand(command);
        }
        
        if (lowerCommand.includes('scroll')) {
            return await this.handleScrollCommand(command);
        }
        
        if (lowerCommand.includes('screenshot')) {
            return await this.takeScreenshot();
        }
        
        // Tab management
        if (lowerCommand.includes('switch tab') || lowerCommand.includes('go to tab')) {
            return await this.handleTabSwitch(command);
        }
        
        // Default AI response
        return await this.getAIResponse(command);
    }

    async summarizePage() {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'SUMMARIZE_PAGE',
                tabId: this.state.activeTabId
            });
            
            return {
                text: response.summary || 'Page summary not available',
                type: 'summary'
            };
        } catch (error) {
            return { text: 'Failed to summarize page: ' + error.message, type: 'error' };
        }
    }

    async extractLinks() {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'EXTRACT_LINKS',
                tabId: this.state.activeTabId
            });
            
            const links = response.links || [];
            if (links.length === 0) {
                return { text: 'No links found on this page', type: 'info' };
            }
            
            const linkText = links.slice(0, 10).map((link, i) => 
                `${i + 1}. ${link.text || link.url} - ${link.url}`
            ).join('\n');
            
            return {
                text: `Found ${links.length} links:\n\n${linkText}${links.length > 10 ? '\n\n... and more' : ''}`,
                type: 'links'
            };
        } catch (error) {
            return { text: 'Failed to extract links: ' + error.message, type: 'error' };
        }
    }

    async handleClickCommand(command) {
        // Simple element detection
        const selectors = [
            'button', 'input[type="button"]', 'input[type="submit"]', 
            '[role="button"]', '.btn', '#submit'
        ];
        
        for (const selector of selectors) {
            try {
                const result = await this.rpaManager.clickElement(selector);
                return { text: `Clicked element: ${selector}`, type: 'action' };
            } catch (error) {
                // Try next selector
            }
        }
        
        return { text: 'Could not find clickable element', type: 'error' };
    }

    async handleFillCommand(command) {
        // Extract field type and value from command
        const fieldMatch = command.match(/fill\s+(.+?)\s+with\s+(.+)/i);
        if (!fieldMatch) {
            return { text: 'Please specify: fill [field] with [value]', type: 'info' };
        }
        
        const [, fieldType, value] = fieldMatch;
        const selector = this.getFieldSelector(fieldType);
        
        try {
            await this.rpaManager.fillField(selector, value);
            return { text: `Filled ${fieldType} with: ${value}`, type: 'action' };
        } catch (error) {
            return { text: `Failed to fill ${fieldType}: ${error.message}`, type: 'error' };
        }
    }

    getFieldSelector(fieldType) {
        const selectorMap = {
            'email': 'input[type="email"]',
            'password': 'input[type="password"]',
            'search': 'input[type="search"], [name*="search"]',
            'name': 'input[name*="name"], [name*="user"]',
            'username': 'input[name*="user"], [name*="login"]'
        };
        
        return selectorMap[fieldType.toLowerCase()] || 'input[type="text"]';
    }

    async handleScrollCommand(command) {
        try {
            if (command.includes('bottom')) {
                await chrome.runtime.sendMessage({
                    type: 'SCROLL_TO',
                    tabId: this.state.activeTabId,
                    position: 'bottom'
                });
                return { text: 'Scrolled to bottom of page', type: 'action' };
            } else if (command.includes('top')) {
                await chrome.runtime.sendMessage({
                    type: 'SCROLL_TO',
                    tabId: this.state.activeTabId,
                    position: 'top'
                });
                return { text: 'Scrolled to top of page', type: 'action' };
            } else {
                return { text: 'Please specify: scroll to top or bottom', type: 'info' };
            }
        } catch (error) {
            return { text: 'Failed to scroll: ' + error.message, type: 'error' };
        }
    }

    async takeScreenshot() {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'TAKE_SCREENSHOT',
                tabId: this.state.activeTabId
            });
            
            return { text: 'Screenshot captured successfully', type: 'action' };
        } catch (error) {
            return { text: 'Failed to take screenshot: ' + error.message, type: 'error' };
        }
    }

    async handleTabSwitch(command) {
        const tabs = await this.tabManager.discoverTabs();
        
        // Simple tab number detection
        const tabMatch = command.match(/tab\s+(\d+)/i);
        if (tabMatch) {
            const tabIndex = parseInt(tabMatch[1]) - 1;
            if (tabIndex >= 0 && tabIndex < tabs.length) {
                const tab = tabs[tabIndex];
                await this.tabManager.switchToTab(tab.id);
                return { text: `Switched to: ${tab.title}`, type: 'action' };
            }
        }
        
        return { text: 'Please specify a valid tab number', type: 'info' };
    }

    async getAIResponse(command) {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'AI_QUERY',
                command: command,
                tabId: this.state.activeTabId,
                context: this.getPageContext()
            });
            
            return {
                text: response.response || 'I can help you with that! Try asking me to summarize the page, extract links, or perform actions.',
                type: 'ai'
            };
        } catch (error) {
            return { 
                text: "I'm here to help! You can ask me to:\n• Summarize the current page\n• Extract links or information\n• Click buttons or fill forms\n• Take screenshots\n• Switch between tabs", 
                type: 'help' 
            };
        }
    }

    getPageContext() {
        const activeTab = this.tabManager.getActiveTab();
        return {
            url: activeTab?.url || '',
            title: activeTab?.title || '',
            timestamp: new Date().toISOString()
        };
    }

    updateSuggestions() {
        if (!this.state.settings.smartSuggestions) return;
        
        const suggestionsContainer = document.getElementById('suggestions');
        if (!suggestionsContainer) return;
        
        // Clear existing suggestions
        suggestionsContainer.innerHTML = '';
        
        // Add contextual suggestions
        this.smartSuggestions.slice(0, 4).forEach(suggestion => {
            const chip = document.createElement('div');
            chip.className = 'suggestion-chip';
            chip.textContent = suggestion;
            chip.onclick = () => {
                const input = document.getElementById('commandInput');
                if (input) {
                    input.value = suggestion;
                    input.focus();
                }
            };
            suggestionsContainer.appendChild(chip);
        });
    }
}

// UI Management
class UIManager {
    constructor(state) {
        this.state = state;
        this.initializeEventListeners();
        this.loadHistory();
    }

    initializeEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Command input
        const commandInput = document.getElementById('commandInput');
        const sendBtn = document.getElementById('sendBtn');
        const voiceBtn = document.getElementById('voiceBtn');
        const testConnectionBtn = document.getElementById('testConnectionBtn');

        if (commandInput) {
            commandInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleCommandSubmit();
                }
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.handleCommandSubmit());
        }

        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
        }

        if (testConnectionBtn) {
            testConnectionBtn.addEventListener('click', () => this.handleTestConnection());
        }

        // Settings
        this.initializeSettings();
    }

    initializeSettings() {
        // Language select
        const languageSelect = document.getElementById('languageSelect');
        if (languageSelect) {
            languageSelect.value = this.state.settings.language;
            languageSelect.addEventListener('change', (e) => {
                this.state.settings.language = e.target.value;
                this.state.saveSettings();
            });
        }

        // Toggle switches
        const toggles = [
            'voiceToggle', 'autoListenToggle', 'smartSuggestionsToggle',
            'contextAwareToggle', 'saveHistoryToggle', 'analyticsToggle'
        ];

        toggles.forEach(toggleId => {
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                const settingKey = this.getSettingKey(toggleId);
                toggle.classList.toggle('active', this.state.settings[settingKey]);
                
                toggle.addEventListener('click', () => {
                    toggle.classList.toggle('active');
                    this.state.settings[settingKey] = toggle.classList.contains('active');
                    this.state.saveSettings();
                });
            }
        });

        // Backend URL
        const backendUrl = document.getElementById('backendUrl');
        if (backendUrl) {
            backendUrl.value = this.state.settings.backendUrl;
            backendUrl.addEventListener('change', (e) => {
                this.state.settings.backendUrl = e.target.value;
                this.state.saveSettings();
            });
        }
    }

    getSettingKey(toggleId) {
        const keyMap = {
            'voiceToggle': 'voiceEnabled',
            'autoListenToggle': 'autoListen',
            'smartSuggestionsToggle': 'smartSuggestions',
            'contextAwareToggle': 'contextAware',
            'saveHistoryToggle': 'saveHistory',
            'analyticsToggle': 'analytics'
        };
        return keyMap[toggleId] || toggleId;
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        this.state.currentTab = tabName;

        // Load tab-specific content
        if (tabName === 'tabs') {
            this.loadTabs();
        } else if (tabName === 'history') {
            this.loadHistory();
        }
    }

    async handleCommandSubmit() {
        const input = document.getElementById('commandInput');
        if (!input || !input.value.trim()) return;

        const command = input.value.trim();
        input.value = '';

        await commandManager.executeCommand(command);
    }

    async handleTestConnection() {
        const testBtn = document.getElementById('testConnectionBtn');
        if (testBtn) {
            testBtn.textContent = '⏳ Testing...';
            testBtn.style.background = 'var(--warning)';
        }

        try {
            // Send test message to background script
            const response = await chrome.runtime.sendMessage({
                type: 'TEST_CONNECTION',
                timestamp: Date.now()
            });

            if (response && response.success) {
                this.addMessage('✅ Test message sent successfully', 'assistant');
                this.showSuccess('Connection test: Message sent to cloud');
            } else {
                this.addMessage('❌ Test message failed', 'assistant');
                this.showError(`Connection test failed: ${response?.error || 'Unknown error'}`);
            }
        } catch (error) {
            this.addMessage('❌ Connection test failed', 'assistant');
            this.showError(`Connection test error: ${error.message}`);
        } finally {
            if (testBtn) {
                testBtn.textContent = '🔄 Test Connection';
                testBtn.style.background = 'var(--info)';
            }
        }
    }

    async toggleVoiceInput() {
        if (this.state.isListening) {
            audioManager.stopListening();
        } else {
            await audioManager.startListening();
        }
    }

    updateVoiceButton(isRecording) {
        const voiceBtn = document.getElementById('voiceBtn');
        if (!voiceBtn) return;

        voiceBtn.classList.toggle('recording', isRecording);
        voiceBtn.innerHTML = isRecording ? '⏹️' : '🎤';
    }

    addMessage(text, type = 'assistant') {
        const conversation = document.getElementById('conversation');
        if (!conversation) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const textDiv = document.createElement('div');
        textDiv.textContent = text;
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = new Date().toLocaleTimeString();
        
        messageDiv.appendChild(textDiv);
        messageDiv.appendChild(timeDiv);
        conversation.appendChild(messageDiv);

        // Scroll to bottom
        conversation.scrollTop = conversation.scrollHeight;
    }

    async loadTabs() {
        const tabList = document.getElementById('tabList');
        if (!tabList) return;

        tabList.innerHTML = '<div class="loading"><div class="spinner"></div>Loading tabs...</div>';

        try {
            const tabs = await tabManager.discoverTabs();
            this.renderTabs(tabs);
        } catch (error) {
            tabList.innerHTML = '<div class="error-message">Failed to load tabs</div>';
        }
    }

    renderTabs(tabs) {
        const tabList = document.getElementById('tabList');
        if (!tabList) return;

        if (tabs.length === 0) {
            tabList.innerHTML = '<div class="error-message">No tabs available</div>';
            return;
        }

        tabList.innerHTML = '';
        
        tabs.forEach(tab => {
            const tabItem = document.createElement('div');
            tabItem.className = 'tab-item';
            tabItem.classList.toggle('active', tab.id === this.state.activeTabId);
            
            tabItem.innerHTML = `
                <img class="tab-favicon" src="${tab.favicon}" alt="">
                <div class="tab-info">
                    <div class="tab-title">${tab.title}</div>
                    <div class="tab-url">${tab.url}</div>
                </div>
            `;

            tabItem.addEventListener('click', async () => {
                await tabManager.switchToTab(tab.id);
                this.loadTabs(); // Refresh to update active state
            });

            tabList.appendChild(tabItem);
        });
    }

    loadHistory() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;

        const history = this.state.loadHistory();
        
        if (history.length === 0) {
            historyList.innerHTML = '<div class="error-message">No command history</div>';
            return;
        }

        historyList.innerHTML = '';
        
        history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const time = new Date(item.timestamp).toLocaleString();
            
            historyItem.innerHTML = `
                <div class="history-command">${item.command}</div>
                <div class="history-time">${time}</div>
            `;

            historyItem.addEventListener('click', () => {
                const input = document.getElementById('commandInput');
                if (input) {
                    input.value = item.command;
                    input.focus();
                }
            });

            historyList.appendChild(historyItem);
        });
    }

    updateConnectionStatus(status, message = '') {
        const connectionDot = document.getElementById('connectionDot');
        const connectionStatus = document.getElementById('connectionStatus');
        
        if (connectionDot) {
            connectionDot.className = `status-dot ${status}`;
        }
        
        if (connectionStatus) {
            connectionStatus.textContent = message || status.charAt(0).toUpperCase() + status.slice(1);
        }
        
        this.state.connectionStatus = status;
    }

    updateSessionInfo(info) {
        const sessionInfo = document.getElementById('sessionInfo');
        if (sessionInfo) {
            sessionInfo.textContent = info;
        }
    }

    showError(message) {
        this.addMessage(`❌ Error: ${message}`, 'assistant');
    }

    showSuccess(message) {
        this.addMessage(`✅ ${message}`, 'assistant');
    }

    showInfo(message) {
        this.addMessage(`ℹ️ ${message}`, 'assistant');
    }
}

// Initialize Application
let state, audioManager, rpaManager, tabManager, commandManager, uiManager;

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize state
    state = new SidePanelState();
    
    // Set default backend URL from config if available
    const backendUrlInput = document.getElementById('backendUrl');
    if (backendUrlInput && !backendUrlInput.value) {
        const defaultUrl = backendUrlInput.getAttribute('data-default');
        if (defaultUrl) {
            backendUrlInput.value = defaultUrl;
        }
    }
    
    // Initialize managers
    audioManager = new AudioManager(state);
    rpaManager = new RPAManager(state);
    tabManager = new TabManager(state);
    commandManager = new CommandManager(state, audioManager, rpaManager, tabManager);
    uiManager = new UIManager(state);

    // Load initial data
    await tabManager.discoverTabs();
    commandManager.updateSuggestions();

    // Setup background script communication
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        handleBackgroundMessage(message, sender, sendResponse);
        return true; // Keep message channel open
    });

    // Check connection status
    checkBackendConnection();
    
    // Set up periodic connection check
    setInterval(checkBackendConnection, 5000); // Check every 5 seconds

    // Update version
    const manifest = chrome.runtime.getManifest();
    const versionElement = document.getElementById('version');
    if (versionElement) {
        versionElement.textContent = `v${manifest.version}`;
    }

    console.log('KELEDON Side Panel initialized');
});

async function handleBackgroundMessage(message, sender, sendResponse) {
    try {
        switch (message.type) {
            case 'CONNECTION_STATUS':
                // Real connection status from WebSocket client
                if (message.status === 'connected') {
                    uiManager.updateConnectionStatus('connected', 'Connected to Cloud');
                    if (message.sessionId) {
                        // Show real session info (anti-demo: no fake sessions)
                        const sessionPreview = `Session ${message.sessionId.substring(0, 8)}...`;
                        uiManager.updateSessionInfo(sessionPreview);
                    }
                } else if (message.status === 'connecting') {
                    uiManager.updateConnectionStatus('connecting', 'Creating session...');
                } else if (message.status === 'error') {
                    uiManager.updateConnectionStatus('error', `Error: ${message.error || 'Connection failed'}`);
                    uiManager.updateSessionInfo('Session failed');
                } else if (message.status === 'failed') {
                    // Show failure when cloud unavailable (anti-demo rule)
                    uiManager.updateConnectionStatus('error', `Failed: ${message.error || 'Cloud unavailable'}`);
                    uiManager.showError(`Cloud connection failed: ${message.error || 'Cloud backend unavailable'}`);
                    uiManager.updateSessionInfo('No session');
                } else if (message.status === 'disconnected') {
                    uiManager.updateConnectionStatus('disconnected', message.reason || 'Disconnected');
                    uiManager.updateSessionInfo('Session ended');
                }
                break;
                
            case 'STATUS_UPDATE':
                uiManager.updateConnectionStatus(message.status, message.message);
                uiManager.updateSessionInfo(message.sessionInfo || 'No active session');
                break;
                
            case 'TRANSCRIPT_FINAL':
                if (message.transcript) {
                    uiManager.addMessage(`Transcript: ${message.transcript}`, 'assistant');
                    
                    // Update STT status to ready (transcription complete)
                    const sttStatus = document.getElementById('sttStatus');
                    if (sttStatus) {
                        sttStatus.className = 'status-dot ready';
                        sttStatus.textContent = 'STT Ready';
                    }
                }
                break;
                
            case 'TRANSCRIPT_PARTIAL':
                if (message.transcript) {
                    // Update STT status to processing (transcribing)
                    const sttStatus = document.getElementById('sttStatus');
                    if (sttStatus) {
                        sttStatus.className = 'status-dot processing';
                        sttStatus.textContent = 'STT Processing';
                    }
                }
                break;
                
            case 'RPA_RESULT':
                if (message.result) {
                    uiManager.addMessage(`RPA: ${message.result.evidence}`, 'assistant');
                }
                break;
                
            case 'TEST_CONNECTION_RESPONSE':
                if (message.success) {
                    const roundtripTime = message.roundtripTime || 0;
                    uiManager.addMessage(`✅ Cloud response received (${roundtripTime}ms)`, 'assistant');
                    uiManager.showSuccess(`Roundtrip complete in ${roundtripTime}ms`);
                    
                    // Update connection status to reflect successful roundtrip
                    uiManager.updateConnectionStatus('connected', 'Cloud responsive');
                } else {
                    uiManager.addMessage(`❌ Cloud test failed: ${message.error}`, 'assistant');
                    uiManager.showError(`Cloud test failed: ${message.error}`);
                }
                break;
                
            default:
                console.log('Unknown message type:', message.type);
        }
        
        sendResponse({ success: true });
    } catch (error) {
        console.error('Error handling background message:', error);
        sendResponse({ success: false, error: error.message });
    }
}

async function checkBackendConnection() {
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'GET_STATUS'
        });
        
        // Truthful connection check: only show connected if socket is actually connected
        if (response && response.socketConnected === true) {
            uiManager.updateConnectionStatus('connected', 'Connected to Cloud');
        } else if (response && response.isListening === true) {
            uiManager.updateConnectionStatus('connecting', 'Session active...');
        } else {
            uiManager.updateConnectionStatus('disconnected', 'Not connected');
        }

        // Update component status display based on real state
        updateComponentStatus({
            websocket: (response && response.socketConnected === true) ? 'connected' : 'disconnected',
            stt: response && response.isListening ? 'ready' : 'disconnected',
            tts: 'disconnected',
            session: response
        });
        
    } catch (error) {
        uiManager.updateConnectionStatus('error', 'Connection check failed');
    }
}

function updateComponentStatus(components) {
    // Update WebSocket status
    const wsStatus = document.getElementById('websocketStatus');
    if (wsStatus) {
        wsStatus.className = `status-dot ${components.websocket || 'disconnected'}`;
        wsStatus.textContent = components.websocket === 'connected' ? 'WS Connected' : 'WS Disconnected';
    }

    // Update STT status
    const sttStatus = document.getElementById('sttStatus');
    if (sttStatus && components.stt) {
        const statusMap = {
            'ready': { class: 'ready', text: 'STT Ready' },
            'listening': { class: 'processing', text: 'STT Listening' },
            'processing': { class: 'processing', text: 'STT Processing' },
            'error': { class: 'error', text: 'STT Error' },
            'degraded': { class: 'degraded', text: 'STT Degraded' }
        };
        
        const status = statusMap[components.stt] || statusMap.ready;
        sttStatus.className = `status-dot ${status.class}`;
        sttStatus.textContent = status.text;
    }

    // Update TTS status
    const ttsStatus = document.getElementById('ttsStatus');
    if (ttsStatus && components.tts) {
        const statusMap = {
            'ready': { class: 'ready', text: 'TTS Ready' },
            'speaking': { class: 'speaking', text: 'TTS Speaking' },
            'error': { class: 'error', text: 'TTS Error' },
            'degraded': { class: 'degraded', text: 'TTS Degraded' }
        };
        
        const status = statusMap[components.tts] || statusMap.ready;
        ttsStatus.className = `status-dot ${status.class}`;
        ttsStatus.textContent = status.text;
    }

    // Update session status
    updateSessionStatus(components.session);
}

function updateSessionStatus(session) {
    const sessionInfo = document.getElementById('sessionInfo');
    if (sessionInfo && session) {
        // Show real session info (anti-demo compliance)
        if (session.id && validateUUID(session.id)) {
            const sessionPreview = `Session ${session.id.substring(0, 8)}...`;
            sessionInfo.textContent = sessionPreview;
        } else {
            sessionInfo.textContent = 'No valid session';
        }
    }
}

function validateUUID(sessionId) {
    // Validate real UUID format (anti-demo: no fake sessions)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(sessionId);
}

// Export for debugging
window.KELEDON = {
    state,
    audioManager,
    rpaManager,
    tabManager,
    commandManager,
    uiManager
};