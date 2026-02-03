/**
 * Simple WebSocket Test Server
 * For testing Issue #2 Agent ↔ Cloud connection
 * Implements canonical message contracts
 */

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

const httpServer = createServer();
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ['chrome-extension://*', 'http://localhost:3000', 'http://localhost:5173'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

console.log('🚀 Simple WebSocket Test Server starting...');

// Handle connections
io.on('connection', (socket) => {
  console.log(`✅ Agent connected: ${socket.id}`);
  
  // Send initial acknowledgment
  socket.emit('message', {
    message_id: generateUUID(),
    timestamp: new Date().toISOString(),
    direction: 'cloud_to_agent',
    message_type: 'ack',
    payload: {
      ack_message_id: 'connection',
      status: 'received'
    }
  });

  // Handle canonical messages from agent
  socket.on('message', (message) => {
    console.log(`📨 Received message from ${socket.id}:`, message.message_type);
    
    try {
      // Validate canonical message structure
      if (!validateCanonicalMessage(message)) {
        console.error('❌ Invalid canonical message:', message);
        socket.emit('message', {
          message_id: generateUUID(),
          timestamp: new Date().toISOString(),
          direction: 'cloud_to_agent',
          message_type: 'error',
          payload: {
            code: 'protocol_error',
            message: 'Invalid canonical message structure'
          }
        });
        return;
      }

      switch (message.message_type) {
        case 'brain_event':
          handleBrainEvent(socket, message);
          break;
        case 'heartbeat':
          handleHeartbeat(socket, message);
          break;
        default:
          console.warn(`⚠️ Unknown message type: ${message.message_type}`);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
      socket.emit('message', {
        message_id: generateUUID(),
        timestamp: new Date().toISOString(),
        direction: 'cloud_to_agent',
        message_type: 'error',
        payload: {
          code: 'processing_error',
          message: 'Failed to process message'
        }
      });
    }
  });

  // Handle session creation requests
  socket.on('session.create', (data) => {
    console.log('🆕 Session creation request:', data);
    
    const sessionId = `ses_${generateUUID().split('-')[0]}`;
    
    socket.emit('session.created', {
      session_id: sessionId,
      agent_id: data.agent_id,
      status: 'active',
      created_at: new Date().toISOString()
    });
    
    console.log(`✅ Session created: ${sessionId}`);
  });

  // Handle disconnections
  socket.on('disconnect', (reason) => {
    console.log(`❌ Agent disconnected: ${socket.id}, reason: ${reason}`);
  });
});

// Handle brain events from agent
function handleBrainEvent(socket, message) {
  const brainEvent = message.payload;
  console.log(`🧠 Brain event: ${brainEvent.event_type}`, brainEvent.payload);
  
  // Send acknowledgment
  socket.emit('message', {
    message_id: generateUUID(),
    timestamp: new Date().toISOString(),
    direction: 'cloud_to_agent',
    message_type: 'ack',
    payload: {
      ack_message_id: message.message_id,
      status: 'received'
    }
  });

  // For testing, echo back a simple command for text_input events
  if (brainEvent.event_type === 'text_input') {
    setTimeout(() => {
      socket.emit('message', {
        message_id: generateUUID(),
        timestamp: new Date().toISOString(),
        direction: 'cloud_to_agent',
        message_type: 'brain_command',
        session_id: brainEvent.session_id,
        payload: {
          say: {
            text: `Echo: ${brainEvent.payload.text}`,
            interruptible: true
          },
          ui_steps: [],
          confidence: 0.8,
          mode: 'normal',
          flow_id: 'test_flow',
          flow_run_id: `run_${generateUUID().split('-')[0]}`
        }
      });
    }, 1000);
  }
}

// Handle heartbeat messages
function handleHeartbeat(socket, message) {
  console.log(`💓 Heartbeat from ${socket.id}:`, message.payload.status);
  
  // Respond with heartbeat
  socket.emit('message', {
    message_id: generateUUID(),
    timestamp: new Date().toISOString(),
    direction: 'cloud_to_agent',
    message_type: 'heartbeat',
    payload: {
      status: 'alive',
      uptime_ms: Date.now()
    }
  });
}

// Validate canonical message structure
function validateCanonicalMessage(message) {
  const required = ['message_id', 'timestamp', 'direction', 'message_type', 'payload'];
  for (const field of required) {
    if (!message[field]) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }
  
  if (!['agent_to_cloud', 'cloud_to_agent'].includes(message.direction)) {
    console.error(`Invalid direction: ${message.direction}`);
    return false;
  }
  
  const validTypes = ['brain_event', 'brain_command', 'heartbeat', 'error', 'ack'];
  if (!validTypes.includes(message.message_type)) {
    console.error(`Invalid message_type: ${message.message_type}`);
    return false;
  }
  
  return true;
}

// Generate UUID
function generateUUID() {
  return crypto.randomUUID();
}

// Start server
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🌐 WebSocket Test Server running on port ${PORT}`);
  console.log(`📡 Ready to accept agent connections`);
  console.log(`🔗 Test URL: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});