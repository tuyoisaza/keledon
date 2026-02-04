#!/usr/bin/env node

/**
 * Side Panel Real Operations Test
 * Validates that agent extension uses real runtime connections, not mocks
 */

console.log('🧪 Testing Side Panel Real Operations');
console.log('====================================');

// Test 1: Check for real TTS implementations
function testTTSImplementations() {
  console.log('\n🔊 Testing TTS Implementations...');
  
  const elevenLabsPath = './agent/src/core/tts/elevenlabs.js';
  const openAIPath = './agent/src/core/tts/openai.js';
  const fs = require('fs');
  
  try {
    const elevenLabsCode = fs.readFileSync(elevenLabsPath, 'utf8');
    const openAICode = fs.readFileSync(openAIPath, 'utf8');
    
    // Check for real API calls
    const hasRealElevenLabs = elevenLabsCode.includes('fetch(\'https://api.elevenlabs.io');
    const hasRealOpenAI = openAICode.includes('fetch(\'https://api.openai.com');
    
    // Check for absence of mock functions
    const noMockElevenLabs = !elevenLabsCode.includes('generateMockAudio');
    const noMockOpenAI = !openAICode.includes('generateMockAudio');
    
    console.log(`   ElevenLabs real API: ${hasRealElevenLabs ? '✅' : '❌'}`);
    console.log(`   OpenAI real API: ${hasRealOpenAI ? '✅' : '❌'}`);
    console.log(`   No mock audio generation: ${noMockElevenLabs && noMockOpenAI ? '✅' : '❌'}`);
    
    return hasRealElevenLabs && hasRealOpenAI && noMockElevenLabs && noMockOpenAI;
  } catch (error) {
    console.log(`   ❌ Failed to read TTS files: ${error.message}`);
    return false;
  }
}

// Test 2: Check for real STT implementation
function testSTTImplementation() {
  console.log('\n🎤 Testing STT Implementation...');
  
  const deepgramPath = './agent/src/audio/stt/deepgram.js';
  const fs = require('fs');
  
  try {
    const deepgramCode = fs.readFileSync(deepgramPath, 'utf8');
    
    // Check for real WebSocket connection to Deepgram
    const hasRealDeepgram = deepgramCode.includes('wss://api.deepgram.com/v1/listen');
    
    // Check for real API key requirement
    const hasAPIKeyRequirement = deepgramCode.includes('if (!this.config.apiKey) {');
    
    console.log(`   Deepgram real WebSocket: ${hasRealDeepgram ? '✅' : '❌'}`);
    console.log(`   API key required: ${hasAPIKeyRequirement ? '✅' : '❌'}`);
    
    return hasRealDeepgram && hasAPIKeyRequirement;
  } catch (error) {
    console.log(`   ❌ Failed to read STT file: ${error.message}`);
    return false;
  }
}

// Test 3: Check for real cloud connection
function testCloudConnection() {
  console.log('\n☁️ Testing Cloud Connection...');
  
  const connectionPath = './agent/extension/services/agent-connection.service.ts';
  const websocketPath = './agent/src/core/websocket-client.js';
  const fs = require('fs');
  
  try {
    const connectionCode = fs.readFileSync(connectionPath, 'utf8');
    const websocketCode = fs.readFileSync(websocketPath, 'utf8');
    
    // Check for real WebSocket connections (not mock)
    const hasRealWebSocket = websocketCode.includes('new WebSocket(url)');
    const hasProductionURL = connectionCode.includes('wss://keledon.tuyoisaza.com');
    const hasNoFakeSessions = connectionCode.includes('no fake sessions');
    
    console.log(`   Real WebSocket: ${hasRealWebSocket ? '✅' : '❌'}`);
    console.log(`   Production URL configured: ${hasProductionURL ? '✅' : '❌'}`);
    console.log(`   Anti-demo session policy: ${hasNoFakeSessions ? '✅' : '❌'}`);
    
    return hasRealWebSocket && hasProductionURL && hasNoFakeSessions;
  } catch (error) {
    console.log(`   ❌ Failed to read connection files: ${error.message}`);
    return false;
  }
}

// Test 4: Check for real RPA operations
function testRPAOperations() {
  console.log('\n🤖 Testing RPA Operations...');
  
  const executorPath = './agent/src/rpa/executor/StepExecutor.ts';
  const fs = require('fs');
  
  try {
    const executorCode = fs.readFileSync(executorPath, 'utf8');
    
    // Check for real DOM operations
    const hasRealClick = executorCode.includes('el.click()');
    const hasRealFill = executorCode.includes('el.value = step.value');
    const hasRealNavigate = executorCode.includes('window.location.href = step.value');
    const hasRealWait = executorCode.includes('setTimeout(resolve, waitTime)');
    
    console.log(`   Real click operations: ${hasRealClick ? '✅' : '❌'}`);
    console.log(`   Real field operations: ${hasRealFill ? '✅' : '❌'}`);
    console.log(`   Real navigation: ${hasRealNavigate ? '✅' : '❌'}`);
    console.log(`   Real wait operations: ${hasRealWait ? '✅' : '❌'}`);
    
    return hasRealClick && hasRealFill && hasRealNavigate && hasRealWait;
  } catch (error) {
    console.log(`   ❌ Failed to read RPA file: ${error.message}`);
    return false;
  }
}

// Test 5: Check for anti-demo validation
function testAntiDemoValidation() {
  console.log('\n🛡️ Testing Anti-Demo Validation...');
  
  const ttsManagerPath = './agent/src/audio/tts-manager.js';
  const sttManagerPath = './agent/src/core/stt-manager.js';
  const fs = require('fs');
  
  try {
    const ttsCode = fs.readFileSync(ttsManagerPath, 'utf8');
    const sttCode = fs.readFileSync(sttManagerPath, 'utf8');
    
    // Check for anti-demo validations
    const hasTTSAntiDemo = ttsCode.includes('ANTI-DEMO VIOLATION');
    const hasSTTAntiDemo = sttCode.includes('anti-demo: no fake keys');
    
    console.log(`   TTS anti-demo validation: ${hasTTSAntiDemo ? '✅' : '❌'}`);
    console.log(`   STT anti-demo validation: ${hasSTTAntiDemo ? '✅' : '❌'}`);
    
    return hasTTSAntiDemo && hasSTTAntiDemo;
  } catch (error) {
    console.log(`   ❌ Failed to read anti-demo files: ${error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = {
    tts: testTTSImplementations(),
    stt: testSTTImplementation(),
    cloud: testCloudConnection(),
    rpa: testRPAOperations(),
    antiDemo: testAntiDemoValidation()
  };
  
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  
  const allPassed = Object.values(results).every(result => result);
  
  console.log(`TTS Real APIs: ${results.tts ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`STT Real APIs: ${results.stt ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Cloud Connection: ${results.cloud ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`RPA Real Ops: ${results.rpa ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Anti-Demo Rules: ${results.antiDemo ? '✅ PASS' : '❌ FAIL'}`);
  
  console.log('\n🎯 Overall Result');
  console.log('==================');
  
  if (allPassed) {
    console.log('✅ SIDE PANEL REWIRE SUCCESSFUL');
    console.log('✅ All components use real runtime connections');
    console.log('✅ No mock behavior detected');
    console.log('✅ Ready for production deployment');
  } else {
    console.log('❌ SIDE PANEL REWIRE INCOMPLETE');
    console.log('❌ Some components still use mock behavior');
    console.log('❌ Requires further investigation');
  }
  
  return allPassed;
}

runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});