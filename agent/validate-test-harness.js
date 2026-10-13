// Validate that the standalone harness and its split assets remain in sync.
const fs = require('fs');
const path = require('path');

const root = __dirname;
const assets = {
    html: path.join(root, 'test-harness.html'),
    config: path.join(root, 'config.js'),
    css: path.join(root, 'test-harness.css'),
    core: path.join(root, 'test-harness-core.js'),
    services: path.join(root, 'test-harness-services.js')
};
let failed = false;

console.log('🧪 Validating KELEDON Test Harness Build...\n');

for (const [name, file] of Object.entries(assets)) {
    const exists = fs.existsSync(file);
    console.log(`${exists ? '✅' : '❌'} ${name} asset exists`);
    failed ||= !exists;
}

if (!failed) {
    const html = fs.readFileSync(assets.html, 'utf8');
    const source = ['core', 'services'].map(name => fs.readFileSync(assets[name], 'utf8')).join('\n');
    const style = fs.readFileSync(assets.css, 'utf8');
    const requiredReferences = [
        ['configuration script', /src=["']config\.js["']/],
        ['stylesheet', /href=["']test-harness\.css["']/],
        ['core script', /src=["']test-harness-core\.js["']/],
        ['services script', /src=["']test-harness-services\.js["']/]
    ];
    const requiredFeatures = [
        ['Configuration test', /function\s+testConfig\s*\(/],
        ['Button interaction test', /function\s+testButtons\s*\(/],
        ['Form interaction test', /function\s+testForms\s*\(/],
        ['RAG API test', /function\s+testRAGAPI\s*\(/],
        ['WebSocket test', /function\s+testWebSocket\s*\(/],
        ['Backend API test', /function\s+testBackendAPI\s*\(/],
        ['Real services test', /function\s+testRealServices\s*\(/],
        ['System monitoring test', /function\s+testSystemMonitoring\s*\(/],
        ['Log copy function', /function\s+copyLog\s*\(/],
        ['WAV helper', /function\s+createWavBlob\s*\(/]
    ];

    console.log('\n🔗 Asset references:');
    for (const [name, pattern] of requiredReferences) {
        const present = pattern.test(html);
        console.log(`${present ? '✅' : '❌'} ${name}`);
        failed ||= !present;
    }

    console.log('\n🔍 Harness features:');
    for (const [name, pattern] of requiredFeatures) {
        const present = pattern.test(source);
        console.log(`${present ? '✅' : '❌'} ${name}`);
        failed ||= !present;
    }

    const invokedHandlers = [...html.matchAll(/onclick=["']\s*([A-Za-z_$][\w$]*)\s*\(/g)].map(match => match[1]);
    const missingHandlers = [...new Set(invokedHandlers)].filter(name =>
        !new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`).test(source)
    );
    console.log(`${missingHandlers.length === 0 ? '✅' : '❌'} Inline handlers resolve to harness functions`);
    if (missingHandlers.length > 0) {
        console.log(`   Missing: ${missingHandlers.join(', ')}`);
        failed = true;
    }

    const stylesPresent = ['.log-level-info', '.log-level-error', '.copy-btn'].every(selector => style.includes(selector));
    console.log(`${stylesPresent ? '✅' : '❌'} Logging and copy styles`);
    failed ||= !stylesPresent;
}

console.log(failed ? '\n❌ Test harness validation failed.' : '\n✅ Test harness assets are synchronized.');
process.exitCode = failed ? 1 : 0;
