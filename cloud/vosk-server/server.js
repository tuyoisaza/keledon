const http = require('http');
const { WebSocketServer } = require('ws');
const express = require('express');
const cors = require('cors');

const HTTP_PORT = process.env.VOSK_PORT || 9090;
const WS_PORT = parseInt(process.env.VOSK_WS_PORT || '9091');
const MODEL_PATH = process.env.VOSK_MODEL_PATH || '/app/models/vosk-model-small-en-us-0.15';

console.log('[VOSK] Starting KELEDON STT Server (Mock Mode for MVP)');
console.log('[VOSK] HTTP Port:', HTTP_PORT);
console.log('[VOSK] WebSocket Port:', WS_PORT);
console.log('[VOSK] Model Path:', MODEL_PATH);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/health', (req, res) => {
  res.json({
    status: 'ready',
    mode: 'mock-stt',
    model: MODEL_PATH,
    timestamp: new Date().toISOString()
  });
});

app.get('/status', (req, res) => {
  res.json({
    state: 'READY',
    model: MODEL_PATH,
    samplerate: 16000
  });
});

const server = http.createServer(app);

const wss = new WebSocketServer({ port: WS_PORT });
console.log(`[VOSK] WebSocket server on port ${WS_PORT}`);

wss.on('connection', (ws) => {
  console.log('[VOSK] Client connected');
  
  ws.send(JSON.stringify({ type: 'ready', model: 'mock-model' }));

  ws.on('message', (message) => {
    try {
      if (typeof message === 'string') {
        const data = JSON.parse(message);
        
        if (data.type === 'config') {
          ws.send(JSON.stringify({ type: 'ready' }));
        } else if (data.type === 'reset') {
          ws.send(JSON.stringify({ type: 'reset' }));
        }
        return;
      }

      if (message.length > 0) {
        setTimeout(() => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
              type: 'result',
              text: '',
              confidence: 0.0
            }));
          }
        }, 100);
      }
    } catch (error) {
      console.error('[VOSK] Error:', error.message);
      ws.send(JSON.stringify({ type: 'error', error: error.message }));
    }
  });

  ws.on('close', () => {
    console.log('[VOSK] Client disconnected');
  });
});

server.listen(HTTP_PORT, () => {
  console.log(`[VOSK] KELEDON STT Server running on port ${HTTP_PORT}`);
  console.log(`[VOSK] WebSocket: ws://localhost:${WS_PORT}`);
});

process.on('SIGTERM', () => {
  console.log('[VOSK] Shutting down...');
  server.close(() => process.exit(0));
});
