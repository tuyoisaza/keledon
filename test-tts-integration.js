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
        
        // Start speech
        const startResult = await ttsManager.speak('This is a test speech', {
            interruptible: true,
            session_id: session.id
        });
        
        if (!startResult.success) {
            throw new Error('Failed to start speech');
        }
        
        // Interrupt speech
        await new Promise(resolve => setTimeout(resolve, 100));
        const interruptResult = await ttsManager.stopSpeech();
        
        if (!interruptResult.success) {
            throw new Error('Failed to interrupt speech');
        }
        
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

// Run All Tests
async function runTTSIntegrationTests() {
    console.log('🚀 Starting TTS Integration Tests for Step 4...\n');
    
    const tests = [
        { name: 'TTS Manager Integration', fn: testTTSManager },
        { name: 'TTS Providers', fn: testTTSProviders },
        { name: 'Interruptible Speech', fn: testInterruptibleSpeech }
    ];
    
    let passedTests = 0;
    
    for (const test of tests) {
        console.log(`\n📋 Running: ${test.name}`);
        const result = await test.fn();
        if (result) passedTests++;
    }
    
    console.log(`\n📊 Test Results: ${passedTests}/${tests.length} tests passed`);
    return passedTests === tests.length;
}

// Auto-run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    runTTSIntegrationTests();
}
