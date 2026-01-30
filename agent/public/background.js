// Copied from src/background.js — Chrome-ready
importScripts('content.js');

let currentSessionId = '';
let sttAdapter = null;
let ttsAdapter = null;
let rpaExecutor = null;

self.addEventListener('install', (event) => {
  console.log('[Agent] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Agent] Activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;
  const client = event.source;

  try {
    switch (type) {
      case 'START_SESSION':
        currentSessionId = payload.session_id || Date.now().toString();
        client.postMessage({ type: 'SESSION_READY', payload: { session_id: currentSessionId } });
        break;

      case 'SEND_TO_CLOUD':
        console.log('[Cloud] Mock POST /brain/event', { session_id: currentSessionId, ...payload });
        client.postMessage({ type: 'CLOUD_ACK', payload: { received: true } });
        break;

      default:
        console.warn('[Agent] Unknown message:', type);
    }
  } catch (err) {
    client.postMessage({ type: 'ERROR', payload: { message: err.message } });
  }
});