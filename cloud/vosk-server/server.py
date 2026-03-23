#!/usr/bin/env python3
import os
import sys
import json
import asyncio
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
import threading

print("[VOSK] Python VOSK server starting...", flush=True)

VOSK_PORT = int(os.getenv('VOSK_PORT', '9090'))
VOSK_WS_PORT = int(os.getenv('VOSK_WS_PORT', '9091'))
MODEL_PATH = os.getenv('VOSK_MODEL_PATH', '/app/models/vosk-model-small-en-us-0.15')
SAMPLE_RATE = int(os.getenv('VOSK_SAMPLE_RATE', '16000'))

logging.basicConfig(level=logging.INFO, format='[VOSK] %(message)s')
logger = logging.getLogger(__name__)

vosk = None
model = None
recognizer = None
vosk_ready = False

try:
    from vosk import Model, KaldiRecognizer, SetLogLevel
    SetLogLevel(0)
    
    print(f"[VOSK] VOSK package imported successfully", flush=True)
    
    if not os.path.exists(MODEL_PATH):
        print(f"[VOSK] Model not found at {MODEL_PATH}, using demo mode", flush=True)
        vosk_ready = False
    else:
        print(f"[VOSK] Loading VOSK model from {MODEL_PATH}...", flush=True)
        model = Model(MODEL_PATH)
        recognizer = KaldiRecognizer(model, SAMPLE_RATE)
        vosk_ready = True
        print("[VOSK] VOSK model loaded successfully", flush=True)
except ImportError as e:
    print(f"[VOSK] VOSK Python package not installed: {e}", flush=True)
    vosk_ready = False
except Exception as e:
    print(f"[VOSK] Failed to load VOSK: {e}", flush=True)
    vosk_ready = False


class VOSKRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        parsed = urlparse(self.path)
        
        if parsed.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            status = 'ready' if vosk_ready else 'demo'
            response = {
                'status': status,
                'model': MODEL_PATH,
                'sampleRate': SAMPLE_RATE,
                'timestamp': __import__('datetime').datetime.now().isoformat()
            }
            self.wfile.write(json.dumps(response).encode())
            
        elif parsed.path == '/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {
                'state': 'READY' if vosk_ready else 'DEMO',
                'model': os.path.basename(MODEL_PATH),
                'samplerate': SAMPLE_RATE
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        parsed = urlparse(self.path)
        
        if parsed.path == '/transcribe' and vosk_ready:
            try:
                data = json.loads(body)
                audio = data.get('audio', '')
                
                if isinstance(audio, str):
                    import base64
                    audio = base64.b64decode(audio)
                
                if recognizer.AcceptWaveform(audio):
                    result = json.loads(recognizer.Result())
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps(result).encode())
                else:
                    result = json.loads(recognizer.PartialResult())
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps(result).encode())
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()


async def handle_websocket(websocket, path):
    client_id = id(websocket)
    logger.info(f"Client {client_id} connected")
    
    local_recognizer = None
    if vosk_ready and model:
        local_recognizer = KaldiRecognizer(model, SAMPLE_RATE)
    
    try:
        await websocket.send(json.dumps({
            'type': 'ready',
            'model': os.path.basename(MODEL_PATH) if vosk_ready else 'demo-model',
            'sampleRate': SAMPLE_RATE
        }))
        
        async for message in websocket:
            if isinstance(message, str):
                data = json.loads(message)
                msg_type = data.get('type', '')
                
                if msg_type == 'config':
                    await websocket.send(json.dumps({'type': 'ready'}))
                elif msg_type == 'reset':
                    if local_recognizer:
                        local_recognizer.Reset()
                    await websocket.send(json.dumps({'type': 'reset'}))
                    
            elif isinstance(message, bytes) and len(message) > 0:
                if vosk_ready and local_recognizer:
                    if local_recognizer.AcceptWaveform(message):
                        result = json.loads(local_recognizer.Result())
                        await websocket.send(json.dumps({
                            'type': 'result',
                            'text': result.get('text', ''),
                            'confidence': 1.0
                        }))
                else:
                    await asyncio.sleep(0.1)
                    
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        logger.info(f"Client {client_id} disconnected")


async def websocket_server():
    import websockets
    async with websockets.server.serve(lambda ws, path: handle_websocket(ws, path), '127.0.0.1', VOSK_WS_PORT):
        logger.info(f"WebSocket server started on port {VOSK_WS_PORT}")
        await asyncio.Future()


def run_http():
    server = HTTPServer(('127.0.0.1', VOSK_PORT), VOSKRequestHandler)
    logger.info(f"HTTP server started on port {VOSK_PORT}")
    server.serve_forever()


if __name__ == '__main__':
    logger.info(f"KELEDON VOSK Server starting...")
    logger.info(f"HTTP Port: {VOSK_PORT}")
    logger.info(f"WebSocket Port: {VOSK_WS_PORT}")
    logger.info(f"Model Path: {MODEL_PATH}")
    logger.info(f"VOSK Ready: {vosk_ready}")
    
    ws_thread = threading.Thread(target=run_http, daemon=True)
    ws_thread.start()
    
    try:
        asyncio.run(websocket_server())
    except KeyboardInterrupt:
        logger.info("Shutting down...")
