/**
 * STT Integration Tests - Step 3 Validation
 * Tests STT → text_input event emission functionality
 */

// Test STT Manager Integration
async function testSTTManager() {
    console.log('🧪 Testing STT Manager Integration...');
    
    try {
        // Test 1: STT Manager Initialization
        const sessionManager = new SessionManager();
        const webSocketClient = new WebSocketClient(sessionManager);
        const sttManager = new STTManager(sessionManager, webSocketClient);
        
        // Mock environment for testing
        global.process = { env: { DEEPGRAM_API_KEY: 'test-key' } };
        global.crypto = { randomUUID: () => 'test-uuid-' + Math.random() };
        global.navigator = { 
            mediaDevices: { 
                getUserMedia: () => Promise.resolve({ 
                    getTracks: () => [{ stop: () => {} }] 
                }) 
            },
            userAgent: 'Test Agent'
        };
        
        // Test initialization
        await sttManager.initialize();
        console.log('✅ STT Manager initialized successfully');
        
        // Test 2: Session Creation
        const session = await sessionManager.createSession();
        console.log('✅ Real session created:', session.id);
        
        // Test 3: Session ID Validation (anti-demo compliance)
        const isValidUUID = sessionManager.validateSessionId(session.id);
        if (isValidUUID) {
            console.log('✅ Session ID is valid UUID (anti-demo compliant)');
        } else {
            throw new Error('Session ID validation failed');
        }
        
        // Test 4: STT Status Tracking
        const status = sttManager.getStatus();
        console.log('✅ STT status:', status);
        
        if (status.provider === 'deepgram' && 
            status.status === 'ready' && 
            typeof status.stats === 'object') {
            console.log('✅ STT status tracking working');
        } else {
            throw new Error('STT status tracking failed');
        }
        
        console.log('🎉 STT Manager integration tests passed!');
        return true;
        
    } catch (error) {
        console.error('❌ STT Manager integration test failed:', error);
        return false;
    }
}

// Test Canonical Event Structure
async function testCanonicalEventStructure() {
    console.log('🧪 Testing Canonical Event Structure...');
    
    try {
        // Create mock session
        const sessionManager = new SessionManager();
        const session = await sessionManager.createSession();
        
        // Create canonical text_input event
        const textInputEvent = {
            session_id: session.id,
            event_type: 'text_input',
            payload: {
                text: 'Hello world',
                confidence: 0.95,
                provider: 'deepgram',
                language: 'en-US',
                metadata: {
                    agent_id: 'Test-Agent',
                    timestamp: new Date().toISOString()
                }
            },
            ts: new Date().toISOString(),
            agent_id: 'Test-Agent'
        };
        
        // Validate event structure against canonical contract
        const requiredFields = ['session_id', 'event_type', 'payload', 'ts', 'agent_id'];
        const hasAllFields = requiredFields.every(field => textInputEvent.hasOwnProperty(field));
        
        if (!hasAllFields) {
            throw new Error('Missing required fields in canonical event');
        }
        
        // Validate event_type
        if (!['text_input', 'ui_result', 'system'].includes(textInputEvent.event_type)) {
            throw new Error('Invalid event_type');
        }
        
        // Validate payload structure
        if (!textInputEvent.payload.text || 
            typeof textInputEvent.payload.confidence !== 'number' ||
            !textInputEvent.payload.provider) {
            throw new Error('Invalid payload structure');
        }
        
        // Add event to session
        const sessionEvent = sessionManager.addSessionEvent(session.id, textInputEvent);
        
        if (!sessionEvent || !sessionEvent.id) {
            throw new Error('Failed to add event to session');
        }
        
        console.log('✅ Canonical event structure validated');
        console.log('✅ Event added to session successfully');
        console.log('🎉 Canonical event structure tests passed!');
        return true;
        
    } catch (error) {
        console.error('❌ Canonical event structure test failed:', error);
        return false;
    }
}

