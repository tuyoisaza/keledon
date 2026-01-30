const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["chrome-extension://*", "http://localhost:5173"],
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Basic routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ user: { id: 'test-user', name: 'Test User' } });
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log('Chrome extension connected:', socket.id);

  // Handle extension registration
  socket.on('register-extension', (data) => {
    console.log('Extension registered:', data);
    socket.emit('registered', { status: 'success', socketId: socket.id });
  });

  // Handle audio chunks
  socket.on('AUDIO_CHUNK', (data) => {
    console.log('Received audio chunk:', data.length);
    // Echo back for testing
    socket.emit('AUDIO_PROCESSING', { status: 'processing', chunkSize: data.length });
  });

  // Handle TTS requests
  socket.on('speak-request', (data) => {
    console.log('TTS request:', data);
    // Mock TTS response
    setTimeout(() => {
      socket.emit('EVENT_PLAY_AUDIO', { 
        audioData: 'mock-audio-data', 
        text: data.text,
        provider: 'mock-tts'
      });
    }, 1000);
  });

  // Handle RPA requests
  socket.on('rpa-execute', (data) => {
    console.log('RPA request:', data);
    // Mock RPA execution
    setTimeout(() => {
      socket.emit('EVENT_FLOW_RESULT', { 
        success: true, 
        steps: data.steps,
        result: 'Mock RPA execution completed'
      });
    }, 2000);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Chrome extension disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`KELEDON Mock Backend running on port ${PORT}`);
  console.log(`WebSocket server ready for Chrome extension connections`);
  console.log(`CORS enabled for chrome-extension://*`);
});