#!/usr/bin/env python3
import os
import sys
import json
import asyncio
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
import threading

VOSK_PORT = int(os.getenv('VOSK_PORT', '9090'))
VOSK_WS_PORT = int(os.getenv('VOSK_WS_PORT', '9091'))
MODEL_PATH = os.getenv('VOSK_MODEL_PATH', '/app/models')
SAMPLE_RATE = int(os.getenv('VOSK_SAMPLE_RATE', '16000'))

print(f"[VOSK] Python VOSK server starting on port {VOSK_PORT}...", flush=True)

vosk = None
model = None
vosk_ready = False
model_path_exists = os.path.exists(MODEL_PATH)

print(f"[VOSK] Model path: {MODEL_PATH}", flush=True)
print(f"[VOSK] Model exists: {model_path_exists}", flush=True)

try:
    from vosk import Model, KaldiRecognizer, SetLogLevel
    SetLogLevel(-1)
    print("[VOSK] VOSK imported successfully", flush=True)
    
    if not model_path_exists:
        print("[VOSK] No model found, running in demo mode", flush=True)
        vosk_ready = False
    else:
        print(f"[VOSK] Loading model from {MODEL_PATH}...", flush=True)
        model = Model(MODEL_PATH)
        vosk_ready = True
        print("[VOSK] Model loaded successfully", flush=True)
except Exception as e:
    print(f"[VOSK] VOSK init error: {e}", flush=True)
    vosk_ready = False


class VOSKHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {
                'status': 'ready' if vosk_ready else 'demo',
                'model': MODEL_PATH,
                'modelLoaded': vosk_ready,
                'sampleRate': SAMPLE_RATE,
            }
            self.wfile.write(json.dumps(response).encode())
        elif self.path == '/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            response = {
                'state': 'READY' if vosk_ready else 'DEMO',
                'model': os.path.basename(MODEL_PATH),
                'samplerate': SAMPLE_RATE,
            }
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        if vosk_ready:
            self.wfile.write(json.dumps({'status': 'ready'}).encode())
        else:
            self.wfile.write(json.dumps({'status': 'demo'}).encode())


async def websocket_handler(websocket, path):
    client_id = id(websocket)
    print(f"[VOSK] WebSocket client {client_id} connected", flush=True)
    
    local_recognizer = None
    if vosk_ready and model:
        local_recognizer = KaldiRecognizer(model, SAMPLE_RATE)
    
    try:
        await websocket.send(json.dumps({
            'type': 'ready',
            'model': os.path.basename(MODEL_PATH) if vosk_ready else 'demo',
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
                        
    except Exception as e:
        print(f"[VOSK] WebSocket error: {e}", flush=True)


async def start_websocket_server():
    import websockets
    print(f"[VOSK] Starting WebSocket server on port {VOSK_WS_PORT}...", flush=True)
    async with websockets.server.serve(websocket_handler, '127.0.0.1', VOSK_WS_PORT):
        print(f"[VOSK] WebSocket server running on port {VOSK_WS_PORT}", flush=True)
        await asyncio.Future()


def start_http_server():
    server = HTTPServer(('127.0.0.1', VOSK_PORT), VOSKHandler)
    print(f"[VOSK] HTTP server running on port {VOSK_PORT}", flush=True)
    server.serve_forever()


if __name__ == '__main__':
    print("[VOSK] Starting servers...", flush=True)
    
    http_thread = threading.Thread(target=start_http_server, daemon=True)
    http_thread.start()
    
    try:
        asyncio.run(start_websocket_server())
    except KeyboardInterrupt:
        print("[VOSK] Shutting down...", flush=True)
