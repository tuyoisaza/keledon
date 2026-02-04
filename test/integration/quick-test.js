/**
 * Quick Integration Test - End-to-End Verification
 * Simple test for verifying KELEDON runtime pipeline
 */

import { IntegrationTestSuite } from './integration-test-suite.js';

// Quick test configuration
const config = {
  test_websocket_url: 'ws://localhost:3001/agent',
  test_session_name: 'Quick Integration Test',
  connection_timeout_ms: 5000,
  session_timeout_ms: 10000,
  text_input_timeout_ms: 5000,
  command_timeout_ms: 5000,
  simulate_audio: true,
  skip_permissions_test: true,
  test_phrases: ['Hello KELEDON', 'Test integration']
};

async function runQuickIntegrationTest() {
  console.log('🧪 Starting KELEDON Quick Integration Test');
  
  const testSuite = new IntegrationTestSuite(config);
  
  // Setup event listeners
  testSuite.on('suite_started', () => {
    console.log('🚀 Test suite started');
  });

  testSuite.on('test_started', (data) => {
    console.log(`📋 Running test: ${data.test}`);
  });

  testSuite.on('test_passed', (data) => {
    console.log(`✅ Test passed: ${data.test}`);
  });

  testSuite.on('test_failed', (data) => {
    console.log(`❌ Test failed: ${data.test} - ${data.error}`);
  });

  testSuite.on('suite_completed', (results) => {
    console.log('🏁 Test suite completed');
    console.log('📊 Summary:', results.summary);
    
    // Exit with appropriate code
    process.exit(results.summary.all_passed ? 0 : 1);
  });

  testSuite.on('suite_error', (error) => {
    console.log('💥 Test suite error:', error.error);
    process.exit(1);
  });

  try {
    // Run the test suite
    const results = await testSuite.runFullSuite();
    
    // This shouldn't be reached due to event handlers, but just in case
    console.log('📊 Final Results:', results.summary);
    process.exit(results.summary.all_passed ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Run the test
runQuickIntegrationTest();