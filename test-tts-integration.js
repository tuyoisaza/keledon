/**
 * TTS Integration Test Suite
 * Tests real Text-to-Speech responses and interruptible playback
 */

// Mock WebSocket Client for testing
class MockWebSocketClient {
  constructor() {
    this.eventHandlers = new Map();
    this.isConnected = false;
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  sendBrainEvent(eventType, payload) {
    console.log(`Mock Cloud: Received brain event - ${eventType}:`, payload);
    return true;
  }

  isConnected() {
    return this.isConnected;
  }

  connect() {
    this.isConnected = true;
    this.emit('connection:established');
  }
}

// TTS Test Suite
class TTSIntegrationTest {
  constructor() {
    this.wsClient = new MockWebSocketClient();
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🔊 Starting TTS Integration Tests...\n');

    const testCases = [
      {
        name: 'Basic Speech Synthesis',
        command: {
          say: {
            text: 'Hello from KELEDON TTS system',
            interruptible: true
          },
          confidence: 0.9,
          mode: 'normal',
          flow_id: 'test-flow',
          flow_run_id: 'test-run-001'
        }
      },
      {
        name: 'Interruptible Speech',
        command: {
          say: {
            text: 'This is a longer speech that can be interrupted',
            interruptible: true
          },
          confidence: 0.85,
          mode: 'normal',
          flow_id: 'test-flow',
          flow_run_id: 'test-run-002'
        }
      },
      {
        name: 'Non-Interruptible Command',
        command: {
          say: {
            text: 'This cannot be interrupted',
            interruptible: false
          },
          confidence: 0.95,
          mode: 'safe',
          flow_id: 'test-flow',
          flow_run_id: 'test-run-003'
        }
      }
    ];

    for (const testCase of testCases) {
      await this.runTestCase(testCase);
    }

    this.runAntiDemoTests();
    this.printResults();
  }

  async runTestCase(testCase) {
    console.log(`📋 Testing: ${testCase.name}`);
    console.log(`   Command:`, JSON.stringify(testCase.command, null, 2));

    try {
      // Import TTS Manager dynamically
      const { TTSManager } = await import('./agent/src/audio/tts/tts-manager.js');
      
      // Initialize TTS Manager with mock WebSocket client
      const ttsManager = new TTSManager(this.wsClient);
      await ttsManager.initializeTTSAdapter();

      // Test speak command
      const startTime = Date.now();
      await ttsManager.handleSpeakRequest(testCase.command.say);
      const synthesisTime = Date.now() - startTime;

      // Test status
      const status = ttsManager.getStatus();
      const hasValidStatus = status.isInitialized && !status.isPaused;

      // Test interruptible functionality
      let interruptTestPassed = true;
      if (testCase.command.say.interruptible) {
        try {
          await new Promise(resolve => setTimeout(resolve, 100));
          await ttsManager.interruptCurrentSpeech();
          
          // Should not be playing after interrupt
          const postInterruptStatus = ttsManager.getStatus();
          interruptTestPassed = !postInterruptStatus.isPlaying;
        } catch (error) {
          interruptTestPassed = false;
        }
      }

      // Cleanup
      await ttsManager.cleanup();

      const passed = hasValidStatus && interruptTestPassed && synthesisTime < 5000;

      this.testResults.push({
        test: testCase.name,
        passed,
        details: {
          synthesisTime,
          status: status,
          interruptTestPassed,
          provider: status.currentProvider
        }
      });

      console.log(`   ✅ Synthesis time: ${synthesisTime}ms`);
      console.log(`   ✅ Status: ${JSON.stringify(status, null, 2)}`);
      console.log(`   ✅ Interrupt test: ${interruptTestPassed ? 'PASSED' : 'FAILED'}`);
      console.log(`   ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      this.testResults.push({
        test: testCase.name,
        passed: false,
        error: error.message
      });
      console.log(`   ❌ FAILED\n`);
    }
  }

  runAntiDemoTests() {
    console.log('🔍 Running Anti-Demo Compliance Tests...\n');

    const antiDemoTests = [
      {
        name: 'Demo Text Rejection',
        command: {
          say: {
            text: 'test TTS demo response',
            interruptible: true
          },
          confidence: 0.5,
          mode: 'normal',
          flow_id: 'test-flow',
          flow_run_id: 'test-run-demo'
        }
      },
      {
        name: 'Invalid Payload Structure',
        command: {
          say: 'invalid text format', // Should be object
          interruptible: true
        },
        confidence: 0.5,
        mode: 'normal',
        flow_id: 'test-flow',
        flow_run_id: 'test-run-invalid'
      }
    ];

    for (const test of antiDemoTests) {
      console.log(`📋 Testing: ${test.name}`);

      try {
        const { TTSManager } = await import('./agent/src/audio/tts/tts-manager.js');
        const ttsManager = new TTSManager(this.wsClient);
        await ttsManager.initializeTTSAdapter();

        await ttsManager.handleSpeakRequest(test.command.say);
        
        console.log(`   ❌ FAILED: Anti-demo violation not detected`);
        this.testResults.push({
          test: test.name,
          passed: false,
          error: 'Anti-demo violation not detected'
        });

      } catch (error) {
        if (error.message.includes('ANTI-DEMO VIOLATION')) {
          console.log(`   ✅ PASSED: Anti-demo violation detected`);
          this.testResults.push({
            test: test.name,
            passed: true
          });
        } else {
          console.log(`   ❌ FAILED: Wrong error: ${error.message}`);
          this.testResults.push({
            test: test.name,
            passed: false,
            error: error.message
          });
        }
      }
      
      console.log('');
    }
  }

  printResults() {
    console.log('📊 TTS TEST RESULTS SUMMARY');
    console.log('='.repeat(50));

    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const percentage = ((passed / total) * 100).toFixed(1);

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success Rate: ${percentage}%`);
    console.log('');

    if (passed === total) {
      console.log('🎉 ALL TTS TESTS PASSED!');
      console.log('✅ Real TTS integration working');
      console.log('✅ Interruptible speech functional');
      console.log('✅ Anti-demo compliance enforced');
      console.log('✅ Production-ready TTS system');
    } else {
      console.log('❌ SOME TTS TESTS FAILED');
      console.log('❌ Review failed tests before production deployment');
    }

    // Print failed tests details
    const failedTests = this.testResults.filter(r => !r.passed);
    if (failedTests.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      failedTests.forEach(test => {
        console.log(`   - ${test.test}: ${test.error || 'Invalid result'}`);
      });
    }
  }
}

// Run tests if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  async function main() {
    const test = new TTSIntegrationTest();
    await test.runAllTests();
  }
  main().catch(console.error);
}

export { TTSIntegrationTest };