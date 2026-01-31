const http = require('http');
const url = require('url');

// Simple HTTP server without external dependencies
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  console.log(`${req.method} ${path}`);
  
  // Health check
  if (path === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString() 
    }));
    return;
  }
  
  // Auth endpoint
  if (path === '/api/auth/me' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      user: { id: 'test-user', name: 'Test User' } 
    }));
    return;
  }
  
  // TTS endpoint
  if (path === '/tts/qwen3-tts' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('TTS Request:', data.text);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          audioData: 'mock-audio-data',
          text: data.text,
          provider: 'mock-tts',
          duration: 2.5
        }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  
  // STT endpoint
  if (path === '/stt/whisper' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      console.log('STT Request: Received audio data, length:', body.length);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        transcript: 'This is a mock transcription of the audio data',
        confidence: 0.95,
        provider: 'mock-whisper'
      }));
    });
    return;
  }
  
  // RPA endpoint
  if (path === '/rpa/playwright' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('RPA Request:', data.url);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          url: data.url,
          steps: data.steps,
          result: 'Mock RPA execution completed successfully',
          duration: 3.2,
          screenshots: ['screenshot1.png', 'screenshot2.png']
        }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  
  // RAG retrieve endpoint
  if (path === '/rag/retrieve' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('RAG Query:', data.query);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          query: data.query,
          sessionId: data.sessionId,
          companyId: data.companyId,
          results: [
            {
              id: 'doc1',
              content: 'KELEDON is an AI-powered browser automation platform that helps users automate repetitive tasks.',
              score: 0.95,
              metadata: { source: 'documentation', timestamp: new Date().toISOString() }
            },
            {
              id: 'doc2', 
              content: 'The platform supports voice commands, web scraping, and intelligent workflow execution.',
              score: 0.87,
              metadata: { source: 'features', timestamp: new Date().toISOString() }
            }
          ],
          response: 'KELEDON is an AI-powered browser automation platform that enables users to automate tasks through voice commands and intelligent workflows.'
        }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  
  // RAG evaluate endpoint
  if (path === '/rag/evaluate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log('RAG Feedback:', data.response);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          sessionId: data.sessionId,
          feedback: 'Feedback recorded successfully',
          analysis: {
            sentiment: 'positive',
            helpfulness: 0.9,
            improvement: 'Consider adding more examples'
          }
        }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  
  // Default response
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    error: 'Not Found',
    path: path,
    method: req.method
  }));
});

// WebSocket upgrade handling (basic)
server.on('upgrade', (request, socket, head) => {
  console.log('WebSocket upgrade request for:', request.url);
  
  // Simple WebSocket-like response
  socket.write('HTTP/1.1 101 Switching Protocols\r\n');
  socket.write('Upgrade: websocket\r\n');
  socket.write('Connection: Upgrade\r\n');
  socket.write('\r\n');
  
  // Send mock connection success
  setTimeout(() => {
    socket.write(JSON.stringify({
      type: 'connect',
      data: { status: 'connected', id: 'mock-websocket-id' }
    }));
  }, 100);
  
  socket.on('data', (data) => {
    console.log('WebSocket data received:', data.toString());
    
    // Echo back with success response
    setTimeout(() => {
      socket.write(JSON.stringify({
        type: 'response',
        data: { status: 'processed', result: 'Mock WebSocket response' }
      }));
    }, 500);
  });
  
  socket.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 KELEDON Mock Backend running on port ${PORT}`);
  console.log(`📡 HTTP server ready for API requests`);
  console.log(`🔌 WebSocket upgrade handling enabled`);
  console.log(`🌐 Accessible at: http://localhost:${PORT}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /tts/qwen3-tts - Text-to-Speech`);
  console.log(`   POST /stt/whisper - Speech-to-Text`);
  console.log(`   POST /rpa/playwright - RPA execution`);
  console.log(`   POST /rag/retrieve - RAG retrieval`);
  console.log(`   POST /rag/evaluate - RAG feedback`);
  console.log(`   WS   /listen/ws - WebSocket connection`);
  console.log(`\n🧪 Ready for test harness testing!`);
});