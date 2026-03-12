console.log('[TEST] Simple test script running...');
console.log('[TEST] Node version:', process.version);
console.log('[TEST] Current dir:', process.cwd());

try {
  require('./dist/main');
} catch (e) {
  console.error('[TEST] Error loading main:', e.message);
}
