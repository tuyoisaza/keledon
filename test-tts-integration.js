/**
 * TTS Integration Tests - Step 4 Validation
 * Tests TTS (interruptible) integration with Cloud command processing
 */

// Test TTS Manager Integration
async function testTTSManager() {
    console.log('🧪 Testing TTS Manager Integration...');
    
    try {
        // Test 1: TTS Manager Initialization
        const sessionManager = new SessionManager();
        const webSocketClient = new WebSocketClient(sessionManager);
        const ttsManager = new TTSManager(sessionManager, webSocketClient);
        
        // Mock environment for testing
        global.process = { env: { ELEVENLABS_API_KEY: 'test-key' } };
        global.crypto = { randomUUID: () => 'test-uuid-' + Math.random() };
        
        // Test initialization
        await ttsManager.initialize();
        console.log('✅ TTS Manager initialized successfully');
        
        // Test 2: Session Creation
        const session = await sessionManager.createSession();
        console.log('✅ Real session created:', session.id);
        
        // Test 3: TTS Status Tracking
        const status = ttsManager.getStatus();
        console.log('✅ TTS status:', status);
        
        if (status.provider === 'elevenlabs' && 
            status.status === 'ready' && 
            typeof status.stats === 'object') {
            console.log('✅ TTS status tracking working');
        } else {
            throw new Error('TTS status tracking failed');
        }
        
        // Test 4: Say Command Processing
        const sayCommand = {
            type: 'say',
            payload: {
                text: 'Hello world',
                interruptible: true
            }
        };
        
        const result = await ttsManager.processSayCommand(sayCommand);
        
        if (result.success) {
            console.log('✅ Say command processed successfully');
        } else {
            throw new Error('Say command processing failed');
        }
        
        console.log('🎉 TTS Manager integration tests passed!');
        return true;
        
    } catch (error) {
        console.error('❌ TTS Manager integration test failed:', error);
        return false;
    }
}

// Test TTS Providers
async function testTTSProviders() {
    console.log('🧪 Testing TTS Providers...');
    
    try {
        // Test 1: ElevenLabs Provider
        const { ElevenLabsTTS } = await import('../agent/src/core/tts/elevenlabs.js');
        const elevenLabs = new ElevenLabsTTS();
        
        await elevenLabs.initialize({ apiKey: 'test-key-elevenlabs' });
        
        const utterance = await elevenLabs.createUtterance('Test speech', {
            session_id: 'test-session',
            agent_id: 'test-agent'
        });
        
        if (utterance.id && utterance.text === 'Test speech') {
            console.log('✅ ElevenLabs provider working');
        } else {
            throw new Error('ElevenLabs provider failed');
        }
        
        // Test 2: OpenAI Provider
        const { OpenAITTS } = await import('../agent/src/core/tts/openai.js');
        const openAI = new OpenAITTS();
        
        await openAI.initialize({ apiKey: 'test-key-openai' });
        
        const utterance2 = await openAI.createUtterance('Test speech', {
            session_id: 'test-session',
            agent_id: 'test-agent'
        });
        
        if (utterance2.id && utterance2.text === 'Test speech') {
            console.log('✅ OpenAI provider working');
        } else {
            throw new Error('OpenAI provider failed');
        }
        
        console.log('🎉 TTS providers tests passed!');
        return true;
        
    } catch (error) {
        console.error('❌ TTS providers test failed:', error);
        return false;
    }
}

// Test Interruptible Speech
async function testInterruptibleSpeech() {
    console.log('🧪 Testing Interruptible Speech...');
    
    try {
        const sessionManager = new SessionManager();
        const webSocketClient = new WebSocketClient(sessionManager);
        const ttsManager = new TTSManager(sessionManager, webSocketClient);
        
        global.process = { env: { ELEVENLABS_API_KEY: 'test-key' } };
        global.crypto = { randomUUID: () => 'test-uuid-' + Math.random() };
        
        await ttsManager.initialize();
        const session = await sessionManager.createSession();
        
        // Test 1: Start speech
        const startResult = await ttsManager.speak('This is a test speech', {
            interruptible: true,
            session_id: session.id
        });
        
        if (!startResult.success) {
            throw new Error('Failed to start speech');
        }
        
        // Test 2: Interrupt speech
        await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay
        
        const interruptResult = await ttsManager.stopSpeech();
        
        if (!interruptResult.success) {
            throw new Error('Failed to interrupt speech');
        }
        
        // Test 3: Verify interruption
        const status = ttsManager.getStatus();
        
        if (status.isSpeaking === false && status.status === 'ready') {
            console.log('✅ Speech interruption working');
        } else {
            throw new Error('Speech interruption failed');
        }
        
        console.log('🎉 Interruptible speech tests passed!');
        return true;
        
    } catch (error) {
        console.error('❌ Interruptible speech test failed:', error);
        return false;
    }
}

