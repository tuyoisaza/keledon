const assert = require('node:assert/strict');
const Module = require('node:module');
const test = require('node:test');

const load = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'electron') return { app: { isPackaged: false } };
  return load.call(this, request, parent, isMain);
};
const { closeCall, startCall, startTranscriptListener, stopTranscriptListener } = require('../dist/call-handler.js');
const { mediaLayer } = require('../dist/media/media-layer.js');
Module._load = load;

test('call transcript listener forwards active-call events once and unsubscribes on stop', () => {
  const received = [];
  const startMedia = mediaLayer.startCall;
  mediaLayer.startCall = async () => {};
  try {
    startCall('synthetic-session');
    startTranscriptListener((text, isFinal) => received.push({ text, isFinal }));

    mediaLayer.emit('transcript', 'synthetic transcript', true);
    stopTranscriptListener();
    mediaLayer.emit('transcript', 'after stop', true);
    closeCall('test complete');
  } finally {
    mediaLayer.startCall = startMedia;
  }

  assert.deepEqual(received, [{ text: 'synthetic transcript', isFinal: true }]);
});
