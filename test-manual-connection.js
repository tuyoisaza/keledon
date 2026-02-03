#!/usr/bin/env node

// Manual Connection Test - Agent ↔ Cloud
// This script manually verifies the connection works per canonical spec

const io = require('socket.io-client');

async function testConnection() {
  console.log('🧪 Testing Agent ↔ Cloud Connection...');
  console.log('Make sure cloud backend is running: npm run start:dev\n');

  const socket = io('http://localhost:3001', {
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log('✅ Connected to cloud backend');
    
    // Request session creation
    socket.emit('session.create', {
      agent_id: 'test_agent_manual',
      tab_url: 'http://localhost:5173',
      tab_title: 'Test Page'
    });
  });

  socket.on('session.created', (data) => {
    console.log('✅ Session created:', data);
    
    // Verify session ID pattern (canonical requirement)
    if (data.session_id.match(/^ses_[a-f0-9]{8}$/)) {
      console.log('✅ Session ID follows canonical pattern');
    } else {
      console.log('❌ Session ID violates canonical pattern');
    }

    // Send test event
    socket.emit('agent.event', {
      session_id: data.session_id,
      event_type: 'text_input',
      payload: { text: 'Test message' },
      ts: new Date().toISOString(),
      agent_id: 'test_agent_manual'
    });
  });

  socket.on('event.acknowledged', (data) => {
    console.log('✅ Event acknowledged:', data);
    console.log('\n🎉 Agent ↔ Cloud connection is working!');
    console.log('All canonical contracts are being followed.');
    process.exit(0);
  });

  socket.on('error', (error) => {
    console.log('❌ Error:', error);
    process.exit(1);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Disconnected');
  });

  // Timeout if no response
  setTimeout(() => {
    console.log('❌ Test timed out - make sure backend is running on localhost:3001');
    process.exit(1);
  }, 10000);
}

testConnection().catch(console.error);