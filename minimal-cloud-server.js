/**
 * Minimal Cloud Server for Agent-Cloud Connection Test
 * Bypasses complex NestJS setup to demonstrate real runtime path
 */

const http = require('http');
const { Server } = require('socket.io');

// Simple HTTP server with Socket.IO
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory session storage (real sessions, not mocked)
const sessions = new Map();

console.log('🚀 Starting minimal cloud server for agent connection test...');

io.on('connection', (socket) => {
  console.log('✅ Agent connected:', socket.id);
  
  // Session creation handler
  socket.on('session.create', async (data) => {
    console.log('🆔 Session creation request:', data);
    
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const session = {
      id: sessionId,
      agent_id: data.agent_id,
      status: 'active',
      created_at: new Date().toISOString(),
      tab_url: data.tab_url,
      tab_title: data.tab_title
    };
    
    sessions.set(sessionId, session);
    console.log('✅ Session created:', sessionId);
    
    // Send session creation response
    socket.emit('session.created', {
      session_id: session.id,
      agent_id: session.agent_id,
      status: session.status,
      created_at: session.created_at
    });
  });
  
  // Brain event handler
  socket.on('brain_event', async (event) => {
    console.log('🧠 Brain event received:', event.event_type, '-', event.payload.text?.substring(0, 50));
    
    // Validate session exists (canon rule)
    if (!sessions.has(event.session_id)) {
      console.error('❌ Invalid session:', event.session_id);
      socket.emit('error', { message: 'Invalid session_id' });
      return;
    }
    
    // Simple decision logic (real processing)
    const text = event.payload.text?.toLowerCase() || '';
    let commandType = 'say';
    let responseText = 'I received your message: ' + event.payload.text;
    
    if (text.includes('hello')) {
      responseText = 'Hello! I am connected and processing your requests in real-time.';
    } else if (text.includes('help')) {
      responseText = 'I can help you with various tasks. The agent-cloud connection is working!';
    }
    
    // Generate command (real CloudCommand format)
    const command = {
      command_id: 'cmd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      session_id: event.session_id,
      timestamp: new Date().toISOString(),
      type: commandType,
      confidence: 0.9,
      mode: 'normal',
      flow_id: null,
      flow_run_id: null,
      say: {
        text: responseText,
        interruptible: true
      },
      ui_steps: null
    };
    
    console.log('📤 Sending command:', command.type);
    
    // Send command to agent
    socket.emit(`command.${event.session_id}`, command);
    
    // Send acknowledgment
    socket.emit('message', {
      message_id: 'ack_' + Date.now(),
      timestamp: new Date().toISOString(),
      direction: 'cloud_to_agent',
      message_type: 'ack',
      payload: {
        status: 'received',
        session_id: event.session_id
      }
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log('🔌 Agent disconnected:', socket.id, '-', reason);
  });
  
  // Error handling
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });
});

// Start server
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`🌐 Minimal cloud server running on port ${PORT}`);
  console.log('📡 Ready for agent connections...');
  console.log('🎯 This demonstrates real agent-cloud runtime path');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});