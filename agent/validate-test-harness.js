// Quick validation script for the enhanced test harness
const fs = require('fs');

console.log('🧪 Validating KELEDON Test Harness Build...\n');

// Check if test harness exists
const testHarnessPath = './test-harness.html';
if (fs.existsSync(testHarnessPath)) {
    console.log('✅ Test harness file exists');
    
    const content = fs.readFileSync(testHarnessPath, 'utf8');
    
    // Check for key features
    const features = [
        { name: 'Backend Readiness Test', pattern: /testBackendReadiness/ },
        { name: 'TTS Testing', pattern: /tts.*qwen3-tts/ },
        { name: 'STT Testing', pattern: /stt.*whisper/ },
        { name: 'RPA Testing', pattern: /rpa.*playwright/ },
        { name: 'RAG Testing', pattern: /rag.*retrieve/ },
        { name: 'WebSocket Testing', pattern: /WebSocket/ },
        { name: 'Copy Log Function', pattern: /copyLog/ },
        { name: 'Enhanced Logging', pattern: /log-level-/ },
        { name: 'WAV Helper', pattern: /createWavBlob/ }
    ];
    
    console.log('\n🔍 Feature Validation:');
    features.forEach(feature => {
        if (content.match(feature.pattern)) {
            console.log(`✅ ${feature.name}`);
        } else {
            console.log(`❌ ${feature.name}`);
        }
    });
    
    // Check config files
    console.log('\n📁 Configuration Files:');
    const configFiles = [
        './.env',
        './.env.example',
        './src/config/config.js',
        './extension/config/config.js'
    ];
    
    configFiles.forEach(file => {
        if (fs.existsSync(file)) {
            console.log(`✅ ${file}`);
        } else {
            console.log(`❌ ${file}`);
        }
    });
    
    console.log('\n🎯 Test Harness Ready!');
    console.log('Open: file://' + require('path').resolve(testHarnessPath));
    
} else {
    console.log('❌ Test harness not found');
}