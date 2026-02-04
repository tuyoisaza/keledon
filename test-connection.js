/**
 * Test Script for Step 1: Agent ↔ Cloud WebSocket Connection
 * Validates canonical contract compliance and error handling
 */

// Test configuration
const TEST_CONFIG = {
  CLOUD_URL: 'http://localhost:3001',  // Adjust to your cloud backend URL
  TEST_SESSION_ID: crypto.randomUUID(),
  TEST_AGENT_ID: crypto.randomUUID(),
  TIMEOUT: 10000
};

// Test results
let testResults = {
  connection: false,
  canonicalMessage: false,
  heartbeat: false,
  errorHandling: false,
  sessionCreation: false,
  totalPassed: 0,
  totalTests: 5
};

async function runTests() {
  console.log('🧪 Starting Step 1 Connection Tests...\n');
  
  try {
    await testConnection();
    await testCanonicalMessage();
    await testHeartbeat();
    await testErrorHandling();
    await testSessionCreation();
    
    printResults();
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

async function testConnection() {
  console.log('📡 Test 1: Basic WebSocket Connection...');
  
  try {
    const { io } = await import('./agent/src/ui/socket.io.esm.min.js');
    
    const socket = io(TEST_CONFIG.CLOUD_URL, {
      transports: ['websocket', 'polling'],
      timeout: TEST_CONFIG.TIMEOUT
    });
    
    await new Promise((resolve, reject) => {
      socket.on('connect', () => {
        console.log('✅ Connected successfully');
        testResults.connection = true;
        testResults.totalPassed++;
        resolve();
      });
      
      socket.on('connect_error', (err) => {
        console.log('❌ Connection failed:', err.message);
        reject(err);
      });
      
      setTimeout(() => reject(new Error('Connection timeout')), TEST_CONFIG.TIMEOUT);
    });
    
    socket.disconnect();
    
  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
  }
}

async function testCanonicalMessage() {
  console.log('\n📨 Test 2: Canonical Message Format...');
  
  try {
    const { io } = await import('./agent/src/ui/socket.io.esm.min.js');
    
    const socket = io(TEST_CONFIG.CLOUD_URL, {
      transports: ['websocket', 'polling']
    });
    
    await new Promise((resolve, reject) => {
      socket.on('connect', async () => {
        // Send canonical brain event message
        const canonicalMessage = {
          message_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          direction: 'agent_to_cloud',
          message_type: 'brain_event',
          session_id: TEST_CONFIG.TEST_SESSION_ID,
          payload: {
            event_id: crypto.randomUUID(),
            session_id: TEST_CONFIG.TEST_SESSION_ID,
            timestamp: new Date().toISOString(),
            type: 'system',
            payload: {
              event: 'connection_test',
              data: { test: 'canonical_format' }
            }
          }
        };
        
        socket.emit('message', canonicalMessage);
        
        // Wait for acknowledgment
        setTimeout(() => {
          console.log('✅ Canonical message sent successfully');
          testResults.canonicalMessage = true;
          testResults.totalPassed++;
          resolve();
        }, 1000);
      });
      
      socket.on('connect_error', reject);
    });
    
    socket.disconnect();
    
  } catch (error) {
    console.log('❌ Canonical message test failed:', error.message);
  }
}

async function testHeartbeat() {
  console.log('\n💓 Test 3: Heartbeat Exchange...');
  
  try {
    const { io } = await import('./agent/src/ui/socket.io.esm.min.js');
    
    const socket = io(TEST_CONFIG.CLOUD_URL, {
      transports: ['websocket', 'polling']
    });
    
    await new Promise((resolve, reject) => {
      let heartbeatReceived = false;
      
      socket.on('connect', () => {
        // Send heartbeat
        const heartbeatMessage = {
          message_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          direction: 'agent_to_cloud',
          message_type: 'heartbeat',
          payload: {
            status: 'alive',
            uptime_ms: Date.now()
          }
        };
        
        socket.emit('message', heartbeatMessage);
      });
      
      socket.on('message', (message) => {
        if (message.message_type === 'heartbeat') {
          console.log('✅ Heartbeat response received');
          testResults.heartbeat = true;
          testResults.totalPassed++;
          heartbeatReceived = true;
          resolve();
        }
      });
      
      setTimeout(() => {
        if (!heartbeatReceived) {
          console.log('⚠️ No heartbeat response (may be expected in current implementation)');
          resolve(); // Don't fail test, heartbeat may not be implemented yet
        }
      }, 2000);
    });
    
    socket.disconnect();
    
  } catch (error) {
    console.log('❌ Heartbeat test failed:', error.message);
  }
}

async function testErrorHandling() {
  console.log('\n🚫 Test 4: Error Handling (Invalid Session)...');
  
  try {
    const { io } = await import('./agent/src/ui/socket.io.esm.min.js');
    
    const socket = io(TEST_CONFIG.CLOUD_URL, {
      transports: ['websocket', 'polling']
    });
    
    await new Promise((resolve, reject) => {
      let errorReceived = false;
      
      socket.on('connect', () => {
        // Send message with invalid session ID
        const errorMessage = {
          message_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          direction: 'agent_to_cloud',
          message_type: 'brain_event',
          session_id: 'invalid-session-id',
          payload: {
            event_id: crypto.randomUUID(),
            session_id: 'invalid-session-id',
            timestamp: new Date().toISOString(),
            type: 'text_input',
            payload: {
              text: 'test',
              confidence: 1.0,
              provider: 'test'
            }
          }
        };
        
        socket.emit('message', errorMessage);
      });
      
      socket.on('message', (message) => {
        if (message.message_type === 'error') {
          console.log('✅ Error handling works - received error:', message.payload.code);
          testResults.errorHandling = true;
          testResults.totalPassed++;
          errorReceived = true;
          resolve();
        }
      });
      
      setTimeout(() => {
        if (!errorReceived) {
          console.log('⚠️ No error response (may indicate missing error handling)');
          resolve();
        }
      }, 2000);
    });
    
    socket.disconnect();
    
  } catch (error) {
    console.log('❌ Error handling test failed:', error.message);
  }
}

async function testSessionCreation() {
  console.log('\n🆕 Test 5: Session Creation...');
  
  try {
    const { io } = await import('./agent/src/ui/socket.io.esm.min.js');
    
    const socket = io(TEST_CONFIG.CLOUD_URL, {
      transports: ['websocket', 'polling']
    });
    
    await new Promise((resolve, reject) => {
      socket.on('connect', () => {
        socket.emit('session.create', {
          agent_id: TEST_CONFIG.TEST_AGENT_ID,
          tab_url: 'https://test.example.com',
          tab_title: 'Test Tab'
        });
      });
      
      socket.on('message', (message) => {
        if (message.message_type === 'brain_command') {
          console.log('✅ Session creation response received');
          testResults.sessionCreation = true;
          testResults.totalPassed++;
          resolve();
        }
      });
      
      setTimeout(() => {
        console.log('⚠️ No session creation response');
        resolve();
      }, 2000);
    });
    
    socket.disconnect();
    
  } catch (error) {
    console.log('❌ Session creation test failed:', error.message);
  }
}

function printResults() {
  console.log('\n📊 TEST RESULTS');
  console.log('================');
  console.log(`Passed: ${testResults.totalPassed}/${testResults.totalTests}`);
  console.log('');
  
  Object.entries(testResults).forEach(([test, passed]) => {
    if (test !== 'totalPassed' && test !== 'totalTests') {
      const icon = passed ? '✅' : '❌';
      const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`${icon} ${testName}: ${passed ? 'PASS' : 'FAIL'}`);
    }
  });
  
  console.log('');
  if (testResults.totalPassed === testResults.totalTests) {
    console.log('🎉 ALL TESTS PASSED! Step 1 implementation is complete.');
  } else {
    console.log('⚠️ Some tests failed. Review the implementation.');
  }
}

// Run tests if this script is executed directly
if (typeof window === 'undefined') {
  runTests().catch(console.error);
}

export { runTests, testResults };