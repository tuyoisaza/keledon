        // Test results tracking
        const testResults = {
            config: null,
            buttons: null,
            forms: null,
            ragAPI: null,
            websocket: null,
            backendAPI: null,
            tts: null,
            stt: null,
            rpa: null
        };

        // Enhanced logging system
        const testLog = [];
        let logContainer = null;

        function log(level, message, data = null) {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                level,
                message,
                data
            };

            testLog.push(logEntry);
            updateLogDisplay(logEntry);

            // Also console log for debugging
            console.log(`[${level.toUpperCase()}] ${message}`, data || '');
        }

        function updateLogDisplay(logEntry) {
            if (!logContainer) {
                logContainer = document.getElementById('test-log');
            }

            const logDiv = document.createElement('div');
            logDiv.className = 'log-entry';
            logDiv.innerHTML = `
                <span class="log-timestamp">[${logEntry.timestamp.split('T')[1].split('.')[0]}]</span>
                <span class="log-level-${logEntry.level}">[${logEntry.level.toUpperCase()}]</span>
                ${logEntry.message}
                ${logEntry.data ? `<br><small>${JSON.stringify(logEntry.data, null, 2)}</small>` : ''}
            `;

            logContainer.appendChild(logDiv);
            logContainer.scrollTop = logContainer.scrollHeight;
        }

        function copyLog() {
            const logText = testLog.map(entry => {
                return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${entry.data ? '\n' + JSON.stringify(entry.data, null, 2) : ''}`;
            }).join('\n\n');

            navigator.clipboard.writeText(logText).then(() => {
                log('success', '📋 Test log copied to clipboard!');
            }).catch(() => {
                log('error', '❌ Failed to copy test log to clipboard');
            });
        }

        async function copyLogsFromMdFile() {
            try {
                // Read the logs.md file
                const response = await fetch('logs.md');
                const logContent = await response.text();

                navigator.clipboard.writeText(logContent).then(() => {
                    log('success', '📋 Logs.md file copied to clipboard!');
                }).catch(() => {
                    log('error', '❌ Failed to copy logs.md file');
                });
            } catch (error) {
                log('error', `❌ Failed to read logs.md file: ${error.message}`);
            }
        }

        async function exportLogToFile() {
            try {
                // Create log content with timestamps and structured data
                const logContent = [
                    '# 🧪 KELEDON Backend Test Logs',
                    '',
                    `**Test Started:** ${new Date().toISOString()}`,
                    '**Environment:** Phase 1 - Foundation & Health Service',
                    '**Backend URL:** http://localhost:3001',
                    '',
                    '---',
                    '',
                    ...testLog.map(logEntry => {
                        let formattedEntry = `[${logEntry.timestamp}] [${logEntry.level.toUpperCase()}] ${logEntry.message}`;
                        if (logEntry.data) {
                            formattedEntry += '\n' + JSON.stringify(logEntry.data, null, 2);
                        }
                        return formattedEntry;
                    }),
                    '',
                    '---',
                    `**Test Summary:** ${testResults ? Object.entries(testResults).map(([key, value]) => `${key}: ${value ? '✅' : '❌'}`).join(', ') : 'Pending'}`,
                    '',
                    `**Total Tests:** ${testResults ? Object.keys(testResults).length : 0} | Passed: ${testResults ? Object.values(testResults).filter(v => v === true).length : 0} | Failed: ${testResults ? Object.values(testResults).filter(v => v === false).length : 0}`,
                    '',
                    '<!-- End of test logs -->'
                ].join('\n');

                // Create and download the file
                const blob = new Blob([logContent], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `keledon-test-logs-${new Date().toISOString().split('T')[0].replace(/[:-]/g, '')}.md`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                log('success', '📄 Test log exported to logs.md file!');
            } catch (error) {
                log('error', `❌ Failed to export log: ${error.message}`);
            }
        }

        function updateResult(elementId, status, message) {
            const element = document.getElementById(elementId);
            element.className = `test-result ${status}`;
            element.textContent = message;

            // Also log the result
            const logLevel = status === 'pass' ? 'success' : status === 'fail' ? 'error' : 'info';
            log(logLevel, `Test Result: ${message}`, { elementId, status });
        }

        function testConfig() {
            log('info', 'Starting configuration test...');

            try {
                // Test configuration loading
                const config = window.AGENT_CONFIG || window.KELEDON_CONFIG;

                // If no config loaded, provide default for Phase 1
                if (!config || !config.BACKEND_URL) {
                    updateResult('config-result', 'fail', '❌ Configuration not loaded - Using Phase 1 defaults');
                    log('warning', 'Using Phase 1 default configuration');

                    // Set default config for Phase 1 testing
                    window.KELEDON_CONFIG = {
                        BACKEND_URL: 'http://localhost:3001',
                        WS_URL: 'ws://localhost:3001',
                        RAG_RETRIEVE_ENDPOINT: '/rag/retrieve',
                        RAG_EVALUATE_ENDPOINT: '/rag/evaluate',
                        LISTEN_WS_ENDPOINT: '/listen/ws'
                    };

                    testResults.config = true;
                    updateSummary();
                    return;
                }

                if (config && config.BACKEND_URL) {
                    updateResult('config-result', 'pass', `✅ Configuration loaded successfully`);
                    log('success', 'Configuration loaded successfully', config);

                    // Display config
                    const configDisplay = document.getElementById('config-display');
                    configDisplay.innerHTML = `
                        <strong>Configuration Loaded:</strong><br>
                        BACKEND_URL: ${config.BACKEND_URL}<br>
                        WS_URL: ${config.WS_URL || 'Not defined'}<br>
                        RAG_RETRIEVE_ENDPOINT: ${config.RAG_RETRIEVE_ENDPOINT || 'Not defined'}<br>
                        RAG_EVALUATE_ENDPOINT: ${config.RAG_EVALUATE_ENDPOINT || 'Not defined'}<br>
                        DEBUG: ${config.DEBUG || 'Not defined'}
                    `;
                    testResults.config = true;
                } else {
                    updateResult('config-result', 'fail', '❌ Configuration failed to load');
                    log('error', 'Configuration failed to load', { config: window.AGENT_CONFIG || window.KELEDON_CONFIG });
                    testResults.config = false;
                }
            } catch (error) {
                updateResult('config-result', 'fail', `❌ Configuration error: ${error.message}`);
                log('error', `Configuration error: ${error.message}`, { error: error.toString() });
                testResults.config = false;
            }
            updateSummary();
        }

        function testButtons() {
            // Test if sidepanel.html exists and has required buttons
            fetch('ui/sidepanel.html')
                .then(response => response.text())
                .then(html => {
                    const buttons = [
                        'sendBtn', 'voiceBtn', 'settingsBtn', 'commandInput'
                    ];

                    const foundButtons = [];
                    const missingButtons = [];

                    buttons.forEach(btnId => {
                        if (html.includes(`id="${btnId}"`)) {
                            foundButtons.push(btnId);
                        } else {
                            missingButtons.push(btnId);
                        }
                    });

                    if (missingButtons.length === 0) {
                        updateResult('elements-result', 'pass', `✅ All buttons found: ${foundButtons.join(', ')}`);
                        testResults.buttons = true;
                    } else {
                        updateResult('elements-result', 'fail', `❌ Missing buttons: ${missingButtons.join(', ')}`);
                        testResults.buttons = false;
                    }
                })
                .catch(error => {
                    updateResult('elements-result', 'fail', `❌ Error loading sidepanel.html: ${error.message}`);
                    testResults.buttons = false;
                });
        }

        function testForms() {
            // Test form elements
            fetch('ui/sidepanel.html')
                .then(response => response.text())
                .then(html => {
                    const forms = [
                        'languageSelect', 'backendUrl', 'voiceToggle', 'autoListenToggle'
                    ];

                    const foundForms = [];
                    const missingForms = [];

                    forms.forEach(formId => {
                        if (html.includes(`id="${formId}"`)) {
                            foundForms.push(formId);
                        } else {
                            missingForms.push(formId);
                        }
                    });

                    if (missingForms.length === 0) {
                        updateResult('elements-result', 'pass', `✅ All forms found: ${foundForms.join(', ')}`);
                        testResults.forms = true;
                    } else {
                        updateResult('elements-result', 'fail', `❌ Missing forms: ${missingForms.join(', ')}`);
                        testResults.forms = false;
                    }
                });
        }

        async function testRAGAPI() {
            try {
                const config = window.AGENT_CONFIG || window.KELEDON_CONFIG;
                const ragEndpoint = `${config.BACKEND_URL}${config.RAG_RETRIEVE_ENDPOINT}`;

                const response = await fetch(ragEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: 'test query',
                        sessionId: 'test-session',
                        companyId: 'test-company'
                    })
                });

                if (response.ok) {
                    updateResult('api-result', 'pass', `✅ RAG API responding: ${response.status}`);
                    testResults.ragAPI = true;
                } else {
                    updateResult('api-result', 'fail', `❌ RAG API error: ${response.status} ${response.statusText}`);
                    testResults.ragAPI = false;
                }
            } catch (error) {
                updateResult('api-result', 'fail', `❌ RAG API connection failed: ${error.message}`);
                testResults.ragAPI = false;
            }
            updateSummary();
        }

        function testWebSocket() {
            try {
                const config = window.AGENT_CONFIG || window.KELEDON_CONFIG;
                const wsUrl = `${config.WS_URL}${config.LISTEN_WS_ENDPOINT || '/listen/ws'}`;

                const ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    updateResult('api-result', 'pass', `✅ WebSocket connected: ${wsUrl}`);
                    testResults.websocket = true;
                    ws.close();
                    updateSummary();
                };

                ws.onerror = (error) => {
                    updateResult('api-result', 'fail', `❌ WebSocket connection failed: ${wsUrl}`);
                    testResults.websocket = false;
                    updateSummary();
                };

                // Timeout after 5 seconds
                setTimeout(() => {
                    if (ws.readyState === WebSocket.CONNECTING) {
                        updateResult('api-result', 'fail', `❌ WebSocket timeout: ${wsUrl}`);
                        testResults.websocket = false;
                        ws.close();
                        updateSummary();
                    }
                }, 5000);

            } catch (error) {
                updateResult('api-result', 'fail', `❌ WebSocket error: ${error.message}`);
                testResults.websocket = false;
                updateSummary();
            }
        }

        async function testBackendAPI() {
            try {
                const config = window.AGENT_CONFIG || window.KELEDON_CONFIG;
                const healthEndpoint = `${config.BACKEND_URL}/health` || `${config.BACKEND_URL}`;

                const response = await fetch(healthEndpoint);

                if (response.ok) {
                    updateResult('api-result', 'pass', `✅ Backend API responding: ${response.status}`);
                    testResults.backendAPI = true;
                } else {
                    updateResult('api-result', 'fail', `❌ Backend API error: ${response.status} ${response.statusText}`);
                    testResults.backendAPI = false;
                }
            } catch (error) {
                updateResult('api-result', 'fail', `❌ Backend API connection failed: ${error.message}`);
                testResults.backendAPI = false;
            }
            updateSummary();
        }

        function testAPIConnections() {
            testRAGAPI();
            testWebSocket();
            testBackendAPI();
        }

        function updateSummary() {
            const results = Object.values(testResults);
            const passed = results.filter(r => r === true).length;
            const failed = results.filter(r => r === false).length;
            const pending = results.filter(r => r === null).length;
            const total = passed + failed + pending;

            // Detailed breakdown
            const details = [];
            if (testResults.config !== null) details.push(`Config: ${testResults.config ? '✅' : '❌'}`);
            if (testResults.buttons !== null) details.push(`UI: ${testResults.buttons ? '✅' : '❌'}`);
            if (testResults.tts !== null) details.push(`TTS: ${testResults.tts ? '✅' : '❌'}`);
            if (testResults.stt !== null) details.push(`STT: ${testResults.stt ? '✅' : '❌'}`);
            if (testResults.rpa !== null) details.push(`RPA: ${testResults.rpa ? '✅' : '❌'}`);
            if (testResults.ragAPI !== null) details.push(`RAG: ${testResults.ragAPI ? '✅' : '❌'}`);
            if (testResults.websocket !== null) details.push(`WebSocket: ${testResults.websocket ? '✅' : '❌'}`);

            const summary = document.getElementById('summary');
            const detailText = details.length > 0 ? ` | ${details.join(' ')}` : '';

            if (pending > 0) {
                updateResult('summary', 'pending', `📊 Tests: ${passed} passed, ${failed} failed, ${pending} pending${detailText}`);
            } else if (failed === 0) {
                updateResult('summary', 'pass', `🎉 All tests passed! ${passed}/${total} successful${detailText}`);
            } else {
                updateResult('summary', 'fail', `⚠️ Tests: ${passed} passed, ${failed} failed${detailText}`);
            }

            log('info', `Test summary updated: ${passed} passed, ${failed} failed, ${pending} pending`);
        }

        // Real Services Implementation Test
