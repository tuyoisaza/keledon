const assert = require('node:assert/strict');
const test = require('node:test');
const { EventLogger } = require('../dist/media/event-logger.js');

test('event logger measures a timer once and ignores unknown timer IDs', () => {
  const logger = new EventLogger();
  const entries = [];
  logger.on('entry', (entry) => entries.push(entry));

  const originalNow = Date.now;
  try {
    Date.now = () => 1000;
    const timerId = logger.startTimer('media', 'capture');
    Date.now = () => 1025;
    logger.endTimer(timerId, 'media', 'capture');
    logger.endTimer(timerId, 'media', 'capture');
    logger.endTimer('unknown', 'media', 'capture');
  } finally {
    Date.now = originalNow;
  }

  assert.equal(entries.length, 1);
  assert.equal(entries[0].category, 'media');
  assert.equal(entries[0].event, 'capture_complete');
  assert.equal(entries[0].data.durationMs, 25);
});