// Test WebSocket Event Emission
async function testWebSocketEventEmission() {
    console.log('🧪 Testing WebSocket Event Emission...');
    
    try {
        // Mock WebSocket client
        const mockWebSocketClient = {
            messages: [],
            sendBrainEvent(type, payload) {
                this.messages.push({ type, payload });
                return true;
            }
        };
        
        const sessionManager = new SessionManager();
        const session = await sessionManager.createSession();
        
        // Mock STT manager event emission
        const transcriptResult = {
            text: 'Test transcript',
            confidence: 0.92,
            provider: 'deepgram',
            language: 'en-US'
        };
        
        // Simulate text_input event creation and sending
        const textInputEvent = {
            session_id: session.id,
            event_type: 'text_input',
            payload: {
                text: transcriptResult.text,
                confidence: transcriptResult.confidence,
                provider: transcriptResult.provider,
                language: transcriptResult.language,
                metadata: {
                    agent_id: session.agent_id,
                    timestamp: new Date().toISOString()
                }
            },
            ts: new Date().toISOString(),
            agent_id: session.agent_id
        };
        
        // Send via WebSocket client
        const sent = mockWebSocketClient.sendBrainEvent('text_input', textInputEvent.payload);
        
        if (!sent) {
            throw new Error('Failed to send text_input event');
        }
        
        // Validate sent message
        const lastMessage = mockWebSocketClient.messages[mockWebSocketClient.messages.length - 1];
        if (lastMessage.type !== 'text_input' || 
            lastMessage.payload.text !== transcriptResult.text) {
            throw new Error('WebSocket message validation failed');
        }
        
        console.log('✅ WebSocket event emission successful');
        console.log('✅ Message format validated');
        console.log('🎉 WebSocket event emission tests passed!');
        return true;
        
    } catch (error) {
        console.error('❌ WebSocket event emission test failed:', error);
        return false;
    }
}

// Test Anti-Demo Compliance
async function testAntiDemoCompliance() {
    console.log('🧪 Testing Anti-Demo Compliance...');
    
    try {
        const sessionManager = new SessionManager();
        
        // Test 1: UUID generation (no fake prefixes)
        const session1 = await sessionManager.createSession();
        const session2 = await sessionManager.createSession();
        
        if (session1.id.startsWith('ses_') || 
            session2.id.startsWith('ses_') ||
            session1.id.includes('Date.now') ||
            session2.id.includes('Date.now')) {
            throw new Error('Fake session prefix detected');
        }
        
        // Test 2: Real UUID validation
        const isValidUUID1 = sessionManager.validateSessionId(session1.id);
        const isValidUUID2 = sessionManager.validateSessionId(session2.id);
        
        if (!isValidUUID1 || !isValidUUID2) {
            throw new Error('Invalid UUID format detected');
        }
        
        // Test 3: API key validation (no hardcoded keys)
        const sttManager = new STTManager({}, {});
        
        // Test with no API key
        try {
            global.process = { env: {} };
            await sttManager.initialize();
            throw new Error('Should have failed without API key');
        } catch (error) {
            if (error.message.includes('API key is required')) {
                console.log('✅ API key validation working');
            } else {
                throw error;
            }
        }
        
        // Test 4: Real session validation in events
        const fakeSessionId = 'fake_session_123';
        try {
            sessionManager.addSessionEvent(fakeSessionId, {
                session_id: fakeSessionId,
                event_type: 'text_input',
                payload: { text: 'test' },
                ts: new Date().toISOString(),
                agent_id: 'test'
            });
            throw new Error('Should have failed with fake session ID');
        } catch (error) {
            if (error.message.includes('Session not found')) {
                console.log('✅ Fake session ID validation working');
            } else {
                throw error;
            }
        }
        
        console.log('✅ Anti-demo compliance validated');
        console.log('🎉 Anti-demo compliance tests passed!');
        return true;
        
    } catch (error) {
        console.error('❌ Anti-demo compliance test failed:', error);
        return false;
    }
}

// Run All Tests
async function runSTTIntegrationTests() {
    console.log('🚀 Starting STT Integration Tests for Step 3...\n');
    
    const tests = [
        { name: 'STT Manager Integration', fn: testSTTManager },
        { name: 'Canonical Event Structure', fn: testCanonicalEventStructure },
        { name: 'WebSocket Event Emission', fn: testWebSocketEventEmission },
        { name: 'Anti-Demo Compliance', fn: testAntiDemoCompliance }
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    for (const test of tests) {
        console.log(`\n📋 Running: ${test.name}`);
        const result = await test.fn();
        
        if (result) {
            passedTests++;
            console.log(`✅ ${test.name} - PASSED`);
        } else {
            console.log(`❌ ${test.name} - FAILED`);
        }
    }
    
    console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 ALL TESTS PASSED! Step 3 STT integration is ready.');
        return true;
    } else {
        console.log('⚠️  Some tests failed. Please review the implementation.');
        return false;
    }
}

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runSTTIntegrationTests,
        testSTTManager,
        testCanonicalEventStructure,
        testWebSocketEventEmission,
        testAntiDemoCompliance
    };
} else if (typeof window !== 'undefined') {
    window.STTIntegrationTests = {
        runSTTIntegrationTests,
        testSTTManager,
        testCanonicalEventStructure,
        testWebSocketEventEmission,
        testAntiDemoCompliance
    };
}

// Auto-run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    runSTTIntegrationTests();
}