// Test Cloud Command Integration
async function testCloudCommandIntegration() {
    console.log('🧪 Testing Cloud Command Integration...');
    
    try {
        const sessionManager = new SessionManager();
        const webSocketClient = new WebSocketClient(sessionManager);
        const ttsManager = new TTSManager(sessionManager, webSocketClient);
        
        global.process = { env: { ELEVENLABS_API_KEY: 'test-key' } };
        global.crypto = { randomUUID: () => 'test-uuid-' + Math.random() };
        
        await ttsManager.initialize();
        const session = await sessionManager.createSession();
        
        // Mock WebSocket command from cloud
        const cloudCommand = {
            type: 'say',
            payload: {
                text: 'Cloud initiated speech',
                voiceId: 'default',
                interruptible: true
            }
        };
        
        // Test command handling
        const result = ttsManager.handleCloudCommand(cloudCommand);
        
        if (result.success) {
            console.log('✅ Cloud command handling working');
        } else {
            throw new Error('Cloud command handling failed');
        }
        
        // Test invalid command
        const invalidResult = ttsManager.handleCloudCommand({
            type: 'invalid_command',
            payload: {}
        });
        
        if (!invalidResult.success && invalidResult.error.includes('Unknown TTS command')) {
            console.log('✅ Invalid command rejection working');
        } else {
            throw new Error('Invalid command rejection failed');
        }
        
        console.log('🎉 Cloud command integration tests passed!');
        return true;
        
    } catch (error) {
        console.error('❌ Cloud command integration test failed:', error);
        return false;
    }
}

// Test Anti-Demo Compliance for TTS
async function testTTSAntiDemoCompliance() {
    console.log('🧪 Testing TTS Anti-Demo Compliance...');
    
    try {
        const ttsManager = new TTSManager({}, {});
        
        // Test 1: API key validation (no hardcoded keys)
        try {
            global.process = { env: {} };
            await ttsManager.initialize();
            throw new Error('Should have failed without API key');
        } catch (error) {
            if (error.message.includes('API key is required')) {
                console.log('✅ API key validation working');
            } else {
                throw error;
            }
        }
        
        // Test 2: Empty text rejection
        const sessionManager = new SessionManager();
        global.process = { env: { ELEVENLABS_API_KEY: 'test-key' } };
        global.crypto = { randomUUID: () => 'test-uuid-' + Math.random() };
        
        await ttsManager.initialize();
        const session = await sessionManager.createSession();
        
        const emptyResult = await ttsManager.processSayCommand({
            type: 'say',
            payload: { text: '', interruptible: true }
        });
        
        if (!emptyResult.success && emptyResult.error.includes('Empty text')) {
            console.log('✅ Empty text rejection working');
        } else {
            throw new Error('Empty text rejection failed');
        }
        
        // Test 3: No demo/hardcoded responses
        const status = ttsManager.getStatus();
        
        if (status.provider && status.provider !== 'demo') {
            console.log('✅ No demo provider detected');
        } else {
            throw new Error('Demo provider detected');
        }
        
        console.log('🎉 TTS anti-demo compliance tests passed!');
        return true;
        
    } catch (error) {
        console.error('❌ TTS anti-demo compliance test failed:', error);
        return false;
    }
}

// Run All Tests
async function runTTSIntegrationTests() {
    console.log('🚀 Starting TTS Integration Tests for Step 4...\n');
    
    const tests = [
        { name: 'TTS Manager Integration', fn: testTTSManager },
        { name: 'TTS Providers', fn: testTTSProviders },
        { name: 'Interruptible Speech', fn: testInterruptibleSpeech },
        { name: 'Cloud Command Integration', fn: testCloudCommandIntegration },
        { name: 'Anti-Demo Compliance', fn: testTTSAntiDemoCompliance }
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
        console.log('🎉 ALL TESTS PASSED! Step 4 TTS integration is ready.');
        return true;
    } else {
        console.log('⚠️  Some tests failed. Please review implementation.');
        return false;
    }
}

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runTTSIntegrationTests,
        testTTSManager,
        testTTSProviders,
        testInterruptibleSpeech,
        testCloudCommandIntegration,
        testTTSAntiDemoCompliance
    };
} else if (typeof window !== 'undefined') {
    window.TTSIntegrationTests = {
        runTTSIntegrationTests,
        testTTSManager,
        testTTSProviders,
        testInterruptibleSpeech,
        testCloudCommandIntegration,
        testTTSAntiDemoCompliance
    };
}

// Auto-run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    runTTSIntegrationTests();
}