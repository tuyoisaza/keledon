        async function testRealServices() {
            log('info', '🚀 Starting real services implementation test...');
            updateResult('real-services-result', 'pending', 'Testing real services implementation...');

            const config = window.AGENT_CONFIG || window.KELEDON_CONFIG;
            if (!config) {
                updateResult('real-services-result', 'fail', '❌ Configuration not loaded');
                log('error', 'Real services test failed: Configuration not loaded');
                return;
            }

            const backendUrl = config.BACKEND_URL;
            log('info', `Testing real services at: ${backendUrl}`);

            let testsPassed = 0;
            let totalTests = 4;

            // Test 1: Voice Analytics Service
            try {
                log('info', 'Testing Voice Analytics service...');
                const response = await fetch(`${backendUrl}/api/dashboard/analytics/voice`, {
                    method: 'GET',
                    timeout: 5000
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        log('success', `✅ Voice Analytics service working`, {
                            status: response.status,
                            data: {
                                totalConversations: data.data.totalConversations,
                                avgDuration: data.data.avgDuration,
                                successRate: data.data.successRate
                            }
                        });
                        testsPassed++;
                    } else {
                        log('error', '❌ Voice Analytics service returned invalid data');
                    }
                } else {
                    log('error', `❌ Voice Analytics service error: ${response.status}`);
                }
            } catch (error) {
                log('error', `❌ Voice Analytics service failed: ${error.message}`);
            }

            // Test 2: Integration Health Service
            try {
                log('info', 'Testing Integration Health service...');
                const response = await fetch(`${backendUrl}/api/dashboard/integrations/health`, {
                    method: 'GET',
                    timeout: 5000
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        log('success', `✅ Integration Health service working`, {
                            status: response.status,
                            data: {
                                providerCount: data.data.length,
                                connectedProviders: data.data.filter(p => p.status === 'connected').length
                            }
                        });
                        testsPassed++;
                    } else {
                        log('error', '❌ Integration Health service returned invalid data');
                    }
                } else {
                    log('error', `❌ Integration Health service error: ${response.status}`);
                }
            } catch (error) {
                log('error', `❌ Integration Health service failed: ${error.message}`);
            }

            // Test 3: Flow Execution Service
            try {
                log('info', 'Testing Flow Execution service...');
                const response = await fetch(`${backendUrl}/api/dashboard/flows/executions`, {
                    method: 'GET',
                    timeout: 5000
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        log('success', `✅ Flow Execution service working`, {
                            status: response.status,
                            data: {
                                totalExecutions: data.data.total,
                                runningExecutions: data.data.filter(e => e.status === 'running').length
                            }
                        });
                        testsPassed++;
                    } else {
                        log('error', '❌ Flow Execution service returned invalid data');
                    }
                } else {
                    log('error', `❌ Flow Execution service error: ${response.status}`);
                }
            } catch (error) {
                log('error', `❌ Flow Execution service failed: ${error.message}`);
            }

            // Test 4: AI Loop Service
            try {
                log('info', 'Testing AI Loop service...');
                const response = await fetch(`${backendUrl}/api/dashboard/ai/loops`, {
                    method: 'GET',
                    timeout: 5000
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        log('success', `✅ AI Loop service working`, {
                            status: response.status,
                            data: {
                                totalLoops: data.data.total,
                                runningLoops: data.data.filter(l => l.status === 'running').length
                            }
                        });
                        testsPassed++;
                    } else {
                        log('error', '❌ AI Loop service returned invalid data');
                    }
                } else {
                    log('error', `❌ AI Loop service error: ${response.status}`);
                }
            } catch (error) {
                log('error', `❌ AI Loop service failed: ${error.message}`);
            }

            // Final result
            const passRate = (testsPassed / totalTests) * 100;
            if (passRate >= 75) {
                updateResult('real-services-result', 'pass', `🎉 Real services implemented! ${testsPassed}/${totalTests} tests passed (${passRate.toFixed(1)}%)`);
                log('success', `🎉 Real services test completed: ${testsPassed}/${totalTests} tests passed`);
            } else if (passRate >= 50) {
                updateResult('real-services-result', 'pending', `⚠️ Partial real implementation: ${testsPassed}/${totalTests} tests passed (${passRate.toFixed(1)}%)`);
                log('warning', `⚠️ Real services test partially completed: ${testsPassed}/${totalTests} tests passed`);
            } else {
                updateResult('real-services-result', 'fail', `❌ Real services not ready: ${testsPassed}/${totalTests} tests passed (${passRate.toFixed(1)}%)`);
                log('error', `❌ Real services test failed: ${testsPassed}/${totalTests} tests passed`);
            }

            updateSummary();
        }

        // System Monitoring Test
        async function testSystemMonitoring() {
            log('info', '📈 Starting system monitoring test...');
            updateResult('system-monitoring-result', 'pending', 'Testing system monitoring...');

            const config = window.AGENT_CONFIG || window.KELEDON_CONFIG;
            if (!config) {
                updateResult('system-monitoring-result', 'fail', '❌ Configuration not loaded');
                log('error', 'System monitoring test failed: Configuration not loaded');
                return;
            }

            const backendUrl = config.BACKEND_URL;
            let testsPassed = 0;
            let totalTests = 3;

            // Test 1: Agent Status Monitoring
            try {
                log('info', 'Testing Agent Status monitoring...');
                const response = await fetch(`${backendUrl}/api/dashboard/agents/status`, {
                    method: 'GET',
                    timeout: 5000
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        log('success', `✅ Agent Status monitoring working`, {
                            status: response.status,
                            data: {
                                agentCount: data.data.total,
                                activeAgents: data.data.data.filter(a => a.status !== 'idle').length
                            }
                        });
                        testsPassed++;
                    } else {
                        log('error', '❌ Agent Status monitoring returned invalid data');
                    }
                } else {
                    log('error', `❌ Agent Status monitoring error: ${response.status}`);
                }
            } catch (error) {
                log('error', `❌ Agent Status monitoring failed: ${error.message}`);
            }

            // Test 2: System Health Monitoring
            try {
                log('info', 'Testing System Health monitoring...');
                const response = await fetch(`${backendUrl}/api/dashboard/system/health`, {
                    method: 'GET',
                    timeout: 5000
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        log('success', `✅ System Health monitoring working`, {
                            status: response.status,
                            data: {
                                overall: data.data.overall,
                                websocket: data.data.websocket,
                                tts: data.data.tts,
                                stt: data.data.stt,
                                ai: data.data.ai
                            }
                        });
                        testsPassed++;
                    } else {
                        log('error', '❌ System Health monitoring returned invalid data');
                    }
                } else {
                    log('error', `❌ System Health monitoring error: ${response.status}`);
                }
            } catch (error) {
                log('error', `❌ System Health monitoring failed: ${error.message}`);
            }

            // Test 3: Dashboard Status
            try {
                log('info', 'Testing Dashboard Status...');
                const response = await fetch(`${backendUrl}/api/dashboard/status`, {
                    method: 'GET',
                    timeout: 5000
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        log('success', `✅ Dashboard Status working`, {
                            status: response.status,
                            data: {
                                overall: data.data.status,
                                components: data.data.components
                            }
                        });
                        testsPassed++;
                    } else {
                        log('error', '❌ Dashboard Status returned invalid data');
                    }
                } else {
                    log('error', `❌ Dashboard Status error: ${response.status}`);
                }
            } catch (error) {
                log('error', `❌ Dashboard Status failed: ${error.message}`);
            }

            // Final result
            const passRate = (testsPassed / totalTests) * 100;
            if (passRate >= 75) {
                updateResult('system-monitoring-result', 'pass', `🎉 System monitoring working! ${testsPassed}/${totalTests} tests passed (${passRate.toFixed(1)}%)`);
                log('success', `🎉 System monitoring test completed: ${testsPassed}/${totalTests} tests passed`);
            } else if (passRate >= 50) {
                updateResult('system-monitoring-result', 'pending', `⚠️ Partial system monitoring: ${testsPassed}/${totalTests} tests passed (${passRate.toFixed(1)}%)`);
                log('warning', `⚠️ System monitoring test partially completed: ${testsPassed}/${totalTests} tests passed`);
            } else {
                updateResult('system-monitoring-result', 'fail', `❌ System monitoring not ready: ${testsPassed}/${totalTests} tests passed (${passRate.toFixed(1)}%)`);
                log('error', `❌ System monitoring test failed: ${testsPassed}/${totalTests} tests passed`);
            }

            updateSummary();
        }

        // Helper function to create WAV blob from audio data
        function createWavBlob(audioData, sampleRate) {
            const length = audioData.length;
            const buffer = new ArrayBuffer(44 + length * 2);
            const view = new DataView(buffer);

            // WAV header
            const writeString = (offset, string) => {
                for (let i = 0; i < string.length; i++) {
                    view.setUint8(offset + i, string.charCodeAt(i));
                }
            };

            writeString(0, 'RIFF');
            view.setUint32(4, 36 + length * 2, true);
            writeString(8, 'WAVE');
            writeString(12, 'fmt ');
            view.setUint32(16, 16, true);
            view.setUint16(20, 1, true);
            view.setUint16(22, 1, true);
            view.setUint32(24, sampleRate, true);
            view.setUint32(28, sampleRate * 2, true);
            view.setUint16(32, 2, true);
            view.setUint16(34, 16, true);
            writeString(36, 'data');
            view.setUint32(40, length * 2, true);

            // Convert float audio to 16-bit PCM
            let offset = 44;
            for (let i = 0; i < length; i++) {
                const sample = Math.max(-1, Math.min(1, audioData[i]));
                view.setInt16(offset, sample * 0x7FFF, true);
                offset += 2;
            }

            return new Blob([buffer], { type: 'audio/wav' });
        }

        // Auto-run configuration test on load
        window.onload = () => {
            testConfig();
        };
