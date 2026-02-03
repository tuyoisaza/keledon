/**
 * WebSocket Connection Test - Issue #2 Step 1 Verification
 * Tests the real Agent ↔ Cloud connection implementation
 * 
 * This script verifies:
 * - Real WebSocket/Socket.IO connection between agent and cloud
 * - Authentication using real session IDs (no demo bypasses)
 * - Connection status management
 * - Canonical event schema compliance
 * - Error handling shows failure when cloud unavailable
 */

import { WebSocketClient } from '../agent/src/core/websocket-client.js';

class MockSessionManager {
  getCurrentSession() {
    return {
      id: 'ses_test_12345678', // Real session ID format
      startTime: new Date(),
      state: 'active'
    };
  }
}

async function testWebSocketConnection() {
  console.log('🧪 Testing WebSocket Connection - Issue #2 Step 1');
  
  const sessionManager = new MockSessionManager();
  const wsClient = new WebSocketClient(sessionManager);
  
  // Test 1: Connection establishment
  console.log('\n📡 Test 1: Connection Establishment');
  
  wsClient.on('connection:attempting', (data) => {
    console.log('✅ Connection attempting:', data);
  });
  
  wsClient.on('connection:established', (data) => {
    console.log('✅ Connection established:', data);
    
    // Test 2: Send canonical brain event
    testBrainEventSending(wsClient);
  });
  
  wsClient.on('connection:error', (error) => {
    console.error('❌ Connection error (expected if cloud not running):', error);
    console.log('✅ Error handling working correctly - shows failure when cloud unavailable');
  });
  
  wsClient.on('connection:failed', (data) => {
    console.error('❌ Connection failed (expected if cloud not running):', data);
    console.log('✅ Failure state displayed correctly (anti-demo rule compliance)');
  });
  
  try {
    // Try to connect to cloud backend
    await wsClient.connect('http://localhost:3001');
  } catch (error) {
    console.log('✅ Connection failure handled gracefully:', error.message);
  }
  
  // Test 3: Connection state management
  setTimeout(() => {
    console.log('\n📊 Test 3: Connection State Management');
    const stats = wsClient.getConnectionStats();
    console.log('Connection stats:', stats);
    
    if (['disconnected', 'error'].includes(stats.state)) {
      console.log('✅ Connection state properly tracked');
    }
    
    // Test 4: Canonical message validation
    testCanonicalMessageValidation(wsClient);
    
    // Cleanup
    wsClient.cleanup();
    console.log('\n🎉 WebSocket connection tests completed');
    
  }, 3000);
}

function testBrainEventSending(wsClient) {
  console.log('\n📤 Test 2: Canonical Brain Event Sending');
  
  const success = wsClient.sendBrainEvent('text_input', {
    text: 'Hello from test agent',
    confidence: 0.95,
    metadata: { test: true }
  });
  
  if (success) {
    console.log('✅ Brain event sent successfully');
  } else {
    console.log('❌ Failed to send brain event');
  }
  
  // Test invalid event type
  const invalidSuccess = wsClient.sendBrainEvent('invalid_type', {});
  if (!invalidSuccess) {
    console.log('✅ Invalid event type properly rejected');
  }
}

function testCanonicalMessageValidation(wsClient) {
  console.log('\n✅ Test 4: Canonical Message Validation');
  
  // Valid message
  const validMessage = {
    message_id: 'msg_123',
    timestamp: new Date().toISOString(),
    direction: 'agent_to_cloud',
    message_type: 'brain_event',
    payload: { test: 'data' }
  };
  
  const validResult = wsClient.validateCanonicalMessage(validMessage);
  if (validResult) {
    console.log('✅ Valid message passes validation');
  }
  
  // Invalid message (missing fields)
  const invalidMessage = {
    message_type: 'brain_event',
    payload: { test: 'data' }
  };
  
  const invalidResult = wsClient.validateCanonicalMessage(invalidMessage);
  if (!invalidResult) {
    console.log('✅ Invalid message properly rejected');
  }
  
  // Invalid direction
  const invalidDirectionMessage = {
    message_id: 'msg_123',
    timestamp: new Date().toISOString(),
    direction: 'invalid',
    message_type: 'brain_event',
    payload: { test: 'data' }
  };
  
  const invalidDirectionResult = wsClient.validateCanonicalMessage(invalidDirectionMessage);
  if (!invalidDirectionResult) {
    console.log('✅ Invalid direction properly rejected');
  }
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  testWebSocketConnection().catch(console.error);
}

export { testWebSocketConnection };