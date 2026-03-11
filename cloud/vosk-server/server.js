const fs = require('fs');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const express = require('express');
const cors = require('cors');

const PORT = process.env.PORT || 9090;
const MODEL_PATH = process.env.VOSK_MODEL_PATH || path.join(__dirname, '../models/vosk-model-small-en-us-0.15');
const SAMPLE_RATE = process.env.VOSK_SAMPLE_RATE || 16000;

let vosk;
let model;
let recognizer;

console.log('[VOSK] Starting KELEDON VOSK Server...');
console.log('[VOSK] Model path:', MODEL_PATH);

// Initialize VOSK
function initVOSK() {
  try {
    vosk = require('vosk');
    vosk.setLogLevel(0);
    
    if (!fs.existsSync(MODEL_PATH)) {
      throw new Error(`Model not found at: ${MODEL_PATH}`);
    }
    
    model = new vosk.Model(MODEL_PATH);
    console.log('[VOSK] Model loaded successfully');
    
    recognizer = new vosk.Recognizer({
      model: model,
      sampleRate: SAMPLE_RATE
    });
    console.log('[VOSK] Recognizer created');
    
    return true;
  } catch (error) {
    console.error('[VOSK] Failed to initialize:', error.message);
    return false;
  }
}

// Initialize on startup
const voskReady = initVOSK();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: voskReady ? 'ready' : 'error',
    model: MODEL_PATH,
    sampleRate: SAMPLE_RATE,
    timestamp: new Date().toISOString()
  });
});

// WebSocket for streaming audio
const wss = new WebSocketServer({ port: PORT + 1 });

console.log(`[VOSK] WebSocket server on port ${PORT + 1}`);

wss.on('connection', (ws) => {
  console.log('[VOSK] Client connected');
  
  let recognizer = null;
  
  if (voskReady && model) {
    recognizer = new vosk.Recognizer({
      model: model,
      sampleRate: SAMPLE_RATE
    });
  }
  
  ws.on('message', (message) => {
    try {
      // Handle string messages (commands)
      if (typeof message === 'string') {
        const data = JSON.parse(message);
        
        if (data.type === 'config') {
          // Client sending configuration
          ws.send(JSON.stringify({ type: 'ready' }));
        } else if (data.type === 'reset') {
          if (recognizer) {
            recognizer.reset();
          }
          ws.send(JSON.stringify({ type: 'reset' }));
        }
        return;
      }
      
      // Handle binary audio data
      if (voskReady && recognizer && message.length > 0) {
        const result = recognizer.acceptWaveform(message);
        
        if (result) {
          const transcript = recognizer.result();
          if (transcript.text) {
            ws.send(JSON.stringify({
              type: 'result',
              text: transcript.text,
              confidence: transcript.confidence || 1.0
            }));
          }
        }
      }
    } catch (error) {
      console.error('[VOSK] Error processing audio:', error.message);
      ws.send(JSON.stringify({ type: 'error', error: error.message }));
    }
  });
  
  ws.on('close', () => {
    console.log('[VOSK] Client disconnected');
    if (recognizer) {
      recognizer.free();
    }
  });
  
  ws.on('error', (error) => {
    console.error('[VOSK] WebSocket error:', error.message);
  });
  
  // Send ready message
  ws.send(JSON.stringify({ 
    type: 'ready', 
    sampleRate: SAMPLE_RATE,
    model: path.basename(MODEL_PATH)
  }));
});

// HTTP endpoint for single audio chunks
app.post('/transcribe', (req, res) => {
  if (!voskReady || !recognizer) {
    return res.status(503).json({ error: 'VOSK not ready' });
  }
  
  try {
    const audioBuffer = req.body.audio;
    if (!audioBuffer) {
      return res.status(400).json({ error: 'No audio provided' });
    }
    
    // Convert base64 to buffer if needed
    let audioData;
    if (typeof audioBuffer === 'string') {
      const base64Data = audioBuffer.replace(/^data:audio\/\w+;base64,/, '');
      audioData = Buffer.from(base64Data, 'base64');
    } else {
      audioData = Buffer.from(audioBuffer);
    }
    
    const result = recognizer.acceptWaveform(audioData);
    
    if (result) {
      res.json(recognizer.result());
    } else {
      res.json(recognizer.partialResult());
    }
  } catch (error) {
    console.error('[VOSK] Transcription error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Final result
app.post('/finalize', (req, res) => {
  if (!voskReady || !recognizer) {
    return res.status(503).json({ error: 'VOSK not ready' });
  }
  
  try {
    res.json(recognizer.finalResult());
    recognizer.reset();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`[VOSK] KELEDON VOSK Server running on port ${PORT}`);
  console.log(`[VOSK] WebSocket: ws://localhost:${PORT + 1}`);
  console.log(`[VOSK] HTTP: http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('[VOSK] Shutting down...');
  if (recognizer) recognizer.free();
  if (model) model.free();
  server.close(() => process.exit(0));
});
