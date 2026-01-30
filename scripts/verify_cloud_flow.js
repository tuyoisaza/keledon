const io = require('socket.io-client');

const URL = 'http://localhost:3001';
const AGENT_SOCKET = io(URL);

console.log('--- STARTING V1 CLOUD FLOW VERIFICATION ---');

// Agent is both the voice source and RPA executor in V1
AGENT_SOCKET.on('connect', () => {
    console.log('[AGENT] Connected');
    AGENT_SOCKET.emit('register-extension');
});

AGENT_SOCKET.on('registered', (data) => {
    console.log('[AGENT] Registered as Extension');

    // Now trigger the intent from the same socket (simulating voice)
    setTimeout(() => {
        console.log('[AGENT] Sending trigger-intent: "Start the test flow"');
        AGENT_SOCKET.emit('trigger-intent', { intent: 'Start the test flow' });
    }, 500);
});

AGENT_SOCKET.on('EXECUTE_FLOW', (data) => {
    console.log('[AGENT] RECEIVED EXECUTE_FLOW EVENT!');
    console.log('Payload:', JSON.stringify(data, null, 2));

    if (data.flow_id === 'test_harness_flow') {
        console.log('--- TEST PASSED: Correct Flow ID received ---');
        process.exit(0);
    } else {
        console.error('--- TEST FAILED: Incorrect Flow ID ---');
        process.exit(1);
    }
});

// Timeout Safety
setTimeout(() => {
    console.error('--- TEST TIMEOUT: No EXECUTE_FLOW received in 10s ---');
    process.exit(1);
}, 10000);
