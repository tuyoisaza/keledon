#!/usr/bin/env node

/**
 * Minimal test server for KELEDON-P3-CAPABILITY-002
 * Tests side panel truthful connectivity and roundtrip messaging
 */

const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const PORT = process.env.PORT || 3001;
console.log(`🧪 KELEDON Test Server starting on port ${PORT}`);

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: ['chrome-extension://*', 'moz-extension://*', 'http://localhost:*'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Agent namespace
io.of('/agent').on('connection', (socket) => {
  console.log(`🔗 Agent connected: ${socket.id}`);
  
  // Send connection acknowledgment
  socket.emit('connected', {
    agent_id: socket.id,
    timestamp: new Date().toISOString(),
    status: 'connected'
  });

  // Handle test connection messages from side panel
  socket.on('test_connection', (data) => {
    console.log(`📨 Test connection received:`, data);
    
    // Echo back the test message to prove roundtrip
    socket.emit('test_connection_response', {
      type: 'test_connection_response',
      sessionId: data.sessionId,
      timestamp: new Date().toISOString(),
      payload: {
        message: 'Cloud response: Connection test successful',
        originalTimestamp: data.timestamp,
        roundtripTime: Date.now() - data.timestamp,
        cloudServer: 'test-server',
        agentVersion: data.payload?.agentVersion || 'unknown'
      }
    });
  });

  // Handle other events
  socket.on('brain_event', (data) => {
    console.log(`🧠 Brain event received:`, data);
  });

  socket.on('event', (data) => {
    console.log(`📡 Event received:`, data);
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌 Agent disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// Listen namespace (for compatibility with existing agent code)
io.of('/listen').on('connection', (socket) => {
  console.log(`👂 Listen client connected: ${socket.id}`);
  
  socket.on('connect', () => {
    console.log('Listen socket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌 Listen client disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`🌐 Agent namespace: /agent`);
  console.log(`👂 Listen namespace: /listen`);
  console.log(`🔗 Ready for side panel connection tests`);
});

// Handle server errors
httpServer.on('error', (error) => {
  console.error('❌ Server error:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});