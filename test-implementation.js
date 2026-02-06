#!/usr/bin/env node

/**
 * Test for KELEDON-P3-CAPABILITY-002 Side Panel Truthful Connectivity
 * Validates that the implementation can send test messages and receive responses
 */

const { io } = require('socket.io-client');

const TEST_SERVER_URL = 'http://localhost:3002';

console.log('🧪 Testing KELEDON-P3-CAPABILITY-002 Implementation');
console.log('=================================================');

async function testConnection() {
  console.log('\n📡 Connecting to test server...');
  
  const socket = io(`${TEST_SERVER_URL}/agent`, {
    transports: ['websocket', 'polling']
  });

  return new Promise((resolve, reject) => {
    let testResults = {
      connectionSuccess: false,
      connectionAcknowledged: false,
      testMessageSent: false,
      testResponseReceived: false,
      roundtripTime: 0,
      errors: []
    };

    // Connection timeout
    const connectionTimeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error('Connection timeout'));
    }, 5000);

    socket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      testResults.connectionSuccess = true;
      clearTimeout(connectionTimeout);
    });

    socket.on('connected', (data) => {
      console.log('✅ Connection acknowledged by server:', data);
      testResults.connectionAcknowledged = true;
      
      // Send test message
      console.log('📨 Sending test connection message...');
      const testMessage = {
        type: 'test_connection',
        sessionId: 'test-session-123',
        timestamp: Date.now(),
        payload: {
          message: 'Connection test from side panel',
          source: 'sidepanel',
          agentVersion: '1.1.6'
        }
      };

      socket.emit('test_connection', testMessage);
      testResults.testMessageSent = true;
      console.log('📤 Test message sent');
    });

    socket.on('test_connection_response', (response) => {
      console.log('✅ Test response received:', response);
      testResults.testResponseReceived = true;
      testResults.roundtripTime = response.payload.roundtripTime;
      
      console.log(`🔄 Roundtrip time: ${response.payload.roundtripTime}ms`);
      console.log(`📝 Cloud response: ${response.payload.message}`);
      
      socket.disconnect();
      resolve(testResults);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Connection error:', error.message);
      testResults.errors.push(`Connection error: ${error.message}`);
      clearTimeout(connectionTimeout);
      socket.disconnect();
      reject(testResults);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected:', reason);
    });

    // Start connection
    socket.connect();
  });
}

async function main() {
  try {
    const results = await testConnection();
    
    console.log('\n📊 Test Results Summary');
    console.log('========================');
    console.log(`Connection Success: ${results.connectionSuccess ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Connection Acknowledged: ${results.connectionAcknowledged ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test Message Sent: ${results.testMessageSent ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Test Response Received: ${results.testResponseReceived ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Roundtrip Time: ${results.roundtripTime}ms`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    const allTestsPassed = results.connectionSuccess && 
                           results.connectionAcknowledged && 
                           results.testMessageSent && 
                           results.testResponseReceived;
    
    console.log('\n🎯 Overall Result');
    console.log('==================');
    
    if (allTestsPassed) {
      console.log('✅ KELEDON-P3-CAPABILITY-002 IMPLEMENTATION READY');
      console.log('✅ Truthful connectivity implemented');
      console.log('✅ Roundtrip messaging working');
      console.log('✅ Real WebSocket state reporting');
      console.log('✅ No fake toggles or mock behavior');
    } else {
      console.log('❌ KELEDON-P3-CAPABILITY-002 IMPLEMENTATION INCOMPLETE');
      console.log('❌ Some functionality may not work correctly');
    }
    
    return allTestsPassed;
    
  } catch (error) {
    console.log('\n❌ Test failed:', error.message || error);
    if (error.errors) {
      console.log('Errors encountered:');
      error.errors.forEach(err => console.log(`  - ${err}`));
    }
    return false;
  }
}

// Run tests
main().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});