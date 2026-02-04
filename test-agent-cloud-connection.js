/**
 * Test Agent-Cloud Connection
 * Verifies real-time communication between agent extension and cloud backend
 */

const io = require('socket.io-client');

async function testAgentCloudConnection() {
    console.log('🧪 Testing Agent-Cloud Connection...\n');
    
// Configuration
const CLOUD_URL = process.env.CLOUD_URL || 'http://localhost:3002';
    const TEST_TIMEOUT = 15000; // 15 seconds
    
    try {
        console.log(`📡 Connecting to cloud backend: ${CLOUD_URL}`);
        
        // Connect to Socket.IO server (same as AgentGateway)
        const client = io(CLOUD_URL, {
            transports: ['websocket', 'polling'],
            timeout: 10000
        });
        
        let connectionEstablished = false;
        let sessionCreated = false;
        let eventProcessed = false;
        
        // Connection events
        client.on('connect', () => {
            console.log('✅ Socket.IO connection established');
            connectionEstablished = true;
            
            // Test session creation
            console.log('🆔 Testing session creation...');
            client.emit('session.create', {
                agent_id: 'test-agent-' + Date.now(),
                tab_url: 'https://test.com',
                tab_title: 'Test Connection'
            });
        });
        
        client.on('connect_error', (error) => {
            console.error('❌ Connection failed:', error.message);
            process.exit(1);
        });
        
        // Session creation response
        client.on('session.created', (data) => {
            console.log('✅ Session created:', data.session_id);
            sessionCreated = true;
            
            // Test brain event sending
            console.log('🧠 Testing brain event...');
            client.emit('brain_event', {
                session_id: data.session_id,
                event_type: 'text_input',
                payload: {
                    text: 'Hello from test agent',
                    confidence: 0.9,
                    provider: 'test',
                    metadata: { test: true }
                },
                ts: new Date().toISOString(),
                agent_id: 'test-agent'
            });
        });
        
        // Listen for commands from cloud
        client.on('command.' + (sessionCreated ? 'test-session' : ''), (command) => {
            console.log('✅ Command received from cloud:', command.type);
            eventProcessed = true;
        });
        
        // Listen for any message
        client.on('message', (message) => {
            console.log('📨 Message from cloud:', message.message_type || 'unknown');
            if (message.message_type === 'ack') {
                console.log('✅ Brain event acknowledged by cloud');
                eventProcessed = true;
            }
        });
        
        // Error handling
        client.on('error', (error) => {
            console.error('❌ Socket error:', error);
        });
        
        client.on('disconnect', (reason) => {
            console.log('🔌 Disconnected:', reason);
        });
        
        // Test timeout
        setTimeout(() => {
            console.log('\n📊 Test Results:');
            console.log(`Connection: ${connectionEstablished ? '✅' : '❌'}`);
            console.log(`Session Creation: ${sessionCreated ? '✅' : '❌'}`);
            console.log(`Event Processing: ${eventProcessed ? '✅' : '❌'}`);
            
            if (connectionEstablished && sessionCreated) {
                console.log('\n🎉 Agent-Cloud connection is working!');
                console.log('✅ Real runtime path established');
            } else {
                console.log('\n❌ Agent-Cloud connection has issues');
                if (!connectionEstablished) {
                    console.log('  - Cloud backend may not be running');
                    console.log('  - Check CORS and firewall settings');
                }
                if (!sessionCreated) {
                    console.log('  - AgentGateway may not be properly configured');
                    console.log('  - Check SessionService and dependencies');
                }
            }
            
            client.disconnect();
            process.exit(connectionEstablished && sessionCreated ? 0 : 1);
        }, TEST_TIMEOUT);
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run test
testAgentCloudConnection().catch(console.error);